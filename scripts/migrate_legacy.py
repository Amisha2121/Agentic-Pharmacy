"""
migrate_legacy.py — Move all items from 'legacy' namespace into a real user's namespace.

Usage:
    python migrate_legacy.py YOUR_FIREBASE_UID

Find your UID in the Firebase Console → Authentication → Users tab.
"""
import sys, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from dotenv import load_dotenv
load_dotenv(override=True)

import database

if len(sys.argv) < 2:
    print("Usage: python migrate_legacy.py <firebase_uid>")
    print("\nFind your UID: Firebase Console → Authentication → Users")
    sys.exit(1)

target_uid = sys.argv[1].strip()
print(f"Migrating legacy → users/{target_uid}/...")

if database.MOCK_MODE:
    print("ERROR: Firebase not connected. Check your credentials.")
    sys.exit(1)

db = database.db
COLLECTION = database.COLLECTION

# ── Read from legacy ──────────────────────────────────────────────────────────
legacy_docs = list(db.collection(COLLECTION).stream())
print(f"Found {len(legacy_docs)} item(s) in legacy 'batches' collection")

if not legacy_docs:
    print("Nothing to migrate.")
    sys.exit(0)

# ── Write to user namespace ───────────────────────────────────────────────────
target_col = db.collection(f"users/{target_uid}/{COLLECTION}")
migrated = 0
skipped  = 0

for doc in legacy_docs:
    data = doc.to_dict()
    product_name = data.get("product_name", "Unknown")

    # Check if already exists in target (by batch_number)
    bn = data.get("batch_number", "")
    existing = list(target_col.where("batch_number", "==", bn).limit(1).stream())
    if existing:
        print(f"  [SKIP] {product_name} (batch {bn}) — already in target")
        skipped += 1
        continue

    target_col.add(data)
    print(f"  [OK]   {product_name} (batch {bn})")
    migrated += 1

print(f"\nDone — {migrated} migrated, {skipped} skipped (duplicates).")
print("Refresh your Live Inventory page.")
