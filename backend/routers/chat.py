"""Chat route for Mitra assistant."""
from fastapi import APIRouter, Depends
from pydantic import BaseModel
from auth import get_current_user
from ai import chat_with_mitra

router = APIRouter(prefix="/api/chat", tags=["chat"])


class ChatBody(BaseModel):
    message: str
    history: list = []
    language: str = "en"


@router.post("")
async def chat(body: ChatBody, user=Depends(get_current_user)):
    """Send a message to Mitra and get a response."""
    result = await chat_with_mitra(body.message, body.history, body.language)
    return result
