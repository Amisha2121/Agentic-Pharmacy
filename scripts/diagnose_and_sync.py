"""
diagnose_and_sync.py
====================
Run this to:
  1. Confirm Firebase is connected (LIVE, not MOCK mode)
  2. Find your UID for amishavanditha@gmail.com
  3. Show ALL data that exists in Firestore right now
  4. Copy/migrate everything into your user-scoped path

Usage:
    python diagnose_and_sync.py
"""

import os, sys, json
import firebase_admin
from firebase_admin import credentials, firestore, auth as fb_auth
from dotenv import load_dotenv

load_dotenv()

TARGET_EMAIL = "amishavanditha@gmail.com"
COLLECTIONS = ["batches", "daily_sales_log", "archived_sales_log", "chat_sessions", "quarantine"]

SECTION = "=" * 65

# ── Step 1: Firebase init ──────────────────────────────────────────────────────
def init_firebase():
    for app in list(firebase_admin._apps.values()):
        firebase_admin.delete_app(app)

    # Try all possible credential locations in priority order
    candidates = [
        os.getenv("FIREBASE_CREDENTIALS_PATH", ""),
        "firebase_key.json",
        "agentic-pharmacy-firebase-adminsdk-fbsvc-fbe3add8aa.json",
    ]
    cred = None
    used_path = None
    for path in candidates:
        if path and os.path.exists(path):
            cred = credentials.Certificate(path)
            used_path = path
            break

    json_str = os.getenv("FIREBASE_CREDENTIALS_JSON", "")
    if json_str and not cred:
        cred = credentials.Certificate(json.loads(json_str))
        used_path = "FIREBASE_CREDENTIALS_JSON env var"

    if not cred:
        print("❌  No Firebase credentials found!")
        print("    Tried:", candidates)
        sys.exit(1)

    firebase_admin.initialize_app(cred)
    db = firestore.client()
    print(f"✅  Firebase connected using: {used_path}")
    return db


# ── Step 2: Print ALL data in Firestore ───────────────────────────────────────
def audit_firestore(db):
    print(f"\n{SECTION}")
    print("  FIRESTORE AUDIT — what data currently exists")
    print(SECTION)

    grand_total = 0

    # Top-level (legacy) collections
    print("\n── Top-level (legacy) collections ──")
    for col in COLLECTIONS:
        try:
            docs = list(db.collection(col).stream())
            count = len(docs)
            grand_total += count
            status = f"{count} doc(s)" if count else "(empty)"
            print(f"   {col:<25} → {status}")
            if count:
                for doc in docs[:3]:
                    d = doc.to_dict()
                    name = d.get("product_name") or d.get("title") or doc.id
                    print(f"      • [{doc.id[:12]}...] {name}")
                if count > 3:
                    print(f"      … and {count - 3} more")
        except Exception as e:
            print(f"   {col:<25} → ERROR: {e}")

    # users/* sub-collections
    print("\n── users/* sub-collections ──")
    try:
        user_docs = list(db.collection("users").list_documents())
        if not user_docs:
            print("   (no user documents found)")
        for user_ref in user_docs:
            uid = user_ref.id
            print(f"\n   users/{uid}/")
            for col in COLLECTIONS:
                try:
                    docs = list(db.collection(f"users/{uid}/{col}").stream())
                    count = len(docs)
                    grand_total += count
                    status = f"{count} doc(s)" if count else "(empty)"
                    print(f"      {col:<25} → {status}")
                    if count:
                        for doc in docs[:2]:
                            d = doc.to_dict()
                            name = d.get("product_name") or d.get("title") or doc.id
                            print(f"         • [{doc.id[:12]}...] {name}")
                        if count > 2:
                            print(f"         … and {count - 2} more")
                except Exception as e:
                    print(f"      {col:<25} → ERROR: {e}")
    except Exception as e:
        print(f"   Could not list users: {e}")

    print(f"\n   TOTAL documents found across all paths: {grand_total}")
    return grand_total


# ── Step 3: Resolve target UID ─────────────────────────────────────────────────
def get_target_uid(email: str) -> str | None:
    print(f"\n{SECTION}")
    print(f"  LOOKING UP UID FOR: {email}")
    print(SECTION)
    try:
        record = fb_auth.get_user_by_email(email)
        print(f"  ✅  Found Firebase Auth user:")
        print(f"      UID:            {record.uid}")
        print(f"      Display name:   {record.display_name or '(not set)'}")
        print(f"      Email verified: {record.email_verified}")
        print(f"      Providers:      {[p.provider_id for p in record.provider_data]}")
        return record.uid
    except fb_auth.UserNotFoundError:
        print(f"  ❌  No Firebase Auth account found for: {email}")
        print()
        print("  The user must sign in to the app at least ONCE before we can sync.")
        print("  → Start the frontend (npm run dev) and log in with that email.")
        print("  → Then re-run this script.")
        return None
    except Exception as e:
        print(f"  ❌  Error: {e}")
        return None


# ── Step 4: Copy docs ──────────────────────────────────────────────────────────
def copy_collection(db, src_path: str, dst_path: str) -> tuple[int, int]:
    """Returns (copied, skipped)."""
    copied = skipped = 0
    try:
        docs = list(db.collection(src_path).stream())
    except Exception as e:
        print(f"      ⚠️  Could not read {src_path}: {e}")
        return 0, 0

    if not docs:
        return 0, 0

    dst_col = db.collection(dst_path)
    for doc in docs:
        dst_ref = dst_col.document(doc.id)
        try:
            existing = dst_ref.get()
            if existing.exists:
                skipped += 1
                continue
        except Exception:
            pass
        try:
            dst_ref.set(doc.to_dict())
            copied += 1
            d = doc.to_dict()
            name = d.get("product_name") or d.get("title") or doc.id
            print(f"      ✅ copied: {name[:40]}")
        except Exception as e:
            print(f"      ❌ failed to copy {doc.id}: {e}")

    return copied, skipped


