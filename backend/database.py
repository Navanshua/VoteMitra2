"""Firestore client singleton."""
import os
import firebase_admin
from firebase_admin import credentials, firestore

_db = None

def get_db():
    global _db
    if _db is None:
        if not firebase_admin._apps:
            # 1. Update the fallback to your actual project ID from the screenshot
            project_id = os.getenv("GCP_PROJECT_ID", "votemitra-494915") 
            try:
                cred = credentials.ApplicationDefault()
                firebase_admin.initialize_app(cred, {"projectId": project_id})
            except Exception:
                firebase_admin.initialize_app(options={"projectId": project_id})
        
        # 2. Specify the database name you created in the Firebase console
        _db = firestore.client(database_id="votemitra-db")
    return _db
