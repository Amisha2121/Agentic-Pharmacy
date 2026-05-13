# migrate_firebase.py
# Copies ALL Firestore data from pharmaai-8bb36 → novamed-f8129,
# mapping any old user UIDs into the new project's user UID.
#
# Run from the project root:
#   python scripts/migrate_firebase.py

import sys, os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import firebase_admin
from firebase_admin import credentials, firestore

OLD_KEY = os.path.join(os.path.dirname(__file__), "../credentials/agentic-pharmacy-firebase-adminsdk-fbsvc-fbe3add8aa.json")
NEW_KEY = os.path.join(os.path.dirname(__file__), "../credentials/novamed-f8129-firebase-adminsdk.json")

# ── YOUR NEW UID (from the Firebase console screenshot) ───────────────────────
NEW_USER_ID = "po09TLnSrJdgvTTg8RpV4FjqytJ3"

SUBCOLLECTIONS = ["batches", "sales_log", "archived_sales_log", "chat_sessions", "inventory"]
TOP_LEVEL      = ["batches", "sales_log", "archived_sales_log"]

def copy_collection(src_col_ref, dst_col_ref, label=""):
    docs = list(src_col_ref.stream())
    if not docs:
        print(f"  [SKIP] {label} — empty")
        return 0
    count = 0
    for doc in docs:
        dst_col_ref.document(doc.id).set(doc.to_dict())
        count += 1
    print(f"  [OK]   {label} — {count} docs")
    return count

def main():
    print("Initializing OLD project (pharmaai-8bb36)...")
    old_app = firebase_admin.initialize_app(credentials.Certificate(OLD_KEY), name="old")
    old_db  = firestore.client(app=old_app)

    print("Initializing NEW project (novamed-f8129)...")
    new_app = firebase_admin.initialize_app(credentials.Certificate(NEW_KEY), name="new")
    new_db  = firestore.client(app=new_app)

    total = 0

    print("\n── Top-level collections (legacy/unauthenticated data) ───────────────")
    for col in TOP_LEVEL:
        total += copy_collection(
            old_db.collection(col),
            new_db.collection(col),
            label=col
        )

    print("\n── User sub-collections from OLD project → NEW user ──────────────────")
    old_users = list(old_db.collection("users").stream())

    if not old_users:
        print("  No user documents found in old project.")
        # Also try legacy — copy top-level batches into new user path too
        print("\n── Copying legacy top-level batches → new user path ─────────────────")
        for col in SUBCOLLECTIONS:
            total += copy_collection(
                old_db.collection(col),
                new_db.collection("users").document(NEW_USER_ID).collection(col),
                label=f"legacy → users/{NEW_USER_ID}/{col}"
            )
    else:
        for user_doc in old_users:
            old_uid = user_doc.id
            print(f"\n  Old UID: {old_uid} → New UID: {NEW_USER_ID}")
            for col in SUBCOLLECTIONS:
                total += copy_collection(
                    old_db.collection("users").document(old_uid).collection(col),
                    new_db.collection("users").document(NEW_USER_ID).collection(col),
                    label=f"users/{old_uid}/{col}"
                )

    print(f"\nDone. {total} total documents migrated.")

if __name__ == "__main__":
    main()
