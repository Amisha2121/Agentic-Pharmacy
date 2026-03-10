"""
📊 Daily Inventory & Sales Tracking Module
Database Functions for Firestore Operations

This module handles all Firestore interactions for:
- Daily sales logging
- Inventory stock management
- Midnight auto-deduction processing
- Reorder alert dismissal

Functions are designed to be called from main.py Streamlit UI.
"""

import os
import datetime
from typing import List, Dict, Any, Optional
import firebase_admin
from firebase_admin import credentials, firestore
from dotenv import load_dotenv


load_dotenv()

# ============================================================================
# DATABASE INITIALIZATION
# ============================================================================

def get_firestore_client():
    """
    Initialize and return Firestore client.
    Called once at app startup.
    """
    try:
        if not firebase_admin.get_app():
            cred = credentials.Certificate(os.getenv("FIREBASE_KEY_PATH", "firebase_key.json"))
            firebase_admin.initialize_app(cred)
    except ValueError:
        # App already initialized
        pass
    
    return firestore.client()


# ============================================================================
# 1. DATABASE SCHEMA INITIALIZATION
# ============================================================================

def ensure_inventory_schema():
    """
    Ensure all inventory items have required fields: 'stock' and 'reorder_dismissed'.
    Run once at app startup to migrate existing data if needed.
    
    This function:
    1. Iterates through all documents in 'inventory' collection
    2. Adds missing 'stock' field (default: 0 if not present)
    3. Adds missing 'reorder_dismissed' field (default: False)
    """
    db = get_firestore_client()
    inventory_ref = db.collection("inventory")
    
    try:
        docs = inventory_ref.stream()
        for doc in docs:
            data = doc.to_dict()
            updates = {}
            
            # Ensure 'stock' field exists
            if "stock" not in data:
                updates["stock"] = 0
            
            # Ensure 'reorder_dismissed' field exists
            if "reorder_dismissed" not in data:
                updates["reorder_dismissed"] = False
            
            # Apply updates if any fields were missing
            if updates:
                inventory_ref.document(doc.id).update(updates)
        
        print("✅ Inventory schema verification complete")
        return True
    
    except Exception as e:
        print(f"❌ Error ensuring inventory schema: {e}")
        return False


def ensure_daily_sales_log_exists():
    """
    Ensure 'daily_sales_log' collection exists in Firestore.
    Creates it if it doesn't exist by adding metadata document.
    
    This function is called once at app startup.
    """
    db = get_firestore_client()
    logs_ref = db.collection("daily_sales_log")
    
    try:
        # Check if collection has any documents
        docs = logs_ref.limit(1).stream()
        if list(docs):
            print("✅ daily_sales_log collection verified")
            return True
        
        # If empty, create metadata document to initialize collection
        logs_ref.document("_metadata").set({
            "created_at": datetime.datetime.now(),
            "purpose": "Temporary daily sales logging"
        })
        print("✅ daily_sales_log collection created")
        return True
    
    except Exception as e:
        print(f"❌ Error ensuring daily_sales_log collection: {e}")
        return False


# ============================================================================
# 2. DAILY SALES LOG OPERATIONS
# ============================================================================

def get_all_inventory_items() -> List[Dict[str, Any]]:
    """
    Fetch all items from inventory collection.
    Used for autocomplete search in "Log Daily Sales" tab.
    
    Returns:
        List of dicts with format:
        {
            'batch_number': 'ABC123',
            'product_name': 'Paracetamol',
            'stock': 60,
            'display_text': 'Paracetamol (Batch: ABC123) - Stock: 60',
            'doc_id': 'ABC123'  # Firestore document ID
        }
    """
    db = get_firestore_client()
    
    try:
        docs = db.collection("inventory").stream()
        items = []
        
        for doc in docs:
            data = doc.to_dict()
            
            # Extract fields (with defaults for backward compatibility)
            batch_number = doc.id  # Document ID is the batch number
            product_name = data.get("product_name", "Unknown Product")
            stock = data.get("stock", 0)
            
            # Create display text for autocomplete dropdown
            display_text = f"{product_name} (Batch: {batch_number}) - Stock: {stock}"
            
            items.append({
                "batch_number": batch_number,
                "product_name": product_name,
                "stock": stock,
                "display_text": display_text,
                "doc_id": batch_number  # For reference
            })
        
        return sorted(items, key=lambda x: x["product_name"])
    
    except Exception as e:
        print(f"❌ Error fetching inventory items: {e}")
        return []


