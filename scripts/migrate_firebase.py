# migrate_firebase.py
# Copies all Firestore data from the OLD Firebase project (pharmaai-8bb36)
# to the NEW project (novamed-f8129).
#
# Run from the project root:
#   cd C:/Users/AMISHA/Desktop/Codes/Agentic-Pharmacy-master
#   python scripts/migrate_firebase.py

import sys, os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import firebase_admin
from firebase_admin import credentials, firestore

# ─── OLD project credentials ──────────────────────────────────────────────────
# Update this path to wherever your OLD pharmaai-8bb36 key file is
OLD_KEY = os.path.join(os.path.dirname(__file__), "../credentials/agentic-pharmacy-firebase-adminsdk-fbsvc-fbe3add8aa.json")

# ─── NEW project credentials ──────────────────────────────────────────────────
NEW_KEY = os.path.join(os.path.dirname(__file__), "../credentials/novamed-f8129-firebase-adminsdk.json")

# Collections to migrate (top-level and under users/)
TOP_LEVEL_COLLECTIONS = ["batches", "sales_log", "archived_sales_log"]
USER_SUBCOLLECTIONS   = ["batches", "sales_log", "archived_sales_log"]

def init_app(name, key_path):
    if not os.path.exists(key_path):
        print(f"[ERROR] Key file not found: {key_path}")
        sys.exit(1)
    return firebase_admin.initialize_app(credentials.Certificate(key_path), name=name)

def migrate_collection(src_db, dst_db, collection_path: str):
    """Copy all docs from src collection to dst collection."""
    src_ref = src_db.collection(collection_path)
    docs = list(src_ref.stream())
    if not docs:
        print(f"  [SKIP] {collection_path} — empty")
        return 0

    dst_ref = dst_db.collection(collection_path)
    count = 0
    for doc in docs:
        data = doc.to_dict()
        dst_ref.document(doc.id).set(data)
        count += 1
    print(f"  [OK]   {collection_path} — {count} docs copied")
    return count

def main():
    print("Initializing OLD project (pharmaai-8bb36)...")
    old_app = init_app("old", OLD_KEY)
    old_db  = firestore.client(app=old_app)

    print("Initializing NEW project (novamed-f8129)...")
    new_app = init_app("new", NEW_KEY)
    new_db  = firestore.client(app=new_app)

    total = 0
    print("\n── Top-level collections ──────────────────────────────────────────────")
    for col in TOP_LEVEL_COLLECTIONS:
        total += migrate_collection(old_db, new_db, col)

    print("\n── User sub-collections ───────────────────────────────────────────────")
    users_ref = old_db.collection("users")
    for user_doc in users_ref.stream():
        uid = user_doc.id
        print(f"\n  User: {uid}")
        for col in USER_SUBCOLLECTIONS:
            path = f"users/{uid}/{col}"
            total += migrate_collection(old_db, new_db, path)

    print(f"\nDone. {total} total documents migrated.")

if __name__ == "__main__":
    main()
