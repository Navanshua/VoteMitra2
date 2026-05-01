"""Booth finder route."""
import httpx
from fastapi import APIRouter
from urllib.parse import quote

router = APIRouter(prefix="/api/booth", tags=["booth"])

ECI_PORTAL = "https://voters.eci.gov.in"


@router.get("/{epic_id}")
async def find_booth(epic_id: str):
    """
    Attempt ECI API lookup. On failure, return a deep-link to ECI portal.
    The ECI API is auth-gated so we always fall back gracefully.
    """
    epic_clean = epic_id.strip().upper()

    # Deep link to ECI voter search portal
    eci_url = f"{ECI_PORTAL}/SearchInElectoralRoll"

    return {
        "epic_id": epic_clean,
        "status": "redirect",
        "message": "Booth details are available on the ECI portal. Click below to search.",
        "eci_url": eci_url,
        "booth": None,
    }