def get_today_sales_log() -> List[Dict[str, Any]]:
    """
    Fetch today's sales log from daily_sales_log collection.
    
    Today's sales are stored with document ID = YYYY-MM-DD.
    
    Returns:
        List of sales documents with format:
        {
            'batch_number': 'ABC123',
            'product_name': 'Paracetamol',
            'quantity_sold': 5,
            'timestamp': datetime,
            'doc_id': 'ABC123_timestamp'
        }
    """
    db = get_firestore_client()
    today = datetime.date.today().isoformat()  # YYYY-MM-DD format
    
    try:
        doc_ref = db.collection("daily_sales_log").document(today)
        doc = doc_ref.get()
        
        if not doc.exists:
            # No sales logged yet for today
            return []
        
        data = doc.to_dict()
        
        # Extract 'items' array from document
        items = data.get("items", [])
        
        return items
    
    except Exception as e:
        print(f"❌ Error fetching today's sales log: {e}")
        return []


def add_sale_to_log(
    batch_number: str,
    product_name: str,
    quantity_sold: int
) -> bool:
    """
    Add a sale entry to today's daily_sales_log.
    
    This function:
    1. Gets or creates today's sales log document (ID = YYYY-MM-DD)
    2. Appends new sale to the 'items' array
    3. Updates timestamp of document
    
    Args:
        batch_number: Batch number of the product
        product_name: Name of the product
        quantity_sold: Number of units sold
    
    Returns:
        True if successful, False otherwise
    """
    db = get_firestore_client()
    today = datetime.date.today().isoformat()  # YYYY-MM-DD format
    
    try:
        doc_ref = db.collection("daily_sales_log").document(today)
        
        # Get existing document or create new one
        doc = doc_ref.get()
        
        if doc.exists:
            data = doc.to_dict()
            items = data.get("items", [])
        else:
            items = []
        
        # Create new sale item
        new_item = {
            "batch_number": batch_number,
            "product_name": product_name,
            "quantity_sold": quantity_sold,
            "timestamp": datetime.datetime.now().isoformat(),
            "doc_id": f"{batch_number}_{len(items)}"  # Unique ID for editing
        }
        
        # Append to items array
        items.append(new_item)
        
        # Update document in Firestore
        doc_ref.set({
            "items": items,
            "date": today,
            "last_updated": datetime.datetime.now()
        })
        
        return True
    
    except Exception as e:
        print(f"❌ Error adding sale to log: {e}")
        return False


def update_sale_in_log(
    sale_index: int,
    quantity_sold: int
) -> bool:
    """
    Update quantity of a specific sale in today's daily_sales_log.
    Called when pharmacist edits the st.data_editor table.
    
    Args:
        sale_index: Index of the sale in the items array
        quantity_sold: New quantity sold value
    
    Returns:
        True if successful, False otherwise
    """
    db = get_firestore_client()
    today = datetime.date.today().isoformat()
    
    try:
        doc_ref = db.collection("daily_sales_log").document(today)
        doc = doc_ref.get()
        
        if not doc.exists:
            print("❌ Today's sales log doesn't exist")
            return False
        
        data = doc.to_dict()
        items = data.get("items", [])
        
        # Validate index
        if sale_index < 0 or sale_index >= len(items):
            print(f"❌ Invalid sale index: {sale_index}")
            return False
        
        # Update quantity
        items[sale_index]["quantity_sold"] = max(0, quantity_sold)  # Prevent negative
        items[sale_index]["timestamp"] = datetime.datetime.now().isoformat()
        
        # Write back to Firestore
        doc_ref.update({
            "items": items,
            "last_updated": datetime.datetime.now()
        })
        
        return True
    
    except Exception as e:
        print(f"❌ Error updating sale in log: {e}")
        return False


