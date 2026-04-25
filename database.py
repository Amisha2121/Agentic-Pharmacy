# Firebase key updated: f527dc5103 — reload triggered
import datetime
import os
from dotenv import load_dotenv
import firebase_admin
from firebase_admin import credentials, firestore

load_dotenv()

_STOCK_FIELDS = ["Number", "stock", "Stock", "quantity", "Quantity", "qty"]

# Helper function to get user-scoped collection path
def _user_collection(user_id: str, collection_name: str) -> str:
    """Return a user-scoped collection path."""
    if not user_id or user_id == "legacy":
        # For legacy users or missing user_id, use global collections
        return collection_name
    return f"users/{user_id}/{collection_name}"

class MockCollection:
    def __init__(self, name): self.name = name
    def add(self, data): 
        print(f"Mock: Added to {self.name}"); 
        # Return a mock doc ref with an 'id' attribute
        class MockRef: 
            def __init__(self): self.id = "mock_id"
        return None, MockRef()
    def document(self, *args, **kwargs): return MockDoc()
    def where(self, *args, **kwargs): return self
    def order_by(self, *args, **kwargs): return self
    def limit(self, *args, **kwargs): return self
    def stream(self, *args, **kwargs): return []
    def get(self, *args, **kwargs):
        class MockResult:
            def __init__(self): self.exists = False
            def to_dict(self): return {}
        return MockResult()

class MockDoc:
    def __init__(self): self.id = "mock_id"; self.exists = False
    def set(self, *args, **kwargs): pass
    def update(self, *args, **kwargs): pass
    def delete(self, *args, **kwargs): pass
    def get(self, *args, **kwargs): return self
    def to_dict(self): return {}

class MockFirestore:
    def collection(self, name): return MockCollection(name)
    def batch(self): return MockBatch()

class MockBatch:
    def set(self, *args, **kwargs): pass
    def update(self, *args, **kwargs): pass
    def delete(self, *args, **kwargs): pass
    def commit(self): pass

db = MockFirestore()
MOCK_MODE = True
COLLECTION = "batches"

# Firebase initialization — clears any stale apps, then re-initializes fresh.
try:
    # Delete any previously cached (possibly broken) app so key changes take effect
    for _stale in list(firebase_admin._apps.values()):
        firebase_admin.delete_app(_stale)

    _default_key = os.path.join(os.path.dirname(os.path.abspath(__file__)), "firebase_key.json")
    _json_str = os.getenv("FIREBASE_CREDENTIALS_JSON", "")
    _cred_path = os.getenv("FIREBASE_CREDENTIALS_PATH", _default_key)

    if _json_str:
        import json as _json
        cred = credentials.Certificate(_json.loads(_json_str))
        print("Firebase: Initializing with FIREBASE_CREDENTIALS_JSON env var")
    elif os.path.exists(_cred_path):
        cred = credentials.Certificate(_cred_path)
        print(f"Firebase: Initializing with key file: {_cred_path}")
    else:
        raise FileNotFoundError(
            f"No Firebase credentials found. Expected '{_cred_path}' "
            "or set FIREBASE_CREDENTIALS_JSON env var."
        )

    firebase_admin.initialize_app(cred)
    db = firestore.client()
    MOCK_MODE = False
    print("[OK] Firebase initialized successfully -- LIVE mode.")

except Exception as e:
    print(f"[ERROR] Firebase initialization failed: {e}")
    print("[WARN] Running in MOCK_MODE -- data will not be persisted.")
    db = MockFirestore()
    MOCK_MODE = True

import mock_data

def init_db():
    """No-op: Firestore is schema-less, no table creation needed."""
    pass

def insert_batch(batch_number: str, expiry_date: str, product_name: str = "Unknown", category: str = "Unknown", stock: int = 0, user_id: str = "legacy"):
    """Insert a new batch into the 'batches' collection."""
    if MOCK_MODE:
        return
    current_time = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    db.collection(_user_collection(user_id, COLLECTION)).add({
        "batch_number": batch_number,
        "expiry_date":  expiry_date,
        "product_name": product_name,
        "category":     category,
        "logged_at":    current_time,
        "Number":       stock,
    })

def update_product_name(batch_number: str, new_name: str, user_id: str = "legacy") -> bool:
    """Update product name for a batch."""
    if MOCK_MODE:
        return True
    docs = db.collection(_user_collection(user_id, COLLECTION)).where(filter=firestore.FieldFilter("batch_number", "==", batch_number)).stream()
    updated = False
    for doc in docs:
        doc.reference.update({"product_name": new_name})
        updated = True
    return updated

