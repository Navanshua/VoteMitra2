"""Translation route using Google Cloud Translation API v2."""
import os
import httpx
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

router = APIRouter(prefix="/api/translate", tags=["translate"])

TRANSLATE_API = "https://translation.googleapis.com/language/translate/v2"


class TranslateBody(BaseModel):
    texts: list[str]
    target_lang: str  # e.g. "hi", "ta", "te", "bn", "mr", "gu", "kn"


@router.post("")
async def translate_texts(body: TranslateBody):
    """Translate a list of strings using Cloud Translation API v2."""
    # Use the backend GCP API key (not the VITE_ frontend key)
    api_key = os.getenv("GCP_API_KEY", os.getenv("VITE_GCP_API_KEY", ""))
    if not api_key:
        raise HTTPException(status_code=500, detail="GCP_API_KEY not configured")

    # Filter out empty strings to avoid API errors
    non_empty = [(i, t) for i, t in enumerate(body.texts) if t and t.strip()]
    if not non_empty:
        return {"translations": body.texts}  # nothing to translate

    texts_to_translate = [t for _, t in non_empty]

    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            resp = await client.post(
                TRANSLATE_API,
                params={"key": api_key},
                json={
                    "q": texts_to_translate,
                    "target": body.target_lang,
                    "format": "text",
                },
            )
            if resp.status_code != 200:
                detail = resp.text[:500]
                print(f"[Translate] Google API error {resp.status_code}: {detail}")
                raise HTTPException(
                    status_code=502,
                    detail=f"Translation API returned {resp.status_code}",
                )
            data = resp.json()
    except HTTPException:
        raise
    except Exception as e:
        print(f"[Translate] Connection error: {e}")
        raise HTTPException(status_code=502, detail=f"Translation API error: {e}")

    translated = [
        t.get("translatedText", "")
        for t in data.get("data", {}).get("translations", [])
    ]

    # Rebuild the full results list, keeping empty strings in place
    result = list(body.texts)
    for idx, (orig_i, _) in enumerate(non_empty):
        if idx < len(translated):
            result[orig_i] = translated[idx]

    return {"translations": result}
