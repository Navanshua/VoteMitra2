"""Firestore client singleton."""
import os
import firebase_admin
from firebase_admin import credentials, firestore

_db = None

def get_db():
    global _db
    if _db is None:
        if not firebase_admin._apps:
            # 1. Read project ID from environment
            project_id = os.getenv("GCP_PROJECT_ID")
            if not project_id:
                raise ValueError("GCP_PROJECT_ID environment variable is not set")
            try:
                cred = credentials.ApplicationDefault()
                firebase_admin.initialize_app(cred, {"projectId": project_id})
            except Exception:
                firebase_admin.initialize_app(options={"projectId": project_id})
        
        # 2. Specify the database name you created in the Firebase console
        db_name = os.getenv("FIRESTORE_DB_NAME", "votemitra-db")
        _db = firestore.client(database_id=db_name)
    return _db
