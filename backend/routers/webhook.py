"""Dialogflow CX webhook fulfillment handler."""
from fastapi import APIRouter, Request
from database import get_db
import httpx

router = APIRouter(prefix="/api/dialogflow-webhook", tags=["dialogflow"])


@router.post("")
async def dialogflow_webhook(request: Request):
    """Handle Dialogflow CX intent fulfillment."""
    body = await request.json()

    # Extract intent tag
    tag = body.get("fulfillmentInfo", {}).get("tag", "")
    session_info = body.get("sessionInfo", {})
    parameters = session_info.get("parameters", {})

    reply_text = "Namaste! How can I help you today?"

    if tag == "collect.pincode":
        pincode = parameters.get("pincode", "")
        if pincode:
            try:
                async with httpx.AsyncClient(timeout=10.0) as client:
                    resp = await client.get(
                        f"https://api.postalpincode.in/pincode/{pincode}"
                    )
                    data = resp.json()
                if data and data[0].get("Status") == "Success":
                    po = data[0]["PostOffice"][0]
                    district = po.get("District", "")
                    state = po.get("State", "")
                    reply_text = (
                        f"Great! I found your location: {district}, {state}. "
                        "Your personalized dashboard is ready!"
                    )
                else:
                    reply_text = "I couldn't find that pincode. Please try again."
            except Exception:
                reply_text = "Sorry, I couldn't look up that pincode right now."

    elif tag == "voter.registration":
        reply_text = (
            "To register as a new voter, you need to fill Form 6. "
            "Documents needed: Proof of Age (Aadhaar/Birth Certificate), "
            "Proof of Residence, Passport photo. "
            "Apply at: https://voters.eci.gov.in"
        )

    elif tag == "address.change":
        reply_text = (
            "To update your address, fill Form 8. "
            "Documents: New address proof, existing voter ID. "
            "Apply at: https://voters.eci.gov.in"
        )

    elif tag == "find.booth":
        reply_text = (
            "To find your polling booth, visit: "
            "https://voters.eci.gov.in/SearchInElectoralRoll "
            "and enter your EPIC voter ID."
        )

    return {
        "fulfillmentResponse": {
            "messages": [{"text": {"text": [reply_text]}}]
        }
    }
