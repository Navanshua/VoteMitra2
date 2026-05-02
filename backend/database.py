"""Firestore client singleton."""
import os
import firebase_admin
from firebase_admin import credentials, firestore

_db = None

def get_db():
    global _db
    if _db is None:
        project_id = os.getenv("GCP_PROJECT_ID", "votemitra-494915")
        db_name = os.getenv("FIRESTORE_DB_NAME", "votemitra-db")

        if not firebase_admin._apps:
            try:
                cred = credentials.ApplicationDefault()
                firebase_admin.initialize_app(cred, {"projectId": project_id})
            except Exception:
                firebase_admin.initialize_app(options={"projectId": project_id})

        # Use the named database. firestore.client(database=...) is supported
        # in firebase-admin >= 6.0; falls back to default if unavailable.
        try:
            _db = firestore.client(database=db_name)
        except TypeError:
            # Older firebase-admin: database_id or database kwarg not supported.
            # Fall back to the default database — user must rename it or upgrade.
            import warnings
            warnings.warn(
                f"firebase-admin does not support named databases. "
                f"Falling back to (default). Upgrade firebase-admin>=6.0 to use '{db_name}'.",
                stacklevel=2,
            )
            _db = firestore.client()
    return _db
