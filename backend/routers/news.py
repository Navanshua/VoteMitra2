"""News cache routes."""
from datetime import datetime, timezone, timedelta
from fastapi import APIRouter, BackgroundTasks
from database import get_db
from scraper import refresh_news_for_district, refresh_all_districts

router = APIRouter(prefix="/api/news", tags=["news"])

CACHE_TTL_HOURS = 6


@router.get("/{district}")
async def get_news(district: str, state: str = "", background_tasks: BackgroundTasks = None):
    """Return cached news for a district, refreshing if stale."""
    db = get_db()
    doc_id = district.lower().replace(" ", "_")
    cache_ref = db.collection("news_cache").document(doc_id)
    doc = cache_ref.get()

    if doc.exists:
        cached = doc.to_dict()
        cached_at_str = cached.get("cached_at", "")
        try:
            cached_at = datetime.fromisoformat(cached_at_str)
            if datetime.now(timezone.utc) - cached_at < timedelta(hours=CACHE_TTL_HOURS):
                return {"district": district, "summaries": cached.get("summaries", []), "cached": True}
        except Exception:
            pass

    # Cache miss or stale — refresh now
    summaries = await refresh_news_for_district(district, state)
    return {"district": district, "summaries": summaries, "cached": False}


@router.post("/refresh")
async def refresh_all(background_tasks: BackgroundTasks):
    """Cloud Scheduler endpoint: refresh all districts in background."""
    background_tasks.add_task(refresh_all_districts)
    return {"status": "refresh_started"}
