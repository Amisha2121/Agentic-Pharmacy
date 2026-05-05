"""
sync_to_user.py
───────────────
Syncs all Firestore data to the user account: amishavanditha@gmail.com

What it does:
  1. Looks up the Firebase Auth UID for amishavanditha@gmail.com
  2. Scans all known collections (batches, daily_sales_log, chat_sessions,
     archived_sales_log, quarantine) at both the top-level ("legacy") path
     AND any other user paths that exist.
  3. Copies every document into  users/<target_uid>/<collection>
     (skips docs that already exist under that path to avoid duplicates).
  4. Prints a summary at the end.

Run from the project root:
    python sync_to_user.py
"""

import os, sys, json
import firebase_admin
from firebase_admin import credentials, firestore, auth as fb_auth
from dotenv import load_dotenv

load_dotenv()

TARGET_EMAIL = "amishavanditha@gmail.com"

COLLECTIONS = [
    "batches",
    "daily_sales_log",
    "archived_sales_log",
    "chat_sessions",
    "quarantine",
]

# ── Initialize Firebase ────────────────────────────────────────────────────────

def init_firebase():
    # Clear stale apps
    for app in list(firebase_admin._apps.values()):
        firebase_admin.delete_app(app)

    cred_path = os.getenv(
        "FIREBASE_CREDENTIALS_PATH",
        os.path.join(os.path.dirname(os.path.abspath(__file__)), "firebase_key.json"),
    )
    json_str = os.getenv("FIREBASE_CREDENTIALS_JSON", "")

    if json_str:
        cred = credentials.Certificate(json.loads(json_str))
        print("Firebase: using FIREBASE_CREDENTIALS_JSON env var")
    elif os.path.exists(cred_path):
        cred = credentials.Certificate(cred_path)
        print(f"Firebase: using key file → {cred_path}")
    else:
        # Try the bundled admin-sdk file
        bundled = os.path.join(
            os.path.dirname(os.path.abspath(__file__)),
            "agentic-pharmacy-firebase-adminsdk-fbsvc-fbe3add8aa.json",
        )
        if os.path.exists(bundled):
            cred = credentials.Certificate(bundled)
            print(f"Firebase: using bundled key → {bundled}")
        else:
            sys.exit("❌  No Firebase credentials found. Cannot continue.")

    firebase_admin.initialize_app(cred)
    return firestore.client()


# ── Helpers ───────────────────────────────────────────────────────────────────

def copy_collection(db, src_path: str, dst_path: str, dry_run=False) -> int:
    """Copy all docs from src_path into dst_path. Returns number copied."""
    src_col = db.collection(src_path)
    dst_col = db.collection(dst_path)
    count = 0

    try:
        docs = list(src_col.stream())
    except Exception as e:
        print(f"   ⚠️  Could not read {src_path}: {e}")
        return 0

    if not docs:
        print(f"   (empty)  {src_path}")
        return 0

    for doc in docs:
        dst_ref = dst_col.document(doc.id)
        # Check if already exists at destination
        try:
            existing = dst_ref.get()
            if existing.exists:
                print(f"   ⏭  skip  {dst_path}/{doc.id}  (already exists)")
                continue
        except Exception:
            pass  # if check fails, just proceed with write

        data = doc.to_dict()
        if not dry_run:
            dst_ref.set(data)
        print(f"   ✅ copy  {src_path}/{doc.id}  →  {dst_path}/{doc.id}")
        count += 1

    return count


def discover_existing_user_ids(db) -> list[str]:
    """Look for any existing user sub-collections under 'users/'."""
    try:
        user_docs = list(db.collection("users").list_documents())
        ids = [d.id for d in user_docs]
        print(f"\nFound existing user paths under 'users/': {ids or '(none)'}")
        return ids
    except Exception as e:
        print(f"Could not list users collection: {e}")
        return []


# ── Main ──────────────────────────────────────────────────────────────────────

def main():
    print("=" * 60)
    print(f"  Sync Firestore → {TARGET_EMAIL}")
    print("=" * 60)

    db = init_firebase()

    # 1. Resolve target UID
    print(f"\n① Looking up Firebase Auth UID for {TARGET_EMAIL} …")
    try:
        user_record = fb_auth.get_user_by_email(TARGET_EMAIL)
        target_uid = user_record.uid
        print(f"   UID = {target_uid}")
        print(f"   Display name: {user_record.display_name}")
        print(f"   Email verified: {user_record.email_verified}")
    except fb_auth.UserNotFoundError:
        print(f"\n❌  No Firebase Auth account found for {TARGET_EMAIL}")
        print("   The user must have logged in at least once via the app before we can sync.")
        print("   Please log in to the app with that email first, then re-run this script.")
        sys.exit(1)
    except Exception as e:
        print(f"❌  Error looking up user: {e}")
        sys.exit(1)

    target_base = f"users/{target_uid}"
    print(f"\n   Target Firestore path: {target_base}/<collection>")

    # 2. Discover existing user paths (other UIDs)
    existing_uids = discover_existing_user_ids(db)

    # 3. Build list of source paths to migrate FROM
    source_paths = []

    # Always include legacy top-level collections
    for col in COLLECTIONS:
        source_paths.append(("legacy (top-level)", col))

    # Also include any other user paths that aren't the target
    for uid in existing_uids:
        if uid != target_uid:
            for col in COLLECTIONS:
                source_paths.append((f"users/{uid}", f"users/{uid}/{col}"))

    # 4. Copy everything
    total_copied = 0
    print(f"\n② Copying collections to {target_base} …\n")

    # --- Legacy top-level collections ---
    print("── Legacy (top-level) collections ──")
    for col in COLLECTIONS:
        dst = f"{target_base}/{col}"
        print(f"\n  {col}  →  {dst}")
        n = copy_collection(db, col, dst)
        total_copied += n

    # --- Other existing user paths ---
    for uid in existing_uids:
        if uid == target_uid:
            continue
        print(f"\n── Migrating from users/{uid} ──")
        for col in COLLECTIONS:
            src = f"users/{uid}/{col}"
            dst = f"{target_base}/{col}"
            print(f"\n  {src}  →  {dst}")
            n = copy_collection(db, src, dst)
            total_copied += n

    # 5. Summary
    print("\n" + "=" * 60)
    if total_copied == 0:
        print("✅  Nothing to migrate — destination already up to date,")
        print("    or all source collections are empty.")
        print()
        print("💡  If you expected data to be here, check that:")
        print(f"    • You have previously logged into the app and added inventory")
        print(f"    • The backend was in LIVE mode (not MOCK mode) at the time")
    else:
        print(f"✅  Done!  Copied {total_copied} document(s) into {target_base}")
    print("=" * 60)


if __name__ == "__main__":
    main()
