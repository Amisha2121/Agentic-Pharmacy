import datetime
import os
from dotenv import load_dotenv
import firebase_admin
from firebase_admin import credentials, firestore

load_dotenv()

# Initialize Firebase app (only once)
# Supports three credential sources (tried in order):
#   1. FIREBASE_CREDENTIALS_JSON  — full JSON string in env var (best for cloud/server)
#   2. FIREBASE_CREDENTIALS_PATH  — path to a JSON key file
#   3. firebase_key.json          — default local file
if not firebase_admin._apps:
    _json_str = os.getenv("FIREBASE_CREDENTIALS_JSON", "")
    if _json_str:
        import json
        _cred_dict = json.loads(_json_str)
        cred = credentials.Certificate(_cred_dict)
    else:
        cred_path = os.getenv("FIREBASE_CREDENTIALS_PATH", "firebase_key.json")
        cred = credentials.Certificate(cred_path)
    firebase_admin.initialize_app(cred)


db = firestore.client()
COLLECTION = "batches"

def init_db():
    """No-op: Firestore is schema-less, no table creation needed."""
    pass

def insert_batch(batch_number: str, expiry_date: str, product_name: str = "Unknown", category: str = "Unknown", stock: int = 0):
    """Insert a new batch into the 'batches' collection.
    `stock` is saved as 'Number' (the field name used in existing Firestore docs).
    """
    current_time = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    db.collection(COLLECTION).add({
        "batch_number": batch_number,
        "expiry_date":  expiry_date,
        "product_name": product_name,
        "category":     category,
        "logged_at":    current_time,
        "Number":       stock,          # stock field — consistent with existing docs
    })

def update_product_name(batch_number: str, new_name: str) -> bool:
    docs = db.collection(COLLECTION).where(filter=firestore.FieldFilter("batch_number", "==", batch_number)).stream()
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
    """Returns a list of tuples: (batch_number, expiry_date, product_name, category, logged_at, stock)"""
    _STOCK_FIELDS = ["Number", "stock", "Stock", "quantity", "Quantity", "qty"]
    docs = db.collection(COLLECTION).stream()
    results = []
    for doc in docs:
        d = doc.to_dict()
        # Read stock from whatever field name is present
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
    return [r for r in results if r[-1] > 0]   # exclude zero-stock from live inventory


# ─────────────────────────────────────────────────────────────────────────────
# DAILY SALES TRACKING — Database Functions
# ─────────────────────────────────────────────────────────────────────────────

SALES_LOG_COLLECTION = "daily_sales_log"
INVENTORY_COLLECTION = "inventory"   # Richer inventory collection with stock fields
CHAT_SESSIONS_COLLECTION = "chat_sessions"


# ─────────────────────────────────────────────────────────────────────────────
# CHAT SESSION PERSISTENCE
# ─────────────────────────────────────────────────────────────────────────────

def save_chat_session(thread_id: str, messages: list[dict], title: str = "") -> None:
    """
    Upsert a chat session document in Firestore.
    Auto-generates a title from the first user message if not provided.
    """
    if not title:
        for m in messages:
            if m.get("role") == "user":
                title = m["content"][:60] + ("…" if len(m["content"]) > 60 else "")
                break
    if not title:
        title = "New chat"
    db.collection(CHAT_SESSIONS_COLLECTION).document(thread_id).set({
        "thread_id":  thread_id,
        "title":      title,
        "messages":   messages,
        "updated_at": datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
        "created_at": datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
    }, merge=True)


def list_chat_sessions(limit: int = 30) -> list[dict]:
    """Return up to `limit` sessions, newest first."""
    docs = (
        db.collection(CHAT_SESSIONS_COLLECTION)
          .order_by("updated_at", direction=firestore.Query.DESCENDING)
          .limit(limit)
          .stream()
    )
    return [{"thread_id": d.id, **d.to_dict()} for d in docs]


def load_chat_session(thread_id: str) -> list[dict]:
    """Return the messages list for a given session."""
    doc = db.collection(CHAT_SESSIONS_COLLECTION).document(thread_id).get()
    if doc.exists:
        return doc.to_dict().get("messages", [])
    return []


def delete_chat_session(thread_id: str) -> None:
    """Permanently delete a chat session."""
    db.collection(CHAT_SESSIONS_COLLECTION).document(thread_id).delete()



def get_inventory_with_stock() -> list[dict]:
    """
    Fetch all medicines from the 'batches' collection for the autocomplete bar.

    Tries all known Firestore field names for stock in priority order:
      'Number' → 'stock' → 'Stock' → 'quantity' → 'Quantity' → 'qty'
    If none found, stock is marked as -1 (unset) so the UI can warn the user.
    """
    _STOCK_FIELDS = ["Number", "stock", "Stock", "quantity", "Quantity", "qty"]

    docs = db.collection(COLLECTION).stream()   # COLLECTION = "batches"
    results = []
    for doc in docs:
        d = doc.to_dict()

        # Walk through all possible field names — take the first one found
        stock_val = None
        for field in _STOCK_FIELDS:
            if field in d:
                try:
                    stock_val = int(d[field])
                except (ValueError, TypeError):
                    stock_val = 0
                break
