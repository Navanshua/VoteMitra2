"""
Election Timeline Router

Design:
- ALL blocking calls (Firestore reads/writes, httpx, Gemini) are wrapped in
  asyncio.to_thread() so they never block uvicorn's event loop.
- The endpoint returns immediately: Firestore cache if fresh, else fallback.
- Gemini fetch + Firestore write runs in a FastAPI BackgroundTask (also threaded).
"""
import os
import json
import re
import asyncio
import logging
import threading
from datetime import datetime, timezone, timedelta

import httpx
from fastapi import APIRouter, BackgroundTasks
from fastapi.responses import JSONResponse

from database import get_db

logger = logging.getLogger("election_timeline")

router = APIRouter(prefix="/api/election", tags=["election"])

CACHE_TTL_HOURS = 24
GEMINI_API_KEY  = os.getenv("GEMINI_API_KEY", "")
GEMINI_MODEL    = "gemini-2.0-flash"
GEMINI_URL      = (
    f"https://generativelanguage.googleapis.com/v1beta/models/"
    f"{GEMINI_MODEL}:generateContent"
)

PHASE_COLORS = {
    "Pre-Election": "#4ECDC4",
    "Campaign":     "#FF6B9D",
    "Voting":       "#FF6B35",
    "Post-Election":"#4CD964",
}

FALLBACK_EVENTS = [
    {"id": "nomination", "icon": "📝", "label": "Nomination Filing",        "date": "Updating...", "isoDate": "", "description": "Candidates submit nomination papers to the Returning Officer.", "phase": "Pre-Election",  "highlight": False, "color": "#4ECDC4"},
    {"id": "scrutiny",   "icon": "🔍", "label": "Scrutiny of Nominations",  "date": "Updating...", "isoDate": "", "description": "Officials verify all nomination papers.",                     "phase": "Pre-Election",  "highlight": False, "color": "#4ECDC4"},
    {"id": "withdrawal", "icon": "↩️", "label": "Withdrawal Deadline",      "date": "Updating...", "isoDate": "", "description": "Last day for candidates to withdraw candidature.",             "phase": "Pre-Election",  "highlight": False, "color": "#4ECDC4"},
    {"id": "campaign",   "icon": "📢", "label": "Campaign Period",           "date": "Updating...", "isoDate": "", "description": "Rallies and public meetings allowed.",                        "phase": "Campaign",      "highlight": False, "color": "#FF6B9D"},
    {"id": "silence",    "icon": "🤫", "label": "Campaign Silence",          "date": "Updating...", "isoDate": "", "description": "No campaigning 48 hours before polling.",                    "phase": "Campaign",      "highlight": False, "color": "#FF6B9D"},
    {"id": "polling",    "icon": "🗳️", "label": "Polling Day",               "date": "Updating...", "isoDate": "", "description": "Cast your vote at your designated polling booth.",            "phase": "Voting",        "highlight": True,  "color": "#FF6B35"},
    {"id": "counting",   "icon": "🔢", "label": "Vote Counting",             "date": "Updating...", "isoDate": "", "description": "EVMs unsealed and votes counted.",                            "phase": "Post-Election", "highlight": False, "color": "#4CD964"},
    {"id": "result",     "icon": "🏆", "label": "Result Declaration",        "date": "Updating...", "isoDate": "", "description": "Winners declared and certificates issued.",                   "phase": "Post-Election", "highlight": True,  "color": "#4CD964"},
]

GEMINI_SYSTEM_PROMPT = (
    "You are a precise Indian election data assistant. "
    "The user gives you a state name and today's date (ISO-8601). "
    "Return ONLY a valid JSON array (no markdown, no code fences, no explanation) "
    "of election timeline events for the MOST RECENT OR UPCOMING state/general election "
    "in that state. "
    "Each element MUST have EXACTLY these keys: "
    "id (snake_case), icon (emoji), label (≤5 words), date (human-readable), "
    "isoDate (ISO-8601 start), description (≤20 words), "
    "phase (Pre-Election|Campaign|Voting|Post-Election), highlight (bool). "
    "Include 8 events: Nomination Filing, Scrutiny, Withdrawal Deadline, "
    "Campaign Period, Campaign Silence, Polling Day (highlight=true), "
    "Vote Counting, Result Declaration (highlight=true). "
    "Use officially announced ECI dates or best estimate. "
    "Return ONLY the JSON array starting with [ and ending with ]."
)


# ── Sync helpers (to be run via asyncio.to_thread) ───────────────────

def _firestore_read(state: str):
    """Synchronous Firestore read — called via to_thread."""
    db     = get_db()
    doc_id = state.lower().replace(" ", "_")
    ref    = db.collection("election_timelines").document(doc_id)
    doc    = ref.get()
    return doc, ref


def _firestore_write(ref, state: str, events: list):
    """Synchronous Firestore write — called via to_thread."""
    cached_at = datetime.now(timezone.utc).isoformat()
    ref.set({"state": state, "events": events, "cached_at": cached_at})
    return cached_at


