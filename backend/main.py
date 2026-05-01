"""VoterMitra FastAPI backend entrypoint."""
import os
import asyncio
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pathlib import Path
from dotenv import load_dotenv

# Load .env from the project root (one folder up from backend/)
_env_path = Path(__file__).resolve().parent.parent / ".env"
load_dotenv(_env_path)

from routers import voter, news, candidates, translate, chat, webhook, voter_booth


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup: kick off background news refresh task."""
    # Run initial refresh in background (non-blocking)
    asyncio.create_task(_initial_refresh())
    yield


async def _initial_refresh():
    """Refresh news for all districts 10s after startup."""
    await asyncio.sleep(10)
    try:
        from scraper import refresh_all_districts
        await refresh_all_districts()
    except Exception as e:
        print(f"[Startup refresh] {e}")


app = FastAPI(
    title="VoterMitra API",
    description="Hyper-local Indian civic tech platform for the 2026 election cycle",
    version="1.0.0",
    lifespan=lifespan,
)

# CORS — allow frontend origins
origins = [
    "http://localhost:3000",
    "http://localhost:5173",
    os.getenv("FRONTEND_URL", ""),
]
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # tighten in production via env var
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount routers
app.include_router(voter.router)
app.include_router(news.router)
app.include_router(candidates.router)
app.include_router(translate.router)
app.include_router(chat.router)
app.include_router(webhook.router)
app.include_router(voter_booth.router)


@app.get("/health")
async def health():
    return {"status": "ok", "service": "VoterMitra API"}


@app.get("/")
async def root():
    return {"message": "VoterMitra API — /docs for Swagger UI"}
