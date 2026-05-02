"""Firestore client singleton."""
import os
import firebase_admin
from firebase_admin import credentials
import google.cloud.firestore

_db = None

def get_db():
    global _db
    if _db is None:
        project_id = os.getenv("GCP_PROJECT_ID", "votemitra-494915")
        db_name = os.getenv("FIRESTORE_DB_NAME", "votemitra-db")

        # Ensure firebase_admin is initialized (needed for auth token verification)
        if not firebase_admin._apps:
            try:
                cred = credentials.ApplicationDefault()
                firebase_admin.initialize_app(cred, {"projectId": project_id})
            except Exception:
                firebase_admin.initialize_app(options={"projectId": project_id})

        # Use google.cloud.firestore.Client directly — this reliably supports
        # named databases via the `database` kwarg across all relevant versions,
        # unlike firebase_admin's firestore.client() wrapper which has
        # inconsistent named-DB support (database= vs database_id= differs by version).
        _db = google.cloud.firestore.Client(
            project=project_id,
            database=db_name,
        )
    return _db