def insert_quarantine(batch_number: str, expiry_date: str, product_name: str = "Unknown", category: str = "Unknown", user_id: str = "legacy"):
    """Write an expired item to the quarantine collection."""
    if MOCK_MODE:
        return
    current_time = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    db.collection(_user_collection(user_id, "quarantine")).add({
        "batch_number": batch_number,
        "expiry_date": expiry_date,
        "product_name": product_name,
        "category": category,
        "logged_at": current_time,
        "reason": "EXPIRED",
    })

def get_inventory(user_id: str = "legacy"):
    """Returns a list of tuples: (batch_number, expiry_date, product_name, category, logged_at, stock)"""
    if MOCK_MODE:
        return mock_data.MOCK_BATCHES

    try:
        docs = db.collection(_user_collection(user_id, COLLECTION)).stream(timeout=10)
        results = []
        for doc in docs:
            d = doc.to_dict()
            stock_val = 0
            for f in _STOCK_FIELDS:
                if f in d:
                    try:
                        stock_val = int(d[f])
                    except (ValueError, TypeError):
                        stock_val = 0
                    break
            results.append((
                d.get("batch_number", ""),
                d.get("expiry_date", ""),
                d.get("product_name", "Unknown"),
                d.get("category", "Unknown"),
                d.get("logged_at", ""),
                stock_val,
            ))
        return [r for r in results if r[-1] > 0]
    except Exception as e:
        print(f"Firestore stream error: {e}")
        return mock_data.MOCK_BATCHES

SALES_LOG_COLLECTION = "daily_sales_log"
INVENTORY_COLLECTION = "inventory"
CHAT_SESSIONS_COLLECTION = "chat_sessions"
COLLECTION = "batches"

def delete_batch(doc_id: str, user_id: str = "legacy") -> bool:
    """Delete a product/batch from the batches collection."""
    if MOCK_MODE:
        return True
    db.collection(_user_collection(user_id, COLLECTION)).document(doc_id).delete()
    return True

def update_stock(doc_id: str, new_stock: int, user_id: str = "legacy"):
    """Directly set the stock level for a specific product."""
    if MOCK_MODE:
        return
    doc_ref = db.collection(_user_collection(user_id, COLLECTION)).document(doc_id)
    doc = doc_ref.get()
    if doc.exists:
        d = doc.to_dict()
        for field in _STOCK_FIELDS:
            if field in d:
                doc_ref.update({field: max(0, new_stock)})
                return
        # If no stock field found, write using the default
        doc_ref.update({"Number": max(0, new_stock)})

def update_category(doc_id: str, new_category: str, user_id: str = "legacy"):
    """Change the category of a product."""
    if MOCK_MODE:
        return
    db.collection(_user_collection(user_id, COLLECTION)).document(doc_id).update({"category": new_category})

def get_quarantine(user_id: str = "legacy") -> list[dict]:
    """Return all items in the quarantine collection."""
    if MOCK_MODE:
        return []
    try:
        docs = db.collection(_user_collection(user_id, "quarantine")).order_by("logged_at", direction=firestore.Query.DESCENDING).stream(timeout=10)
        return [{**doc.to_dict(), "doc_id": doc.id} for doc in docs]
    except Exception as e:
        print(f"Quarantine fetch error: {e}")
        return []

def save_chat_session(thread_id: str, messages: list[dict], title: str = "", user_id: str = "legacy") -> None:
    """Upsert a chat session document in Firestore."""
    if MOCK_MODE:
        return
    if not title:
        for m in messages:
            if m.get("role") == "user":
                title = m["content"][:60] + ("…" if len(m["content"]) > 60 else "")
                break
    if not title:
        title = "New chat"
    db.collection(_user_collection(user_id, CHAT_SESSIONS_COLLECTION)).document(thread_id).set({
        "thread_id":  thread_id,
        "title":      title,
        "messages":   messages,
        "updated_at": datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
        "created_at": datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
    }, merge=True)

def list_chat_sessions(limit: int = 30, user_id: str = "legacy") -> list[dict]:
    """Return recently updated chat sessions."""
    if MOCK_MODE:
        return mock_data.MOCK_CHAT_SESSIONS
    try:
        docs = db.collection(_user_collection(user_id, CHAT_SESSIONS_COLLECTION)).order_by("updated_at", direction=firestore.Query.DESCENDING).limit(limit).get(timeout=5)
        return [{"thread_id": d.id, **d.to_dict()} for d in docs]
    except Exception:
        return mock_data.MOCK_CHAT_SESSIONS