def delete_sale_from_log(sale_index: int) -> bool:
    """
    Remove a sale from today's daily_sales_log.
    
    Args:
        sale_index: Index of the sale to remove
    
    Returns:
        True if successful, False otherwise
    """
    db = get_firestore_client()
    today = datetime.date.today().isoformat()
    
    try:
        doc_ref = db.collection("daily_sales_log").document(today)
        doc = doc_ref.get()
        
        if not doc.exists:
            return False
        
        data = doc.to_dict()
        items = data.get("items", [])
        
        # Validate index and remove
        if 0 <= sale_index < len(items):
            items.pop(sale_index)
            doc_ref.update({
                "items": items,
                "last_updated": datetime.datetime.now()
            })
            return True
        
        return False
    
    except Exception as e:
        print(f"❌ Error deleting sale from log: {e}")
        return False


# ============================================================================
# 3. MIDNIGHT AUTO-DEDUCTION LOGIC
# ============================================================================

def get_last_deduction_date() -> Optional[str]:
    """
    Retrieve the date when the last midnight deduction was processed.
    Stored in Firestore under a special metadata document.
    
    Returns:
        Date string (YYYY-MM-DD) or None if never processed
    """
    db = get_firestore_client()
    
    try:
        meta_doc = db.collection("_metadata").document("inventory_deductions").get()
        
        if meta_doc.exists:
            return meta_doc.get("last_deduction_date")
        
        return None
    
    except Exception as e:
        print(f"⚠️  Error getting last deduction date: {e}")
        return None


def set_last_deduction_date(date_str: str) -> bool:
    """
    Update the metadata document with the last deduction date.
    Called after processing midnight deductions.
    
    Args:
        date_str: Date string in YYYY-MM-DD format
    
    Returns:
        True if successful
    """
    db = get_firestore_client()
    
    try:
        db.collection("_metadata").document("inventory_deductions").set({
            "last_deduction_date": date_str,
            "last_deduction_time": datetime.datetime.now()
        }, merge=True)
        
        return True
    
    except Exception as e:
        print(f"❌ Error setting last deduction date: {e}")
        return False


