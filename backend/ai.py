"""Vertex AI / Gemini wrapper for VoterMitra using google-genai SDK."""
import os
import json
import re
from google import genai
from google.genai import types

_client = None


def _get_client() -> genai.Client:
    global _client
    if _client is None:
        api_key = os.getenv("GEMINI_API_KEY", "")
        if api_key:
            _client = genai.Client(api_key=api_key)
        else:
            # Fallback to Vertex AI via Application Default Credentials
            project = os.getenv("GCP_PROJECT_ID", "votemitra-494915")
            location = os.getenv("VERTEX_AI_LOCATION", "asia-south1")
            _client = genai.Client(vertexai=True, project=project, location=location)
    return _client


MODEL = os.getenv("GEMINI_MODEL", "gemini-1.5-flash")


async def summarize_with_gemini(text: str, max_words: int = 60) -> str:
    """Return a ≤max_words summary of the given text."""
    client = _get_client()
    prompt = (
        f"Summarize the following news text in exactly {max_words} words or fewer. "
        "Make the first sentence bold by wrapping it in **double asterisks**. "
        "Be factual and neutral. No emojis.\n\n"
        f"{text[:3000]}"
    )
    try:
        resp = client.models.generate_content(
            model=MODEL,
            contents=prompt,
        )
        return resp.text.strip()
    except Exception:
        words = text.split()[:max_words]
        return " ".join(words)


async def classify_news_category(text: str) -> str:
    """Classify news as rally | deadline | candidate | result."""
    client = _get_client()
    prompt = (
        "Classify the following election news snippet into exactly ONE of these categories: "
        "rally, deadline, candidate, result. "
        "Reply with ONLY the single lowercase word.\n\n"
        f"{text[:500]}"
    )
    try:
        resp = client.models.generate_content(model=MODEL, contents=prompt)
        cat = resp.text.strip().lower()
        return cat if cat in ("rally", "deadline", "candidate", "result") else "result"
    except Exception:
        return "result"


async def chat_with_mitra(message: str, history: list, language: str = "en") -> dict:
    """Conversational Mitra assistant. Returns {reply, action?, pincode?}."""
    client = _get_client()

    lang_instruction = f" You MUST reply in this language code: {language}." if language != "en" else ""

    system_instruction = (
        "You are Mitra, VoterMitra's friendly Indian civic assistant. "
        "Help users with voter registration, polling booths, candidate info, election dates, "
        "documents required, voting processes, and eligibility. "
        f"Be warm, concise, and helpful.{lang_instruction} "
        "When the user provides a 6-digit pincode, respond ONLY with valid JSON: "
        '{"action": "personalize", "pincode": "XXXXXX", "reply": "Great! Let me find your constituency..."} '
        "For all other messages respond with JSON: "
        '{"reply": "your response here"}'
    )

    # Build conversation history
    chat_history = []
    for turn in history[-10:]:
        role = "user" if turn.get("role") == "user" else "model"
        chat_history.append(
            types.Content(role=role, parts=[types.Part(text=turn.get("content", ""))])
        )

    try:
        chat = client.chats.create(
            model=MODEL,
            config=types.GenerateContentConfig(system_instruction=system_instruction),
            history=chat_history,
        )
        resp = chat.send_message(message)
        raw = resp.text.strip()

        json_match = re.search(r'\{.*\}', raw, re.DOTALL)
        if json_match:
            try:
                return json.loads(json_match.group())
            except json.JSONDecodeError:
                pass
        return {"reply": raw}
    except Exception as e:
        return {"reply": f"Namaste! I'm Mitra. I'm having a small issue right now. Please try again. ({e})"}