def load_chat_session(thread_id: str, user_id: str = "legacy") -> list[dict]:
    """Load messages for a chat session."""
    if MOCK_MODE:
        for s in mock_data.MOCK_CHAT_SESSIONS:
            if s["thread_id"] == thread_id:
                return s["messages"]
        return []
    doc = db.collection(_user_collection(user_id, CHAT_SESSIONS_COLLECTION)).document(thread_id).get()
    if doc.exists:
        return doc.to_dict().get("messages", [])
    return []

def delete_chat_session(thread_id: str, user_id: str = "legacy") -> None:
    """Delete a chat session."""
    if MOCK_MODE:
        return
    db.collection(_user_collection(user_id, CHAT_SESSIONS_COLLECTION)).document(thread_id).delete()

def get_inventory_with_stock(user_id: str = "legacy") -> list[dict]:
    """Fetch all medicines with stock info for a specific user."""
    if MOCK_MODE:
        # Construct dictionaries from mock_data.MOCK_BATCHES tuples
        return [{
            "doc_id": f"mock_{i}",
            "batch_number": b[0],
            "expiry_date": b[1],
            "product_name": b[2],
            "category": b[3],
            "stock": b[5],
            "reorder_dismissed": False
        } for i, b in enumerate(mock_data.MOCK_BATCHES)]

    docs = db.collection(_user_collection(user_id, COLLECTION)).stream()
    results = []
    for doc in docs:
        d = doc.to_dict()
        stock_val = 0
        for field in _STOCK_FIELDS:
            if field in d:
                try:
                    stock_val = int(d[field])
                except (ValueError, TypeError):
                    stock_val = 0
                break
        results.append({
            "doc_id":            doc.id,
            "batch_number":      d.get("batch_number", doc.id),
            "product_name":      d.get("product_name", "Unknown"),
            "category":          d.get("category", "Unknown"),
            "expiry_date":       d.get("expiry_date", ""),
            "stock":             stock_val,
            "reorder_dismissed": bool(d.get("reorder_dismissed", False)),
        })
    return results

def set_stock(doc_id: str, stock: int, user_id: str = "legacy"):
    """Update stock for a specific document."""
    if MOCK_MODE:
        return
    db.collection(_user_collection(user_id, COLLECTION)).document(doc_id).update({"Number": stock})
def get_todays_sales_log(user_id: str = "legacy") -> list[dict]:
    """Fetch sales logs for today."""
    if MOCK_MODE:
        return []
    today_str = datetime.date.today().isoformat()
    docs = db.collection(_user_collection(user_id, SALES_LOG_COLLECTION)).where(filter=firestore.FieldFilter("date", "==", today_str)).stream()
    results = []
    for doc in docs:
        d = doc.to_dict()
        d["log_id"] = doc.id
        results.append(d)
    return results

def get_sales_history(days: int = 5, user_id: str = "legacy") -> dict[str, list[dict]]:
    """Return sales logs for the last few days."""
    if MOCK_MODE:
        return { (datetime.date.today() - datetime.timedelta(days=i)).isoformat(): [] for i in range(1, days+1) }
    today = datetime.date.today()
    result = {}
    for offset in range(1, days + 1):
        day_str = (today - datetime.timedelta(days=offset)).isoformat()
        docs = db.collection(_user_collection(user_id, SALES_LOG_COLLECTION)).where(filter=firestore.FieldFilter("date", "==", day_str)).stream()
        entries = [ {**doc.to_dict(), "log_id": doc.id} for doc in docs ]
        if not entries:
            arch_docs = db.collection(_user_collection(user_id, "archived_sales_log")).where(filter=firestore.FieldFilter("date", "==", day_str)).stream()
            entries = [ {**doc.to_dict(), "log_id": doc.id} for doc in arch_docs ]
        result[day_str] = entries
    return result

