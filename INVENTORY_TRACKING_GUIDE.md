# 📦 Daily Inventory & Sales Tracking - Integration Guide

## Overview

This module adds a complete daily inventory and sales tracking system to your Agentic Pharmacy with 4 key features:

1. **Database Schema** - Firestore structure for inventory + daily sales
2. **Tab 1: Log Daily Sales** - Autocomplete search + editable table
3. **Midnight Auto-Deduction** - Automatic inventory updates at 12 AM
4. **Tab 2: Reorder Alerts** - Out-of-stock notifications

---

## Files Created

```
inventory_sales_tracking.py      ← Database functions (add to project)
inventory_sales_ui.py            ← Streamlit UI components (add to project)
INVENTORY_TRACKING_GUIDE.md      ← This file
```

---

## Installation & Setup

### Step 1: Copy Files to Your Project

```bash
# Copy the two Python modules to your AgenticAI project directory
cp inventory_sales_tracking.py /path/to/AgenticAI/
cp inventory_sales_ui.py /path/to/AgenticAI/
```

### Step 2: Database Initialization (One-time)

Add this to the very top of your `main.py` (before any Streamlit UI):

```python
import inventory_sales_tracking as ist

# Initialize Firestore schema (one-time setup)
ist.ensure_inventory_schema()          # Adds missing 'stock' & 'reorder_dismissed' fields
ist.ensure_daily_sales_log_exists()    # Creates 'daily_sales_log' collection
```

---

## Integration into main.py

### Full Integration Example

Here's how to add the inventory tracking tabs to your existing Streamlit app:

```python
# main.py

import streamlit as st
import inventory_sales_tracking as ist
from inventory_sales_ui import (
    init_session_state,
    tab_log_daily_sales,
    tab_reorder_alerts,
    tab_inventory_dashboard
)

# ============================================================================
# PAGE CONFIG
# ============================================================================

st.set_page_config(
    page_title="Agentic Pharmacy",
    page_icon="🏥",
    layout="wide"
)

# ============================================================================
# DATABASE INITIALIZATION (One-time)
# ============================================================================

ist.ensure_inventory_schema()
ist.ensure_daily_sales_log_exists()

# ============================================================================
# MIDNIGHT AUTO-DEDUCTION (Lazy Evaluation)
# ============================================================================
# This checks on every app reload if a new day has started
# If so, it processes yesterday's sales and updates inventory
ist.process_midnight_deductions()

# ============================================================================
# SESSION STATE
# ============================================================================

init_session_state()  # Initialize Streamlit session variables

# ============================================================================
# MAIN APP
# ============================================================================

st.title("🏥 Agentic Pharmacy Management")

# Create your existing tabs
tab1, tab2, tab3, tab4, tab5 = st.tabs([
    "📝 Log Daily Sales",        # NEW: Inventory Tracking
    "🚨 Reorder Alerts",         # NEW: Inventory Tracking
    "📊 Inventory Dashboard",    # NEW: Inventory Tracking
    "🏥 Clinical DDI Lookup",    # Your existing tabs...
    "📸 Vision Scanning"
])

with tab1:
    tab_log_daily_sales()

with tab2:
    tab_reorder_alerts()

with tab3:
    tab_inventory_dashboard()

with tab4:
    # Your existing code for clinical DDI
    pass

with tab5:
    # Your existing code for vision
    pass
```

---

## Feature Details

### 1. DATABASE SCHEMA

#### Firestore Structure

**Collection: `inventory`**
```
Document ID: [Batch Number]
Fields:
{
    "product_name": "Paracetamol",
    "stock": 60,                          ← NEW: Number of units
    "reorder_dismissed": false,           ← NEW: Dismiss reorder alerts
    "category": "Tablet",
    "expiry_date": "2026-11-30",
    "last_stock_update": timestamp,
    "last_sold_quantity": 5               ← Set by midnight deduction
}
```