# -1 sentinel removed — items with no stock field just default to 0
        if stock_val is None:
            stock_val = 0

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


def set_stock(doc_id: str, stock: int):
    """Set the stock field on a batches document by its Firestore doc ID."""
    db.collection(COLLECTION).document(doc_id).update({"Number": stock})



def get_todays_sales_log() -> list[dict]:
    """
    Fetch all entries in the daily_sales_log for TODAY.
    Each doc has: date, batch_number, product_name, qty_sold, log_id.
    Returns a list of dicts (one per log entry).
    """
    today_str = datetime.date.today().isoformat()
    docs = (
        db.collection(SALES_LOG_COLLECTION)
          .where(filter=firestore.FieldFilter("date", "==", today_str))
          .stream()
    )
    results = []
    for doc in docs:
        d = doc.to_dict()
        d["log_id"] = doc.id
        results.append(d)
    return results


def get_sales_history(days: int = 5) -> dict[str, list[dict]]:
    """
    Return sales log entries for the last `days` days (not including today),
    grouped by date string.  Returns an OrderedDict: {"2026-03-08": [...], ...}
    sorted newest-first.

    Only reads from `daily_sales_log`; processed days will show archived data
    via get_archived_sales() instead.
    """
    today = datetime.date.today()
    result: dict[str, list[dict]] = {}

    for offset in range(1, days + 1):
        day = today - datetime.timedelta(days=offset)
        day_str = day.isoformat()
        docs = (
            db.collection(SALES_LOG_COLLECTION)
              .where(filter=firestore.FieldFilter("date", "==", day_str))
              .stream()
        )
        entries = []
        for doc in docs:
            d = doc.to_dict()
            d["log_id"] = doc.id
            entries.append(d)

        # Also check archive for this day (midnight deductions move logs there)
        if not entries:
            arch_docs = (
                db.collection("archived_sales_log")
                  .where(filter=firestore.FieldFilter("date", "==", day_str))
                  .stream()
            )
            for doc in arch_docs:
                d = doc.to_dict()
                d["log_id"] = doc.id
                entries.append(d)

        result[day_str] = entries

    return result   # newest day (offset=1) first


def get_archived_sales(page: int = 0, page_size: int = 10) -> dict[str, list[dict]]:
    """
    Fetch older archived sales logs (beyond the last 5 days), paginated.
    Returns a dict of {date_str: [entries]} sorted newest-first.

    Uses 'archived_sales_log' collection. page=0 is the oldest visible page.
    """
    cutoff = (datetime.date.today() - datetime.timedelta(days=5)).isoformat()

    all_docs = list(
        db.collection("archived_sales_log")
          .where(filter=firestore.FieldFilter("date", "<", cutoff))
          .stream()
    )

    # Group by date
    grouped: dict[str, list[dict]] = {}
    for doc in all_docs:
        d = doc.to_dict()
        d["log_id"] = doc.id
        day_str = d.get("date", "unknown")
        grouped.setdefault(day_str, []).append(d)

    # Sort dates newest-first, then paginate at the date (day) level
    sorted_dates = sorted(grouped.keys(), reverse=True)
    start = page * page_size
    paged_dates = sorted_dates[start : start + page_size]

    return {d: grouped[d] for d in paged_dates}, len(sorted_dates)


def _adjust_stock_by_batch(batch_number: str, delta: int):
    """
    Internal helper: adjust stock (Number field) for the batches doc matching
    `batch_number` by `delta` units (negative = deduct, positive = restore).
    This operates on the 'batches' COLLECTION (not inventory) since that's
    where all the Number fields live.
    """
    _STOCK_FIELDS = ["Number", "stock", "Stock", "quantity", "Quantity", "qty"]
    docs = list(
        db.collection(COLLECTION)
          .where(filter=firestore.FieldFilter("batch_number", "==", batch_number))
          .stream()
    )
    for doc in docs:
        d = doc.to_dict()
        # Find the actual stock field name used in this doc
        for field in _STOCK_FIELDS:
            if field in d:
                current = int(d[field])
                new_val = max(0, current + delta)   # never go below 0
                doc.reference.update({field: new_val})
                break