def get_archived_sales(page: int = 0, page_size: int = 10, user_id: str = "legacy") -> tuple[dict[str, list[dict]], int]:
    """Fetch paginated archived sales logs."""
    if MOCK_MODE:
        return {}, 0
    cutoff = (datetime.date.today() - datetime.timedelta(days=5)).isoformat()
    all_docs = list(db.collection(_user_collection(user_id, "archived_sales_log")).where(filter=firestore.FieldFilter("date", "<", cutoff)).stream())
    grouped = {}
    for doc in all_docs:
        d = doc.to_dict()
        day_str = d.get("date", "unknown")
        grouped.setdefault(day_str, []).append({**d, "log_id": doc.id})
    sorted_dates = sorted(grouped.keys(), reverse=True)
    start = page * page_size
    paged_dates = sorted_dates[start : start + page_size]
    return {d: grouped[d] for d in paged_dates}, len(sorted_dates)

def _adjust_stock_by_batch(batch_number: str, delta: int, user_id: str = "legacy"):
    """Adjust stock for a specific batch number."""
    if MOCK_MODE:
        return
    docs = db.collection(_user_collection(user_id, COLLECTION)).where(filter=firestore.FieldFilter("batch_number", "==", batch_number)).stream()
    for doc in docs:
        d = doc.to_dict()
        for field in _STOCK_FIELDS:
            if field in d:
                current = int(d[field])
                doc.reference.update({field: max(0, current + delta)})
                break

def add_to_sales_log(batch_number: str, product_name: str, qty_sold: int, user_id: str = "legacy") -> str:
    """Log a sale and deduct stock."""
    if MOCK_MODE:
        return "mock_log_id"
    today_str = datetime.date.today().isoformat()
    _, ref = db.collection(_user_collection(user_id, SALES_LOG_COLLECTION)).add({
        "date":            today_str,
        "batch_number":    batch_number,
        "product_name":    product_name,
        "qty_sold":        qty_sold,
        "logged_at":       datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
        "stock_deducted":  True,
    })
    _adjust_stock_by_batch(batch_number, -qty_sold, user_id)
    return ref.id

def update_sales_log_entry(log_id: str, new_qty: int, user_id: str = "legacy"):
    """Update a sale entry and adjust stock accordingly."""
    if MOCK_MODE:
        return
    doc_ref = db.collection(_user_collection(user_id, SALES_LOG_COLLECTION)).document(log_id)
    doc = doc_ref.get()
    if doc.exists:
        d = doc.to_dict()
        old_qty = int(d.get("qty_sold", 0))
        batch_number = d.get("batch_number", "")
        if d.get("stock_deducted", False) and batch_number:
            _adjust_stock_by_batch(batch_number, old_qty - new_qty, user_id)
        doc_ref.update({"qty_sold": new_qty})

def delete_sales_log_entry(log_id: str, user_id: str = "legacy"):
    """Delete a sale entry and restore stock."""
    if MOCK_MODE:
        return
    doc_ref = db.collection(_user_collection(user_id, SALES_LOG_COLLECTION)).document(log_id)
    doc = doc_ref.get()
    if doc.exists:
        d = doc.to_dict()
        if d.get("stock_deducted", False) and d.get("batch_number"):
            _adjust_stock_by_batch(d["batch_number"], int(d.get("qty_sold", 0)), user_id)
        doc_ref.delete()

def _reset_reorder_flag_if_zero(batch_number: str, user_id: str = "legacy"):
    """Reset alert flag if stock hits zero."""
    if MOCK_MODE:
        return
    docs = db.collection(_user_collection(user_id, COLLECTION)).where(filter=firestore.FieldFilter("batch_number", "==", batch_number)).stream()
    for doc in docs:
        d = doc.to_dict()
        for field in _STOCK_FIELDS:
            if field in d:
                if int(d[field]) <= 0 and d.get("reorder_dismissed", False):
                    doc.reference.update({"reorder_dismissed": False})
                break

def process_midnight_deductions(user_id: str = "legacy"):
    """Archive past sales and deduct stock if needed."""
    if MOCK_MODE:
        return "MOCK: Cleanup skipped"
    today_str = datetime.date.today().isoformat()
    try:
        past_docs = list(db.collection(_user_collection(user_id, SALES_LOG_COLLECTION)).where(filter=firestore.FieldFilter("date", "<", today_str)).get(timeout=10))
    except Exception as e:
        return f"⚠️ Timeout: {e}"
    if not past_docs:
        return "Cleanup: No past logs"
    batch_writer = db.batch()
    for doc in past_docs:
        d = doc.to_dict()
        if not d.get("stock_deducted", False) and d.get("qty_sold", 0) > 0 and d.get("batch_number"):
            _adjust_stock_by_batch(d["batch_number"], -int(d["qty_sold"]), user_id)
            _reset_reorder_flag_if_zero(d["batch_number"], user_id)
        archive_ref = db.collection(_user_collection(user_id, "archived_sales_log")).document(doc.id)
        batch_writer.set(archive_ref, {**d, "archived_at": today_str, "stock_deducted": True})
        batch_writer.delete(doc.reference)
    batch_writer.commit()
    return f"✅ Archived {len(past_docs)} logs."