def process_midnight_deductions() -> Dict[str, Any]:
    """
    🌙 MIDNIGHT AUTO-DEDUCTION LOGIC
    
    This is the core function that:
    1. Checks if a new day has started since last deduction
    2. Retrieves yesterday's sales log
    3. Subtracts sold quantities from main inventory
    4. Archives/clears the sales log
    5. Returns summary of processed transactions
    
    This function uses "lazy evaluation" - Streamlit calls it on every
    app reload, but it only processes if a new day has started.
    
    Returns:
        Dict with:
        {
            'processed': bool (whether deductions were made),
            'date': str (date processed, YYYY-MM-DD),
            'items_updated': int (number of inventory items affected),
            'total_units_deducted': int (total quantity subtracted),
            'error': str (error message if any)
        }
    """
    db = get_firestore_client()
    today = datetime.date.today().isoformat()
    
    result = {
        "processed": False,
        "date": today,
        "items_updated": 0,
        "total_units_deducted": 0,
        "error": None
    }
    
    try:
        # Step 1: Check if deductions already processed today
        last_deduction = get_last_deduction_date()
        
        if last_deduction == today:
            # Already processed today, skip
            print(f"✅ Deductions already processed for {today}")
            return result
        
        # Step 2: Get yesterday's date
        yesterday = (datetime.date.today() - datetime.timedelta(days=1)).isoformat()
        
        # Step 3: Retrieve yesterday's sales log
        sales_doc = db.collection("daily_sales_log").document(yesterday).get()
        
        if not sales_doc.exists:
            # No sales to process
            set_last_deduction_date(today)
            print(f"✅ No sales log for {yesterday}, marking as processed")
            return result
        
        sales_data = sales_doc.to_dict()
        items = sales_data.get("items", [])
        
        if not items:
            # Empty sales log
            set_last_deduction_date(today)
            return result
        
        # Step 4: Process each sale - subtract from inventory
        inventory_ref = db.collection("inventory")
        total_deducted = 0
        items_updated = 0
        
        for sale in items:
            batch_number = sale.get("batch_number")
            quantity_sold = sale.get("quantity_sold", 0)
            
            if not batch_number or quantity_sold <= 0:
                continue
            
            try:
                # Get current inventory item
                inv_doc = inventory_ref.document(batch_number).get()
                
                if not inv_doc.exists:
                    print(f"⚠️  Batch {batch_number} not found in inventory")
                    continue
                
                inv_data = inv_doc.to_dict()
                current_stock = inv_data.get("stock", 0)
                
                # Calculate new stock (prevent negative)
                new_stock = max(0, current_stock - quantity_sold)
                
                # Update inventory document
                inventory_ref.document(batch_number).update({
                    "stock": new_stock,
                    "last_stock_update": datetime.datetime.now(),
                    "last_sold_quantity": quantity_sold
                })
                
                total_deducted += quantity_sold
                items_updated += 1
                
                print(f"✓ {batch_number}: {current_stock} → {new_stock} " 
                      f"(sold {quantity_sold})")
            
            except Exception as e:
                print(f"❌ Error updating batch {batch_number}: {e}")
                continue
        
        # Step 5: Archive the sales log (move to history)
        # For now, we'll just clear it. In production, archive to 'sales_history'
        db.collection("daily_sales_log").document(yesterday).delete()
        
        # Step 6: Update metadata with deduction date
        set_last_deduction_date(today)
        
        # Step 7: Return result
        result["processed"] = True
        result["items_updated"] = items_updated
        result["total_units_deducted"] = total_deducted
        
        print(f"\n" + "="*60)
        print(f"🌙 MIDNIGHT DEDUCTION COMPLETE")
        print(f"Date: {yesterday}")
        print(f"Items Updated: {items_updated}")
        print(f"Total Units Deducted: {total_deducted}")
        print(f"="*60)
        
        return result
    
    except Exception as e:
        result["error"] = str(e)
        print(f"❌ Error processing midnight deductions: {e}")
        return result


# ============================================================================
# 4. REORDER ALERTS & DISMISSAL
# ============================================================================

def get_reorder_alert_items() -> List[Dict[str, Any]]:
    """
    Query inventory collection for items needing reorder.
    
    Criteria:
    - stock <= 0 (out of stock)
    - reorder_dismissed == False (not manually dismissed)
    
    Returns:
        List of items that need reordering, sorted by stock level (lowest first)
    """
    db = get_firestore_client()
    
    try:
        # Query: stock <= 0 AND reorder_dismissed == False
        query = db.collection("inventory") \
            .where("stock", "<=", 0) \
            .where("reorder_dismissed", "==", False) \
            .stream()
        
        items = []
        for doc in query:
            data = doc.to_dict()
            items.append({
                "batch_number": doc.id,
                "product_name": data.get("product_name", "Unknown"),
                "stock": data.get("stock", 0),
                "category": data.get("category", "Unknown"),
                "expiry": data.get("expiry_date", "N/A"),
                "last_updated": data.get("last_stock_update", "N/A")
            })
        
        # Sort by stock (lowest first)
        return sorted(items, key=lambda x: x["stock"])
    
    except Exception as e:
        print(f"❌ Error fetching reorder alerts: {e}")
        return []


def dismiss_reorder_alert(batch_number: str) -> bool:
    """
    Dismiss a reorder alert by setting reorder_dismissed = True.
    Called when pharmacist clicks "Dismiss" or "Close" button.
    
    Args:
        batch_number: Batch number (Firestore document ID)
    
    Returns:
        True if successful, False otherwise
    """
    db = get_firestore_client()
    
    try:
        db.collection("inventory").document(batch_number).update({
            "reorder_dismissed": True,
            "reorder_dismissed_at": datetime.datetime.now()
        })
        
        print(f"✅ Reorder alert dismissed for batch {batch_number}")
        return True
    
    except Exception as e:
        print(f"❌ Error dismissing reorder alert: {e}")
        return False


