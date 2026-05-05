"""
Debug Firebase auth — run directly in the project root:
    python debug_auth.py
"""
import json, os, datetime

print("=== System Time ===")
print("Local time :", datetime.datetime.now())
print("UTC time   :", datetime.datetime.utcnow())

print("\n=== Key File Check ===")
key_path = "firebase_key.json"
if os.path.exists(key_path):
    with open(key_path) as f:
        key = json.load(f)
    print(f"Key ID     : {key.get('private_key_id')}")
    print(f"Client     : {key.get('client_email')}")
    print(f"Project    : {key.get('project_id')}")
else:
    print("ERROR: firebase_key.json not found!")

print("\n=== Firebase Init Test ===")
try:
    import firebase_admin
    from firebase_admin import credentials, firestore

    # Clear any cached apps
    if firebase_admin._apps:
        firebase_admin.delete_app(firebase_admin.get_app())

    cred = credentials.Certificate(key_path)
    firebase_admin.initialize_app(cred)
    db = firestore.client()

    print("Fetching one document from 'batches'...")
    docs = list(db.collection("batches").limit(1).get(timeout=15))
    if docs:
        print(f"SUCCESS — got doc: {docs[0].to_dict()}")
    else:
        print("SUCCESS — collection is empty but connection works!")

except Exception as e:
    print(f"FAILED: {e}")
    if "invalid_grant" in str(e) or "JWT" in str(e):
        print()
        print("*** This is a clock skew or revoked key issue. ***")
        print("Fix: Sync your system clock.")
        print("  Windows: Settings > Time & Language > Sync now")
        print("  Or run:  w32tm /resync in an admin PowerShell")
