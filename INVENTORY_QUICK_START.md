# ⚡ Quick Start Guide - Daily Inventory & Sales Tracking

Get the Daily Inventory & Sales Tracking module running in 5 minutes.

---

## 30-Second Setup

```bash
# 1. Copy files to your project
cp inventory_sales_tracking.py ~/AgenticAI/
cp inventory_sales_ui.py ~/AgenticAI/

# 2. Add to main.py (see example below)
# 3. Run Streamlit
streamlit run main.py

# 4. Start logging sales in the "Log Daily Sales" tab
```

---

## Minimal main.py Integration

```python
import streamlit as st

# 1. ADD IMPORTS
import inventory_sales_tracking as ist
from inventory_sales_ui import init_session_state, tab_log_daily_sales, tab_reorder_alerts, tab_inventory_dashboard

# 2. PAGE CONFIG
st.set_page_config(page_title="Agentic Pharmacy", layout="wide")

# 3. DATABASE INIT (Run once to set up Firestore)
ist.ensure_inventory_schema()
ist.ensure_daily_sales_log_exists()

# 4. AUTO-DEDUCTION (Runs once daily - lazy evaluation)
ist.process_midnight_deductions()

# 5. SESSION STATE
init_session_state()

# 6. UI TABS
st.title("🏥 Agentic Pharmacy")
tab1, tab2, tab3 = st.tabs(["📝 Sales", "🚨 Alerts", "📊 Dashboard"])

with tab1:
    tab_log_daily_sales()
with tab2:
    tab_reorder_alerts()
with tab3:
    tab_inventory_dashboard()
```

Done! ✅

---

## First Time Setup Checklist

### ✅ Run These Commands Once

```bash
# 1. Verify Python syntax
python -m py_compile inventory_sales_tracking.py inventory_sales_ui.py

# 2. Test imports work
python -c "import inventory_sales_tracking; print('✅ Imports OK')"

# 3. Check Firebase credentials
python -c "import firebase_admin; print('✅ Firebase OK')"
```

### ✅ Verify Firestore Collections

Open Firebase Console:
1. Go to your Firestore database
2. Look for these collections:
   - `inventory` ← Should exist (populated from existing data)
   - `daily_sales_log` ← Empty (created on first run)
   - `_metadata` → `inventory_deductions` ← Metadata tracking

### ✅ Test Each Feature

| Feature | How to Test | Expected Result |
|---------|-------------|-----------------|
| **Log Daily Sales** | Add an entry via UI | Appears in table, entry in Firestore |
| **Midnight Deduction** | Call `ist.process_midnight_deductions()` | Yesterday's sales subtracted from inventory |
| **Reorder Alerts** | Set an item's stock to 0 | Appears in Alerts tab |
| **Dismiss Alert** | Click Dismiss button | Item disappears from Alerts (for that day) |

---

## Common First-Run Issues

### ❌ "ModuleNotFoundError: No module named 'inventory_sales_tracking'"

**Fix:** Make sure files are in the same directory as main.py
```
AgenticAI/
  main.py
  inventory_sales_tracking.py  ← Must be here
  inventory_sales_ui.py         ← Must be here
```

### ❌ "KeyError: 'stock'" or "KeyError: 'reorder_dismissed'"

**Fix:** Run initialization in main.py:
```python
ist.ensure_inventory_schema()  # Adds missing fields to inventory docs
```

### ❌ "Collection 'daily_sales_log' not found"

**Fix:** Initialize it:
```python
ist.ensure_daily_sales_log_exists()  # Creates collection
```

### ❌ "FirebaseApp not initialized"

**Fix:** Make sure `firebase_key.json` exists with valid credentials

---

## Testing API Functions Directly

Test database functions without Streamlit:

```python
import inventory_sales_tracking as ist

# 1. Get all inventory items
items = ist.get_all_inventory_items()
print(f"Found {len(items)} items")

# 2. Get today's sales log
sales = ist.get_today_sales_log()
print(f"Today's sales: {len(sales)} entries")

# 3. Get low stock items
low = ist.get_low_stock_items(threshold=10)
print(f"Low stock: {len(low)} items")

# 4. Get reorder alerts
alerts = ist.get_reorder_alert_items()
print(f"Reorder alerts: {len(alerts)} items")

# 5. Check midnight deduction status
status = ist.process_midnight_deductions()
print(f"Deduction result: {status}")
```