**Collection: `daily_sales_log`**
```
Document ID: [YYYY-MM-DD]  ← One document per day
Fields:
{
    "date": "2026-03-09",
    "items": [
        {
            "batch_number": "ABC123",
            "product_name": "Paracetamol",
            "quantity_sold": 5,
            "timestamp": "2026-03-09T14:30:00",
            "doc_id": "ABC123_0"
        },
        {
            "batch_number": "XYZ789",
            "product_name": "Amoxicillin",
            "quantity_sold": 2,
            "timestamp": "2026-03-09T15:45:00",
            "doc_id": "XYZ789_1"
        }
    ],
    "last_updated": timestamp
}
```

**Collection: `_metadata` (Internal)**
```
Document ID: "inventory_deductions"
Fields:
{
    "last_deduction_date": "2026-03-09",      ← Tracks when midnight deduction ran
    "last_deduction_time": timestamp
}
```

---

### 2. TAB 1: LOG DAILY SALES

#### Feature Breakdown

**Search Bar (Autocomplete)**
```
Uses st.selectbox with display format:
"Paracetamol (Batch: ABC123) - Stock: 60"

Fetches all products from inventory collection
Sorted alphabetically by product name
```

**Quantity Input**
```
Number input with:
- Minimum: 1 unit
- Maximum: 9999 units
- Default: 1
```

**Add to Log Button**
```
On click:
1. Validate inputs
2. Add entry to daily_sales_log (Firestore)
3. Show success/error message
4. Clear the form for next entry
```

**Editable Table**
```
Uses st.data_editor() to display today's sales

REAL-TIME UPDATE FLOW:
1. Pharmacist edits quantity in table
2. Streamlit re-runs the script (detected via data_editor change)
3. Code compares old vs new quantity
4. If different, calls ist.update_sale_in_log()
5. Firebase updates immediately
6. Next rerun shows updated value

ADVANTAGES:
- No page refresh needed
- Intuitive inline editing
- Real-time Firebase sync
- Prevents data loss
```

**Session State Pattern**
```python
# How Streamlit session state works:

# 1. User edits table cell
# 2. Streamlit RERUNS entire script (fresh execution)
# 3. Variable st.session_state.today_sales_df is RESTORED from previous run
# 4. But ui elements (selectbox, data_editor, etc.) reflect NEW values

# This prevents infinite update loops:
if edited_df is not None and len(edited_df) == len(df_sales):
    for idx, row in edited_df.iterrows():
        original_qty = df_sales.iloc[idx]["Quantity"]
        new_qty = row["Quantity"]
        
        # Only update if changed (prevents re-saving same value)
        if original_qty != new_qty:
            ist.update_sale_in_log(idx, int(new_qty))
```

---

### 3. MIDNIGHT AUTO-DEDUCTION LOGIC

#### How It Works

**Example Flow:**
```
DAY 1 (March 9, 2026):
- Pharmacist logs 5 units of Paracetamol sold
- Stored in daily_sales_log document "2026-03-09"
- Main inventory NOT changed (still 60 units)

MIDNIGHT (Mar 9 → Mar 10):
- When first user loads app on March 10
- ist.process_midnight_deductions() runs
- Checks: Has this function run today (Mar 10)?
- No → Process yesterday's log (2026-03-09)
- Loop through all sales:
  - Paracetamol: 60 - 5 = 55 units (update inventory)
- Delete yesterday's sales log (clear for new day)
- Set last_deduction_date = "2026-03-10"
- On next app reload: Function sees last_deduction_date == today, skips

RESULT:
- Automatic, no manual intervention needed
- Happens at 12 AM when first user loads app
- Safe: Uses lazy evaluation (idempotent - won't double-process)
```

