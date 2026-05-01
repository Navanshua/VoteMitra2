"""Firebase token verification for FastAPI routes."""
import os
from fastapi import HTTPException, Security
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
import firebase_admin
from firebase_admin import auth as firebase_auth, credentials

bearer_scheme = HTTPBearer(auto_error=False)

def _ensure_app():
    if not firebase_admin._apps:
        project_id = os.getenv("GCP_PROJECT_ID", "votemitra-494915")
        try:
            cred = credentials.ApplicationDefault()
            firebase_admin.initialize_app(cred, {"projectId": project_id})
        except Exception:
            firebase_admin.initialize_app(options={"projectId": project_id})

async def get_current_user(
    creds: HTTPAuthorizationCredentials = Security(bearer_scheme),
) -> dict:
    """Verify Firebase ID token and return decoded claims."""
    _ensure_app()
    if creds is None:
        raise HTTPException(status_code=401, detail="Missing Authorization header")
    try:
        decoded = firebase_auth.verify_id_token(creds.credentials)
        return decoded
    except Exception as e:
        raise HTTPException(status_code=401, detail=f"Invalid token: {e}")