def restore_reorder_alert(batch_number: str) -> bool:
    """
    Restore a dismissed reorder alert by setting reorder_dismissed = False.
    Useful if items are somehow back in stock and need to be re-alerted.
    
    Args:
        batch_number: Batch number (Firestore document ID)
    
    Returns:
        True if successful, False otherwise
    """
    db = get_firestore_client()
    
    try:
        db.collection("inventory").document(batch_number).update({
            "reorder_dismissed": False
        })
        
        print(f"✅ Reorder alert restored for batch {batch_number}")
        return True
    
    except Exception as e:
        print(f"❌ Error restoring reorder alert: {e}")
        return False


# ============================================================================
# 5. INVENTORY STATISTICS & ANALYTICS
# ============================================================================

def get_low_stock_items(threshold: int = 10) -> List[Dict[str, Any]]:
    """
    Get items with stock below a certain threshold (but not out of stock).
    Useful for monitoring stock levels.
    
    Args:
        threshold: Stock level threshold (default: 10 units)
    
    Returns:
        List of items with stock below threshold, sorted by stock level
    """
    db = get_firestore_client()
    
    try:
        # Query: stock > 0 AND stock <= threshold
        query = db.collection("inventory") \
            .where("stock", ">", 0) \
            .where("stock", "<=", threshold) \
            .stream()
        
        items = []
        for doc in query:
            data = doc.to_dict()
            items.append({
                "batch_number": doc.id,
                "product_name": data.get("product_name", "Unknown"),
                "stock": data.get("stock", 0),
                "alert_level": "⚠️  Low Stock"
            })
        
        return sorted(items, key=lambda x: x["stock"])
    
    except Exception as e:
        print(f"❌ Error fetching low stock items: {e}")
        return []


def get_inventory_summary() -> Dict[str, Any]:
    """
    Get overall inventory statistics.
    
    Returns:
        Dict with:
        {
            'total_items': int (number of unique products),
            'total_stock': int (total units in inventory),
            'out_of_stock_count': int (items with stock <= 0),
            'low_stock_count': int (items with 0 < stock <= 10),
            'reorder_alerts_count': int (non-dismissed out of stock items)
        }
    """
    db = get_firestore_client()
    
    try:
        docs = db.collection("inventory").stream()
        
        total_items = 0
        total_stock = 0
        out_of_stock = 0
        low_stock = 0
        reorder_alerts = 0
        
        for doc in docs:
            data = doc.to_dict()
            stock = data.get("stock", 0)
            dismissed = data.get("reorder_dismissed", False)
            
            total_items += 1
            total_stock += stock
            
            if stock <= 0:
                out_of_stock += 1
                if not dismissed:
                    reorder_alerts += 1
            elif 0 < stock <= 10:
                low_stock += 1
        
        return {
            "total_items": total_items,
            "total_stock": total_stock,
            "out_of_stock_count": out_of_stock,
            "low_stock_count": low_stock,
            "reorder_alerts_count": reorder_alerts
        }
    
    except Exception as e:
        print(f"❌ Error getting inventory summary: {e}")
        return {
            "total_items": 0,
            "total_stock": 0,
            "out_of_stock_count": 0,
            "low_stock_count": 0,
            "reorder_alerts_count": 0
        }


if __name__ == "__main__":
    # Test functions
    print("🔧 Testing Database Functions\n")
    
    ensure_inventory_schema()
    ensure_daily_sales_log_exists()
    
    print("\n📦 Inventory Items:")
    items = get_all_inventory_items()
    for item in items[:5]:
        print(f"  - {item['display_text']}")
    
    print("\n📊 Inventory Summary:")
    summary = get_inventory_summary()
    print(f"  Total Items: {summary['total_items']}")
    print(f"  Total Stock: {summary['total_stock']}")
    print(f"  Out of Stock: {summary['out_of_stock_count']}")
    print(f"  Reorder Alerts: {summary['reorder_alerts_count']}")
    
    print("\n✅ Database functions loaded successfully")