def add_to_sales_log(batch_number: str, product_name: str, qty_sold: int) -> str:
    """
    Append a new sale entry for today's log, immediately deduct from stock,
    and mark stock_deducted=True so the nightly job doesn't double-deduct.
    """
    today_str = datetime.date.today().isoformat()
    _, ref = db.collection(SALES_LOG_COLLECTION).add({
        "date":            today_str,
        "batch_number":    batch_number,
        "product_name":    product_name,
        "qty_sold":        qty_sold,
        "logged_at":       datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
        "stock_deducted":  True,   # immediately deducted below
    })
    _adjust_stock_by_batch(batch_number, -qty_sold)
    return ref.id


def update_sales_log_entry(log_id: str, new_qty: int):
    """
    Update qty_sold of an existing log entry.
    Adjusts stock by the diff ONLY if the entry was already deducted (stock_deducted=True).
    Legacy entries without the flag are NOT adjusted here — midnight handles them.
    """
    doc_ref = db.collection(SALES_LOG_COLLECTION).document(log_id)
    doc = doc_ref.get()
    if doc.exists:
        d = doc.to_dict()
        old_qty = int(d.get("qty_sold", 0))
        batch_number = d.get("batch_number", "")
        already_deducted = d.get("stock_deducted", False)
        diff = new_qty - old_qty
        doc_ref.update({"qty_sold": new_qty})
        if diff != 0 and batch_number and already_deducted:
            # Only adjust live stock for entries that were already deducted
            _adjust_stock_by_batch(batch_number, -diff)


def delete_sales_log_entry(log_id: str):
    """
    Delete a log entry.
    Restores qty to stock ONLY if the entry had stock_deducted=True.
    Legacy entries (no flag) are not restored — midnight already skips them.
    """
    doc_ref = db.collection(SALES_LOG_COLLECTION).document(log_id)
    doc = doc_ref.get()
    if doc.exists:
        d = doc.to_dict()
        qty_sold = int(d.get("qty_sold", 0))
        batch_number = d.get("batch_number", "")
        already_deducted = d.get("stock_deducted", False)
        doc_ref.delete()
        if qty_sold > 0 and batch_number and already_deducted:
            _adjust_stock_by_batch(batch_number, qty_sold)   # restore


def _reset_reorder_flag_if_zero(batch_number: str):
    """
    After a stock deduction, check if the batch is now at zero or below.
    If so, clear reorder_dismissed so the item re-appears in Reorder Alerts.
    """
    _STOCK_FIELDS = ["Number", "stock", "Stock", "quantity", "Quantity", "qty"]
    docs = list(
        db.collection(COLLECTION)
          .where(filter=firestore.FieldFilter("batch_number", "==", batch_number))
          .stream()
    )
    for doc in docs:
        d = doc.to_dict()
        for field in _STOCK_FIELDS:
            if field in d:
                current_stock = int(d[field])
                if current_stock <= 0 and d.get("reorder_dismissed", False):
                    doc.reference.update({"reorder_dismissed": False})
                break


def process_midnight_deductions():

    """
    Called on every Streamlit page load.

    Finds ALL daily_sales_log entries with date < today:
      - If stock_deducted=False/missing  → deduct from batches.Number NOW
      - Always → archive to archived_sales_log + delete from daily_sales_log

    This ensures:
      • Legacy/backlog entries (no flag) get deducted immediately on next load
      • Current-day entries (stock_deducted=True) are never double-deducted
      • No 'last_processed_date' guard — each entry is only processed once
        because it's deleted after archiving
    """
    today_str = datetime.date.today().isoformat()

    # Fetch ALL past-day entries in one query (date < today as string comparison)
    all_past_docs = list(
        db.collection(SALES_LOG_COLLECTION)
          .where(filter=firestore.FieldFilter("date", "<", today_str))
          .stream()
    )

    if not all_past_docs:
        return ""

    batch_writer = db.batch()
    deducted_count  = 0
    archived_count  = 0

    for doc in all_past_docs:
        d = doc.to_dict()
        batch_number     = d.get("batch_number", "")
        qty_sold         = int(d.get("qty_sold", 0))
        already_deducted = d.get("stock_deducted", False)

        # Deduct stock for entries that haven't been deducted yet
        if not already_deducted and qty_sold > 0 and batch_number:
            _adjust_stock_by_batch(batch_number, -qty_sold)
            deducted_count += 1
            # If stock now at zero, re-enable the reorder alert
            _reset_reorder_flag_if_zero(batch_number)

        # Archive
        archive_ref = db.collection("archived_sales_log").document(doc.id)
        batch_writer.set(archive_ref, {**d, "archived_at": today_str, "stock_deducted": True})
        # Delete from active log
        batch_writer.delete(doc.reference)
        archived_count += 1

    batch_writer.commit()

    parts = []
    if deducted_count:
        parts.append(f"{deducted_count} backlog deduction(s) applied")
    parts.append(f"{archived_count} log(s) archived")
    return f"✅ Past-day cleanup: {', '.join(parts)}."


