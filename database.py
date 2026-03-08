import datetime
import os
from dotenv import load_dotenv
import firebase_admin
from firebase_admin import credentials, firestore

load_dotenv()

# Initialize Firebase app (only once)
if not firebase_admin._apps:
    cred_path = os.getenv("FIREBASE_CREDENTIALS_PATH", "firebase_key.json")
    cred = credentials.Certificate(cred_path)
    firebase_admin.initialize_app(cred)

db = firestore.client()
COLLECTION = "batches"

def init_db():
    """No-op: Firestore is schema-less, no table creation needed."""
    pass

def insert_batch(batch_number: str, expiry_date: str, product_name: str = "Unknown", category: str = "Unknown"):
    current_time = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    db.collection(COLLECTION).add({
        "batch_number": batch_number,
        "expiry_date": expiry_date,
        "product_name": product_name,
        "category": category,
        "logged_at": current_time,
    })

def update_product_name(batch_number: str, new_name: str) -> bool:
    docs = db.collection(COLLECTION).where("batch_number", "==", batch_number).stream()
    updated = False
    for doc in docs:
        doc.reference.update({"product_name": new_name})
        updated = True
    return updated

def insert_quarantine(batch_number: str, expiry_date: str, product_name: str = "Unknown", category: str = "Unknown"):
    """Write an expired item to the quarantine collection (human-approved)."""
    current_time = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    db.collection("quarantine").add({
        "batch_number": batch_number,
        "expiry_date": expiry_date,
        "product_name": product_name,
        "category": category,
        "logged_at": current_time,
        "reason": "EXPIRED",
    })

def get_inventory():
    """Returns a list of tuples: (batch_number, expiry_date, product_name, category, logged_at)"""
    docs = db.collection(COLLECTION).stream()
    results = []
    for doc in docs:
        d = doc.to_dict()
        results.append((
            d.get("batch_number", ""),
            d.get("expiry_date", ""),
            d.get("product_name", "Unknown"),
            d.get("category", "Unknown"),
            d.get("logged_at", ""),
        ))
    return results