def sync_to_user(db, target_uid: str) -> int:
    print(f"\n{SECTION}")
    print(f"  SYNCING DATA → users/{target_uid}")
    print(SECTION)

    total_copied = 0
    target_base = f"users/{target_uid}"

    # Migrate from top-level legacy collections
    print("\n  From: top-level (legacy) collections")
    for col in COLLECTIONS:
        dst = f"{target_base}/{col}"
        copied, skipped = copy_collection(db, col, dst)
        if copied or skipped:
            print(f"   {col}: {copied} copied, {skipped} skipped (already existed)")
        else:
            print(f"   {col}: (empty — nothing to migrate)")
        total_copied += copied

    # Migrate from other user paths
    try:
        user_docs = list(db.collection("users").list_documents())
        other_uids = [d.id for d in user_docs if d.id != target_uid]
        if other_uids:
            for uid in other_uids:
                print(f"\n  From: users/{uid}")
                for col in COLLECTIONS:
                    src = f"users/{uid}/{col}"
                    dst = f"{target_base}/{col}"
                    copied, skipped = copy_collection(db, src, dst)
                    if copied or skipped:
                        print(f"   {col}: {copied} copied, {skipped} skipped")
                    total_copied += copied
    except Exception as e:
        print(f"  Could not list other user paths: {e}")

    return total_copied


# ── Step 5: Seed demo data if Firestore is completely empty ────────────────────
def seed_demo_data(db, target_uid: str):
    import datetime
    print(f"\n{SECTION}")
    print("  SEEDING DEMO DATA (Firestore was empty)")
    print(SECTION)

    col_path = f"users/{target_uid}/batches"
    col = db.collection(col_path)
    now = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")

    demo_items = [
        {"product_name": "Paracetamol 500mg", "batch_number": "PC-2024-001", "expiry_date": "2026-12-31", "category": "Analgesic", "Number": 150, "logged_at": now},
        {"product_name": "Amoxicillin 250mg", "batch_number": "AM-2024-002", "expiry_date": "2026-06-30", "category": "Antibiotic", "Number": 80, "logged_at": now},
        {"product_name": "Ibuprofen 400mg",   "batch_number": "IB-2024-003", "expiry_date": "2027-03-15", "category": "NSAID",      "Number": 200, "logged_at": now},
        {"product_name": "Metformin 500mg",   "batch_number": "MF-2024-004", "expiry_date": "2026-09-01", "category": "Diabetes",   "Number": 5,   "logged_at": now},
        {"product_name": "Atorvastatin 10mg", "batch_number": "AT-2024-005", "expiry_date": "2025-03-01", "category": "Cardiac",    "Number": 60,  "logged_at": now},
    ]

    for item in demo_items:
        _, ref = col.add(item)
        print(f"   ✅ seeded: {item['product_name']} (batch {item['batch_number']})")

    print(f"\n   Added {len(demo_items)} demo inventory items to {col_path}")


# ── Main ───────────────────────────────────────────────────────────────────────
def main():
    print(f"\n{SECTION}")
    print("  AGENTIC PHARMACY — FIRESTORE DIAGNOSTIC & SYNC")
    print(SECTION)

    db = init_firebase()

    # Audit everything
    total_docs = audit_firestore(db)

    # Resolve target UID
    target_uid = get_target_uid(TARGET_EMAIL)
    if not target_uid:
        print(f"\n{SECTION}")
        print("  CANNOT SYNC — user not found in Firebase Auth")
        print(SECTION)
        print("\n  NEXT STEPS:")
        print("  1. Start the frontend:  cd frontend && npm run dev")
        print(f"  2. Open http://localhost:5173 and sign in as {TARGET_EMAIL}")
        print("  3. Re-run this script: python diagnose_and_sync.py")
        sys.exit(1)

    # Check if target already has data
    target_base = f"users/{target_uid}"
    already_has = 0
    for col in COLLECTIONS:
        try:
            docs = list(db.collection(f"{target_base}/{col}").stream())
            already_has += len(docs)
        except Exception:
            pass

    print(f"\n  Your user path ({target_base}) currently has {already_has} doc(s).")

    if total_docs == 0 and already_has == 0:
        print("\n  Firestore is completely empty — seeding demo data for you...")
        seed_demo_data(db, target_uid)
    else:
        # Sync
        copied = sync_to_user(db, target_uid)

        print(f"\n{SECTION}")
        if copied == 0 and already_has > 0:
            print(f"  ✅  Your account already has {already_has} document(s) — nothing to migrate.")
        elif copied == 0:
            print("  ℹ️  No new documents were copied.")
            print()
            print("  POSSIBLE REASONS:")
            print("  • The backend was running in MOCK MODE when you added data")
            print("    (check api.py console — it should say 'Firebase initialized')")
            print("  • Data was saved to a DIFFERENT Firebase project")
            print()
            print("  WHAT TO DO:")
            print("  1. Ensure api.py says '[OK] Firebase initialized successfully -- LIVE mode.'")
            print("  2. Add inventory via the chat: 'Add Paracetamol 500mg, qty 100, expiry Dec 2026'")
            print("  3. It will now save directly under your user account.")
        else:
            print(f"  ✅  Done! Copied {copied} document(s) into {target_base}")
        print(SECTION)


if __name__ == "__main__":
    main()
