import json
import firebase_admin
from firebase_admin import credentials, firestore
import os
from dotenv import load_dotenv

load_dotenv()

print("--- Firebase Debug Script ---")

try:
    cred_path = os.getenv("FIREBASE_CREDENTIALS_PATH", "firebase_key.json")
    print(f"Loading credentials from: {cred_path}")
    
    with open(cred_path, 'r') as f:
        key_data = json.load(f)
        print(f"Project ID in JSON: {key_data.get('project_id')}")
        print(f"Client Email: {key_data.get('client_email')}")
        # Check if private key has actual newlines or escaped \n
        if "\\n" in key_data.get("private_key", ""):
            print("Warning: Private key contains literal \\n strings. Standard json.load handles this, but let's be sure.")
        else:
            print("Private key appears to have actual newlines.")

    cred = credentials.Certificate(cred_path)
    firebase_admin.initialize_app(cred)
    db = firestore.client()
    
    print("Attempting to reach Firestore (listing collections)...")
    # Set a timeout if possible, though firestore.client doesn't have a simple global timeout
    collections = db.collections()
    # collections is an iterator, let's try to get one item
    col_ids = [c.id for c in collections]
    print(f"Success! Collections found: {col_ids}")

except Exception as e:
    print(f"\n(!) Firebase Error: {e}")
    import traceback
    traceback.print_exc()

print("\n--- End of Script ---")