**Implementation Details**
```python
def process_midnight_deductions():
    """
    Lazy Evaluation Pattern:
    - Check if last_deduction_date < today
    - If YES: Process and update last_deduction_date
    - If NO: Skip (already processed today)
    
    This ensures:
    1. Only processes once per day
    2. Can be called repeatedly without harm
    3. Works even if app crashes at midnight
    4. First app load of new day triggers it
    """
    
    today = datetime.date.today().isoformat()
    last_deduction = get_last_deduction_date()
    
    if last_deduction == today:
        return  # Already processed, skip
    
    # Process yesterday's sales log
    # Update inventory
    # Clear sales log
    # Set last_deduction_date = today
```

---

### 4. TAB 2: REORDER ALERTS

#### Feature Breakdown

**Alert Query**
```
Firestore Query:
  WHERE stock <= 0
  AND reorder_dismissed == false

Only shows items actively needing reorder
Dismissed alerts hidden until stock restored
```

**Alert Summary**
```
4 Key Metrics:
- Reorder Alerts (count of items to order)
- Out of Stock (total out of stock items, including dismissed)
- Low Stock (0 < stock <= 10)
- Total Inventory (sum of all stock)
```

**Alert List**
```
For each item:
- Product name
- Batch number
- Current stock level
- Category
- Expiry date
- "Dismiss Alert" button

Card-like layout:
┌─────────────────────────────────────┐
│ Paracetamol                         │
│ Batch: ABC123                       │
│ Stock: 0 units  Category: Tablet    │
│ Expiry: 2026-11-30                  │
│                        [Dismiss ▶] │
└─────────────────────────────────────┘
```

**Dismiss Button**
```python
if st.button("👈 Dismiss Alert", key=f"dismiss_{batch}"):
    ist.dismiss_reorder_alert(batch_number)
    # Sets: reorder_dismissed = True
    # Result: Item disappears from Reorder Alerts tab
```

---

## Session State Explanation

Streamlit reruns the entire script on every user interaction. Here's how session state helps:

```python
# SESSION STATE BUFFER EXPLAINED

# Initial run:
st.session_state.today_sales_df = None

# First time user loads page:
# Script runs → Fetches sales from Firebase → Shows in table

# User edits table cell:
# 1. Streamlit detects change (data_editor output changed)
# 2. Script RERUNS from top
# 3. st.session_state still has OLD values (restored from previous run)
# 4. We compare: old value != new value
# 5. Update Firebase if different
# 6. Next rerun fetches fresh data

# This pattern:
# ✅ Prevents infinite loops (compare before update)
# ✅ Handles concurrent edits (last-write-wins)
# ✅ Provides real-time feedback (no page refresh)
# ✅ Ensures Firebase consistency (single source of truth)
```

---

## Code Comments & Patterns

### Pattern 1: Lazy Evaluation (Midnight Deduction)

```python
# Called on EVERY page load, but only executes once per day
def process_midnight_deductions():
    today = datetime.date.today().isoformat()
    last_deduction = get_last_deduction_date()
    
    # Idempotent: Safe to call multiple times
    if last_deduction == today:
        return  # Already processed today
    
    # Process if new day
    # ... actual logic ...
    set_last_deduction_date(today)
```

### Pattern 2: Real-time Table Updates

```python
# Detect changes in editable table
edited_df = st.data_editor(sales_df)

if edited_df is not None:
    for idx, row in edited_df.iterrows():
        if row["Quantity"] != sales_df.iloc[idx]["Quantity"]:
            # Changed! Update Firebase
            ist.update_sale_in_log(idx, row["Quantity"])
```

### Pattern 3: Session State Caching

```python
# Prevent unnecessary Firebase calls
if "today_sales_df" not in st.session_state:
    st.session_state.today_sales_df = ist.get_today_sales_log()

# Use cached data for display
df = st.session_state.today_sales_df
```

---

## Error Handling

All functions include try-except blocks:

```python
def add_sale_to_log(...):
    try:
        # Firebase operation
        doc_ref.set({...})
        return True
    except Exception as e:
        print(f"❌ Error: {e}")
        return False

# In Streamlit UI:
if success:
    st.success("✅ Done")
else:
    st.error("❌ Failed - Please try again")
```

---

## Testing & Debugging