def _gemini_rest_call(state: str) -> list[dict]:
    """Synchronous httpx POST to Gemini REST API — called via to_thread."""
    today  = datetime.now(timezone.utc).date().isoformat()
    prompt = f"State: {state}\nToday: {today}"

    payload = {
        "system_instruction": {"parts": [{"text": GEMINI_SYSTEM_PROMPT}]},
        "contents":           [{"parts": [{"text": prompt}]}],
        "generationConfig":   {"temperature": 0.2, "maxOutputTokens": 2048},
    }

    with httpx.Client(timeout=25.0) as client:
        resp = client.post(
            GEMINI_URL,
            params={"key": GEMINI_API_KEY},
            json=payload,
            headers={"Content-Type": "application/json"},
        )
        resp.raise_for_status()
        data = resp.json()

    raw = data["candidates"][0]["content"]["parts"][0]["text"].strip()
    raw = re.sub(r"```(?:json)?", "", raw).strip().rstrip("`").strip()

    events = json.loads(raw)
    for ev in events:
        ev["color"] = PHASE_COLORS.get(ev.get("phase", ""), "#8892B0")

    return events


# ── Background task ───────────────────────────────────────────────────

def _bg_refresh_sync(state: str) -> None:
    """Run in a thread: Gemini call + Firestore write."""
    try:
        _doc, ref = _firestore_read(state)
        events    = _gemini_rest_call(state)
        _firestore_write(ref, state, events)
        logger.info("Timeline refreshed for '%s' (%d events)", state, len(events))
    except Exception as e:
        logger.error("Background timeline refresh failed for '%s': %s", state, e)
        # On failure (like 429 rate limit), write fallback or existing data to cache 
        # to update `cached_at` and prevent the frontend from infinite rapid polling.
        try:
            _doc, ref = _firestore_read(state)
            old_events = FALLBACK_EVENTS
            if _doc and _doc.exists:
                old_events = _doc.to_dict().get("events", FALLBACK_EVENTS)
            _firestore_write(ref, state, old_events)
            logger.info("Updated cache with old/fallback data to prevent rapid retries.")
        except Exception as inner_e:
            logger.error("Failed to update cache on error fallback: %s", inner_e)


def _compute_active_index(events: list[dict]) -> int:
    today  = datetime.now(timezone.utc).date()
    active = 0
    for i, ev in enumerate(events):
        try:
            if today >= datetime.fromisoformat(ev.get("isoDate", "")).date():
                active = i
        except Exception:
            pass
    return active


# ── Route ─────────────────────────────────────────────────────────────

@router.get("/timeline")
async def get_election_timeline(
    state: str = "West Bengal",
    background_tasks: BackgroundTasks = None,
):
    """
    Returns election timeline. Responds instantly from Firestore cache or
    fallback. Gemini refresh runs in a background thread.
    """
    # Firestore read in a thread (non-blocking)
    try:
        doc, ref = await asyncio.to_thread(_firestore_read, state)
    except Exception as e:
        logger.warning("Firestore read failed: %s", e)
        doc = ref = None

    # ── Fresh cache? ──────────────────────────────────────────────
    if doc and doc.exists:
        cached = doc.to_dict()
        events = cached.get("events", [])
        for ev in events:
            ev.setdefault("color", PHASE_COLORS.get(ev.get("phase", ""), "#8892B0"))
        try:
            cached_at = datetime.fromisoformat(cached["cached_at"])
            age = datetime.now(timezone.utc) - cached_at
            if age < timedelta(hours=CACHE_TTL_HOURS):
                return JSONResponse({
                    "state":        state,
                    "events":       events,
                    "active_index": _compute_active_index(events),
                    "cached":       True,
                    "cached_at":    cached["cached_at"],
                })
            # Stale: serve old data + refresh in background
            background_tasks.add_task(
                asyncio.get_event_loop().run_in_executor, None,
                _bg_refresh_sync, state
            )
            return JSONResponse({
                "state":        state,
                "events":       events,
                "active_index": _compute_active_index(events),
                "cached":       True,
                "stale":        True,
                "cached_at":    cached.get("cached_at"),
            })
        except Exception:
            pass

    # ── No cache: return fallback + refresh in background ─────────
    background_tasks.add_task(
        asyncio.get_event_loop().run_in_executor, None,
        _bg_refresh_sync, state
    )
    return JSONResponse({
        "state":        state,
        "events":       FALLBACK_EVENTS,
        "active_index": 0,
        "cached":       False,
        "fetching":     True,
    })


@router.post("/timeline/invalidate")
async def invalidate_cache(state: str = "West Bengal"):
    """Force-invalidate the Firestore cache for a state."""
    try:
        doc, ref = await asyncio.to_thread(_firestore_read, state)
        await asyncio.to_thread(ref.delete)
    except Exception as e:
        return JSONResponse({"status": "error", "detail": str(e)}, status_code=500)
    return JSONResponse({"status": "cache_cleared", "state": state})