---

## Testing UI Components Directly

Test Streamlit components in isolation:

```bash
# Run UI module directly
streamlit run inventory_sales_ui.py

# Should show all 3 tabs with sample data from Firestore
```

---

## Database Schema Quick Reference

### Add a New Product to Inventory

```python
import inventory_sales_tracking as ist
from firebase_admin import firestore

db = ist.get_firestore_client()
db.collection('inventory').document('NEW_BATCH_123').set({
    'product_name': 'Ibuprofen',
    'stock': 100,
    'reorder_dismissed': False,
    'category': 'Tablet',
    'expiry_date': '2027-12-31'
})
```

### Query Current Stock

```python
import inventory_sales_tracking as ist

items = ist.get_all_inventory_items()
for item in items:
    print(f"{item['product_name']}: {item['stock']} units")
```

### Manually Trigger Midnight Deduction

```python
import inventory_sales_tracking as ist

result = ist.process_midnight_deductions()
print(f"✅ Processed: {result['processed']}")
print(f"📊 Items updated: {result['items_updated']}")
print(f"📦 Total units deducted: {result['total_units_deducted']}")
```

---

## Performance Tips

### 1. Cache Inventory Items

```python
# Instead of calling get_all_inventory_items() every render:
if "inventory_cache" not in st.session_state:
    st.session_state.inventory_cache = ist.get_all_inventory_items()

items = st.session_state.inventory_cache
```

### 2. Batch Update Operations

```python
# Don't: Update 10 items one by one (10 Firestore calls)
# Do: Use batch transactions (1 call)

# Coming in next feature release
```

### 3. Pagination for Large Lists

```python
# For inventory with 1000+ items:
page_size = 50
all_items = ist.get_all_inventory_items()
paginated = all_items[0:page_size]

# Show pagination controls to load next page
```

---

## Monitoring & Debugging

### Enable Debug Logging

```python
import logging
logging.basicConfig(
    level=logging.DEBUG,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)

# Now run your app
streamlit run main.py
```

### Check Firestore Activity

```bash
# Terminal 1: Run app and monitor
streamlit run main.py

# Terminal 2: Watch Firestore documents
# Go to Firebase Console > Firestore Database > Collections
# Refresh and watch real-time changes
```

### Verify Midnight Deduction Ran

```python
import inventory_sales_tracking as ist

last_date = ist.get_last_deduction_date()
print(f"Last deduction: {last_date}")

# Should be today's date if already ran
# Should be yesterday's date if not yet ran today
```

---

## Troubleshooting Guide

| Problem | Diagnosis | Solution |
|---------|-----------|----------|
| Sales not appearing in table | Check daily_sales_log added correctly | Call `ist.get_today_sales_log()` to verify |
| Stock not decreasing at midnight | Check if `process_midnight_deductions()` was called | Run manually: `ist.process_midnight_deductions()` |
| Alerts showing wrong count | Query conditions might be wrong | Check stock <= 0 AND reorder_dismissed == False |
| Data editor not updating | Session state issue | Clear cache: `st.session_state.clear()` |
| Firestore write errors | Permission issue | Check Firebase credentials have write access |

---

## Next Steps

1. **Integrate** → Add to main.py (5 minutes)
2. **Test** → Log a few sales, check Firestore (5 minutes)
3. **Train** → Show pharmacists how to use (10 minutes)
4. **Monitor** → Watch first midnight deduction (24 hours)
5. **Improve** → Gather feedback and enhance

---

## Support

For detailed documentation, see: **INVENTORY_TRACKING_GUIDE.md**

For database function reference, see: **inventory_sales_tracking.py** (inline docstrings)

For UI component reference, see: **inventory_sales_ui.py** (inline docstrings)

---

**You're all set! 🎉**

Your pharmacy now has:
- ✅ Real-time sales logging
- ✅ Automatic inventory deduction
- ✅ Out-of-stock alerts
- ✅ Production-grade database

Start logging sales now! 📝