def get_reorder_alerts() -> list[dict]:
    """
    Return all items from the 'batches' collection where stock <= 0
    and reorder_dismissed != True. Queries all docs and filters in Python
    to avoid needing a composite Firestore index.
    """
    _STOCK_FIELDS = ["Number", "stock", "Stock", "quantity", "Quantity", "qty"]
    docs = db.collection(COLLECTION).stream()   # COLLECTION = "batches"
    results = []
    for doc in docs:
        d = doc.to_dict()
        # Skip items the user has already dismissed
        if d.get("reorder_dismissed", False):
            continue
        # Find the stock value using any known field name
        stock_val = None
        for field in _STOCK_FIELDS:
            if field in d:
                try:
                    stock_val = int(d[field])
                except (ValueError, TypeError):
                    stock_val = 0
                break
        if stock_val is None:
            stock_val = 0
        # Only include items at or below zero stock
        if stock_val > 0:
            continue
        results.append({
            "doc_id":       doc.id,
            "batch_number": d.get("batch_number", doc.id),
            "product_name": d.get("product_name", "Unknown"),
            "category":     d.get("category", "Unknown"),
            "expiry_date":  d.get("expiry_date", ""),
            "stock":        stock_val,
        })
    return results


def dismiss_reorder_alert(doc_id: str):
    """Set reorder_dismissed=True so the item disappears from the alert view."""
    db.collection(COLLECTION).document(doc_id).update({"reorder_dismissed": True})


def get_expired_items() -> list[dict]:
    """
    Return all items in the 'batches' collection where expiry_date < today.
    Fetches all docs and filters in Python (no composite index required).
    """
    _STOCK_FIELDS = ["Number", "stock", "Stock", "quantity", "Quantity", "qty"]
    today_str = datetime.date.today().isoformat()
    docs = db.collection(COLLECTION).stream()
    results = []
    for doc in docs:
        d = doc.to_dict()
        expiry = d.get("expiry_date", "")
        if not expiry:
            continue
        try:
            if expiry >= today_str:   # not expired yet
                continue
        except TypeError:
            continue
        # Stock
        stock_val = 0
        for f in _STOCK_FIELDS:
            if f in d:
                try:
                    stock_val = int(d[f])
                except (ValueError, TypeError):
                    stock_val = 0
                break
        # Days expired
        try:
            exp_date = datetime.date.fromisoformat(expiry)
            days_expired = (datetime.date.today() - exp_date).days
        except ValueError:
            days_expired = 0
        results.append({
            "doc_id":       doc.id,
            "batch_number": d.get("batch_number", doc.id),
            "product_name": d.get("product_name", "Unknown"),
            "category":     d.get("category", "Unknown"),
            "expiry_date":  expiry,
            "stock":        stock_val,
            "days_expired": days_expired,
        })
    # Sort by most recently expired first
    results.sort(key=lambda x: x["expiry_date"], reverse=True)
    return results


def seed_inventory_stock_fields():
    """
    One-time migration helper: for any doc in 'inventory' that is missing
    the 'stock' or 'reorder_dismissed' fields, set sensible defaults.
    Call this manually or on first app load.
    """
    docs = db.collection(INVENTORY_COLLECTION).stream()
    updated = 0
    for doc in docs:
        d = doc.to_dict()
        updates = {}
        if "stock" not in d:
            updates["stock"] = 100          # default starting stock
        if "reorder_dismissed" not in d:
            updates["reorder_dismissed"] = False
        if updates:
            doc.reference.update(updates)
            updated += 1
    return updated

# ─────────────────────────────────────────────────────────────────────────────
# ANALYTICS & REPORTS
# ─────────────────────────────────────────────────────────────────────────────

def get_analytics_data() -> dict:
    """
    Fetch and aggregate data for the Analytics Dashboard.
    Returns a dictionary with recent sales logs and current stock health.
    """
    today = datetime.date.today()
    thirty_days_ago = (today - datetime.timedelta(days=30)).isoformat()
    
    # 1. Fetch sales from the last 30 days
    sales_docs = list(
        db.collection(SALES_LOG_COLLECTION)
          .where(filter=firestore.FieldFilter("date", ">=", thirty_days_ago))
          .stream()
    )
    # Also fetch archived sales if they fall within 30 days
    archived_docs = list(
        db.collection("archived_sales_log")
          .where(filter=firestore.FieldFilter("date", ">=", thirty_days_ago))
          .stream()
    )
    
    all_sales = [d.to_dict() for d in sales_docs + archived_docs]
    
    # 2. Fetch current inventory stock for health charts
    stock_data = get_inventory_with_stock()
    
    return {
        "sales": all_sales,
        "stock": stock_data
    }