### Test the Database Functions

```bash
# Run database functions directly
python inventory_sales_tracking.py

# Output:
# ✅ Inventory schema verification complete
# ✅ daily_sales_log collection verified
# 📦 Inventory Items:
#   - Paracetamol (Batch: ABC123) - Stock: 60
#   - Amoxicillin (Batch: DEF456) - Stock: 30
# 📊 Inventory Summary:
#   Total Items: 25
#   Total Stock: 1250
#   Out of Stock: 2
#   Reorder Alerts: 2
```

### Test the UI

```bash
# Run Streamlit UI
streamlit run inventory_sales_ui.py

# Should show all 3 tabs with sample data
```

### Debug Mode

Enable logging in your database.py:

```python
import logging
logging.basicConfig(level=logging.DEBUG)

# Now all Firestore queries will be logged
```

---

## Performance Considerations

### Data Fetching

```python
# Optimized: Single query for all items
items = ist.get_all_inventory_items()  # ~50-100ms

# Not recommended: Multiple queries in loop
for batch_id in batch_ids:
    item = ist.get_item(batch_id)      # ~50ms × N queries
```

### Real-time Updates

```python
# Streamlit reruns on every user interaction
# To minimize Firebase calls:

# ✅ Cache results
if "data" not in st.session_state:
    st.session_state.data = fetch_from_firebase()

# ✅ Batch updates
# Instead of: update_item(id1), update_item(id2), ...
# Use: batch_update([id1, id2, ...])
```

---

## Common Issues & Solutions

### Issue: Table not updating after edit

**Cause:** Data not refreshed from Firebase  
**Solution:** Clear session state after update
```python
st.session_state.today_sales_df = None
st.rerun()
```

### Issue: Midnight deduction not running

**Cause:** App not loaded at midnight  
**Solution:** It will run on first load after midnight (lazy evaluation)

### Issue: Firestore permission errors

**Cause:** Firebase credentials not set  
**Solution:** Ensure `firebase_key.json` exists and credentials are valid

---

## Advanced Customization

### Change Midnight Deduction Time

```python
# In inventory_sales_tracking.py
def should_process_deductions():
    now = datetime.datetime.now()
    
    # Current: Any time after midnight
    # Customize to specific hour (e.g., 2 AM):
    return now.hour >= 2 and last_deduction < today
```

### Add Email Notifications

```python
# After dismissing reorder alert
send_email_to_supplier(
    product=item["product_name"],
    batch=item["batch_number"],
    quantity_needed=item.get("reorder_qty", 100)
)
```

### Integrate with Existing Inventory Tab

If you already have an inventory page, merge with:

```python
# Instead of separate "Inventory Dashboard" tab
# Show this as a sidebar widget or collapsible section

with st.sidebar:
    st.subheader("📊 Inventory Health")
    summary = ist.get_inventory_summary()
    st.metric("Reorder Alerts", summary["reorder_alerts_count"])
```

---

## Summary Checklist

- [ ] Copy `inventory_sales_tracking.py` to project
- [ ] Copy `inventory_sales_ui.py` to project
- [ ] Add database initialization to `main.py`
- [ ] Add midnight deduction call to `main.py`
- [ ] Add session state initialization to `main.py`
- [ ] Add tabs to Streamlit tab structure
- [ ] Test with sample data
- [ ] Verify Firestore schema updates
- [ ] Test midnight deduction (or manually call function)
- [ ] Train pharmacists on UI usage

---

## Next Steps

1. **Integration:** Copy code to main.py following the example above
2. **Testing:** Test each feature with sample data
3. **Deployment:** Deploy to production
4. **Monitoring:** Watch first midnight deduction to ensure it works
5. **Feedback:** Gather feedback from pharmacists for improvements

---

**Status:** ✅ Ready for integration  
**Files:** 2 (inventory_sales_tracking.py, inventory_sales_ui.py)  
**Functions:** 20+ database + UI functions  
**Documentation:** Complete with examples
