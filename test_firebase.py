import firebase_admin
from firebase_admin import credentials, firestore
import os
import json

def test_connection():
    try:
        cred = credentials.Certificate("firebase_key.json")
        firebase_admin.initialize_app(cred)
        db = firestore.client()
        print("Successfully connected to Firestore!")
        
        # Try a simple read
        collections = db.collections()
        print("Available collections:")
        for coll in collections:
            print(f" - {coll.id}")
            
    except Exception as e:
        print(f"Connection failed: {e}")

if __name__ == "__main__":
    test_connection()