def get_reorder_alerts(user_id: str = "legacy") -> list[dict]:
    """Return items with zero or low stock."""
    if MOCK_MODE:
        return []
    docs = db.collection(_user_collection(user_id, COLLECTION)).stream()
    results = []
    for doc in docs:
        d = doc.to_dict()
        if d.get("reorder_dismissed", False): continue
        stock_val = 0
        for field in _STOCK_FIELDS:
            if field in d:
                try: stock_val = int(d[field]); break
                except: stock_val = 0
        if stock_val <= 10:
            results.append({
                "doc_id": doc.id,
                "batch_number": d.get("batch_number", doc.id),
                "product_name": d.get("product_name", "Unknown"),
                "category": d.get("category", "Unknown"),
                "expiry_date": d.get("expiry_date", ""),
                "stock": stock_val
            })
    return results

def dismiss_reorder_alert(doc_id: str, user_id: str = "legacy"):
    """Dismiss a reorder alert."""
    if MOCK_MODE: return
    db.collection(_user_collection(user_id, COLLECTION)).document(doc_id).update({"reorder_dismissed": True})

def get_expired_items(user_id: str = "legacy") -> list[dict]:
    """Return items past their expiry date."""
    if MOCK_MODE:
        return []
    today_str = datetime.date.today().isoformat()
    docs = db.collection(_user_collection(user_id, COLLECTION)).stream()
    results = []
    for doc in docs:
        d = doc.to_dict()
        if d.get("expiry_dismissed", False): continue
        expiry = d.get("expiry_date", "")
        if not expiry: continue
        stock_val = 0
        for f in _STOCK_FIELDS:
            if f in d:
                try: stock_val = int(d[f]); break
                except: stock_val = 0
        try:
            days_expired = (datetime.date.today() - datetime.date.fromisoformat(expiry)).days
        except:
            days_expired = 0

        # Skip if expiry is further out than 90 days
        if days_expired < -90: continue

        results.append({
            "doc_id": doc.id,
            "batch_number": d.get("batch_number", doc.id),
            "product_name": d.get("product_name", "Unknown"),
            "category": d.get("category", "Unknown"),
            "expiry_date": expiry,
            "stock": stock_val,
            "days_expired": days_expired
        })
    return sorted(results, key=lambda x: x["expiry_date"], reverse=True)

def dismiss_expiry_alert(doc_id: str, user_id: str = "legacy"):
    """Dismiss an expiration alert."""
    if MOCK_MODE: return
    db.collection(_user_collection(user_id, COLLECTION)).document(doc_id).update({"expiry_dismissed": True})


def seed_inventory_stock_fields(user_id: str = "legacy"):
    """Migration: set default fields if missing."""
    if MOCK_MODE: return 0
    docs = db.collection(_user_collection(user_id, INVENTORY_COLLECTION)).stream()
    updated = 0
    for doc in docs:
        d = doc.to_dict()
        updates = {}
        if "stock" not in d: updates["stock"] = 100
        if "reorder_dismissed" not in d: updates["reorder_dismissed"] = False
        if updates:
            doc.reference.update(updates)
            updated += 1
    return updated

def get_analytics_data(user_id: str = "legacy") -> dict:
    """Gather data for analytics."""
    if MOCK_MODE:
        return {"sales": [], "stock": get_inventory_with_stock(user_id)}
    today = datetime.date.today()
    thirty_days_ago = (today - datetime.timedelta(days=30)).isoformat()
    sales_docs = list(db.collection(_user_collection(user_id, SALES_LOG_COLLECTION)).where(filter=firestore.FieldFilter("date", ">=", thirty_days_ago)).stream())
    archived_docs = list(db.collection(_user_collection(user_id, "archived_sales_log")).where(filter=firestore.FieldFilter("date", ">=", thirty_days_ago)).stream())
    return {
        "sales": [d.to_dict() for d in sales_docs + archived_docs],
        "stock": get_inventory_with_stock(user_id)
    }