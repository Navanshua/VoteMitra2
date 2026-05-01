"""Candidate data from Lok Dhaba API."""
import httpx
from fastapi import APIRouter, HTTPException

router = APIRouter(prefix="/api/candidates", tags=["candidates"])

LOK_DHABA_BASE = "https://api.lokdhaba.ashoka.edu.in/api/v1/candidates"


def _format_assets(amount_str: str) -> str:
    """Convert raw asset string to ₹ Cr / ₹ L display."""
    try:
        amount = float(str(amount_str).replace(",", "").replace("₹", "").strip())
        if amount >= 1_00_00_000:
            return f"₹{amount/1_00_00_000:.2f} Cr"
        elif amount >= 1_00_000:
            return f"₹{amount/1_00_000:.2f} L"
        else:
            return f"₹{amount:,.0f}"
    except Exception:
        return str(amount_str)


@router.get("/{ac_name}")
async def get_candidates(ac_name: str, state: str = "", year: int = 2024):
    """Fetch candidates for an assembly constituency."""
    params = {"year": year}
    if state:
        params["state"] = state
    if ac_name:
        params["constituency"] = ac_name

    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            resp = await client.get(LOK_DHABA_BASE, params=params)
            if resp.status_code == 404 or resp.status_code == 204:
                return {"ac_name": ac_name, "candidates": [], "source": "lokdhaba"}
            resp.raise_for_status()
            raw = resp.json()
    except httpx.HTTPStatusError as e:
        # Graceful fallback
        return {"ac_name": ac_name, "candidates": [], "error": str(e), "source": "lokdhaba"}
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Lok Dhaba API error: {e}")

    candidates_raw = raw if isinstance(raw, list) else raw.get("candidates", raw.get("data", []))

    candidates = []
    for c in candidates_raw:
        total_assets_raw = c.get("total_assets", c.get("assets", 0))
        liabilities_raw = c.get("liabilities", 0)
        candidates.append({
            "name": c.get("candidate", c.get("name", "Unknown")),
            "party": c.get("party", c.get("party_abbreviation", "IND")),
            "education": c.get("education", "Not Disclosed"),
            "assets": _format_assets(total_assets_raw),
            "liabilities": _format_assets(liabilities_raw),
            "criminal_cases": int(c.get("criminal_cases", c.get("total_criminal_cases", 0)) or 0),
            "votes": int(c.get("votes", c.get("total_votes", 0)) or 0),
            "winner": bool(c.get("winner", False)),
        })

    # Sort by criminal_cases asc, then name
    candidates.sort(key=lambda x: (x["criminal_cases"], x["name"]))

    return {"ac_name": ac_name, "candidates": candidates, "source": "lokdhaba"}
