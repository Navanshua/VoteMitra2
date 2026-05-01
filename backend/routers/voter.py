"""Voter lookup and profile routes."""
import httpx
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from database import get_db
from auth import get_current_user

router = APIRouter(prefix="/api/voter", tags=["voter"])


class ProfileBody(BaseModel):
    pincode: str
    district: str
    state: str
    block: str
    ac_name: str
    language: str = "en"


@router.get("/lookup")
async def lookup_pincode(pincode: str):
    """Lookup district/state/constituency from India Post pincode API with fallback to zippopotam.us."""
    if not pincode.isdigit() or len(pincode) != 6:
        raise HTTPException(status_code=400, detail="Invalid pincode. Must be 6 digits.")

    # Try India Post API first
    try:
        async with httpx.AsyncClient(timeout=10.0, follow_redirects=True) as client:
            resp = await client.get(
                f"https://api.postalpincode.in/pincode/{pincode}",
                headers={"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)"}
            )
            resp.raise_for_status()
            data = resp.json()
            
            if data and data[0].get("Status") == "Success" and data[0].get("PostOffice"):
                po = data[0]["PostOffice"][0]
                district = po.get("District", "")
                state = po.get("State", "")
                block = po.get("Block", po.get("Taluk", ""))
                ac_name = block if block and block.strip() else district
                return {
                    "pincode": pincode,
                    "district": district,
                    "state": state,
                    "block": block,
                    "ac_name": ac_name,
                }
    except Exception:
        pass  # Silently fall back to secondary API

    # Fallback to Zippopotam.us API
    try:
        async with httpx.AsyncClient(timeout=10.0, follow_redirects=True) as client:
            resp = await client.get(
                f"https://api.zippopotam.us/in/{pincode}",
                headers={"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)"}
            )
            resp.raise_for_status()
            data = resp.json()
            
            if data and data.get("places"):
                place = data["places"][0]
                state = place.get("state", "")
                district = place.get("place name", "") # Best approximation
                block = place.get("place name", "")
                ac_name = district
                return {
                    "pincode": pincode,
                    "district": district,
                    "state": state,
                    "block": block,
                    "ac_name": ac_name,
                }
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Pincode lookup APIs failed. Error: {e}")

    raise HTTPException(status_code=404, detail="Pincode not found.")


@router.post("/save-profile")
async def save_profile(body: ProfileBody, user=Depends(get_current_user)):
    """Save voter profile to Firestore."""
    uid = user["uid"]
    db = get_db()
    db.collection("users").document(uid).set(body.model_dump(), merge=True)
    return {"status": "saved", "uid": uid}


@router.get("/profile")
async def get_profile(user=Depends(get_current_user)):
    """Fetch current user's profile from Firestore."""
    uid = user["uid"]
    db = get_db()
    doc = db.collection("users").document(uid).get()
    if not doc.exists:
        return {"profile": None}
    return {"profile": doc.to_dict()}
