# 🗄️ Database Schema Reference

Complete Firestore schema documentation for Daily Inventory & Sales Tracking module.

---

## Collections Overview

| Collection | Purpose | Document Structure | Created By |
|-----------|---------|-------------------|-----------|
| `inventory` | Main stock tracking | Batch number → Item details | `ensure_inventory_schema()` |
| `daily_sales_log` | Daily sales transactions | Date (YYYY-MM-DD) → Sales array | `ensure_daily_sales_log_exists()` |
| `_metadata` | System metadata | name → Settings | Auto-created |

---

## Collection: `inventory`

**Purpose:** Core inventory tracking database  
**Document ID:** Batch number (string, e.g., `"ABC123"`)  
**Usage:** Look up product details, stock levels, reorder status

### Document Structure

```json
{
  "batch_number": "ABC123",
  "product_name": "Paracetamol",
  "stock": 60,
  "reorder_dismissed": false,
  "category": "Tablet",
  "expiry_date": "2026-11-30",
  "last_stock_update": "2026-03-09T14:30:00",
  "last_sold_quantity": 5
}
```

### Field Definitions

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `batch_number` | String | ✅ | Unique batch ID, same as doc ID |
| `product_name` | String | ✅ | Human-readable product name |
| `stock` | Integer | ✅ | **NEW** Current quantity in stock |
| `reorder_dismissed` | Boolean | ✅ | **NEW** Alert dismissal flag |
| `category` | String | ❌ | Drug category (Tablet, Shot, etc.) |
| `expiry_date` | String (ISO) | ❌ | Format: YYYY-MM-DD |
| `last_stock_update` | Timestamp | ❌ | Timestamp of last inventory change |
| `last_sold_quantity` | Integer | ❌ | Set by midnight deduction process |

### Examples

#### Example 1: Low-Stock Item
```json
{
  "batch_number": "PARACETAMOL_001",
  "product_name": "Paracetamol 500mg",
  "stock": 2,
  "reorder_dismissed": false,
  "category": "Tablet",
  "expiry_date": "2026-06-30",
  "last_stock_update": "2026-03-09T10:15:00",
  "last_sold_quantity": 8
}
```

#### Example 2: Out-of-Stock with Dismissed Alert
```json
{
  "batch_number": "AMOXICILLIN_042",
  "product_name": "Amoxicillin 250mg",
  "stock": 0,
  "reorder_dismissed": true,
  "category": "Capsule",
  "expiry_date": "2025-12-31",
  "last_stock_update": "2026-03-08T16:45:00",
  "last_sold_quantity": 3
}
```

### Queries

**Get all items in stock**
```python
db.collection('inventory').where('stock', '>', 0).get()
```

**Get reorder alerts (out of stock, not dismissed)**
```python
db.collection('inventory')\
  .where('stock', '<=', 0)\
  .where('reorder_dismissed', '==', False).get()
```

**Get low stock items**
```python
db.collection('inventory')\
  .where('stock', '>', 0)\
  .where('stock', '<', 10).get()
```

**Get items expiring soon**
```python
db.collection('inventory')\
  .where('expiry_date', '<', '2026-06-30').get()
```

---

## Collection: `daily_sales_log`

**Purpose:** Temporary log of daily sales (deleted after midnight deduction)  
**Document ID:** Date string (YYYY-MM-DD, e.g., `"2026-03-09"`)  
**Usage:** Track what sold each day, used for midnight deduction calculation

### Document Structure

```json
{
  "date": "2026-03-09",
  "items": [
    {
      "batch_number": "ABC123",
      "product_name": "Paracetamol",
      "quantity_sold": 5,
      "timestamp": "2026-03-09T14:30:00Z",
      "doc_id": "ABC123_0"
    },
    {
      "batch_number": "XYZ789",
      "product_name": "Amoxicillin",
      "quantity_sold": 2,
      "timestamp": "2026-03-09T15:45:00Z",
      "doc_id": "XYZ789_1"
    }
  ],
  "last_updated": "2026-03-09T16:50:00Z"
}
```

### Field Definitions

**Top-level fields:**

| Field | Type | Notes |
|-------|------|-------|
| `date` | String | Document ID, format YYYY-MM-DD |
| `items` | Array | Array of sale items |
| `last_updated` | Timestamp | When document was last modified |

**Item object fields (inside `items` array):**

| Field | Type | Notes |
|-------|------|-------|
| `batch_number` | String | References `inventory` doc ID |
| `product_name` | String | Display name (denormalized for readability) |
| `quantity_sold` | Integer | Number of units sold |
| `timestamp` | String (ISO) | When sale was recorded |
| `doc_id` | String | Unique ID for this sale entry |

### Lifecycle

```
DURING DAY:
  daily_sales_log["2026-03-09"].items[]
  ↓ (Multiple sales added throughout day)
  
MIDNIGHT:
  process_midnight_deductions() reads document
  ↓ (For each item: inventory[batch].stock -= quantity_sold)
  
  Document deleted after processing
  ↓ (Clears data for new day)
  
NEXT DAY:
  New daily_sales_log["2026-03-10"] document created
```

### Example

**Morning (2026-03-09 08:00)**
```json
{
  "date": "2026-03-09",
  "items": [],
  "last_updated": "2026-03-09T08:00:00Z"
}
```

**After 3 sales (2026-03-09 17:00)**
```json
{
  "date": "2026-03-09",
  "items": [
    {
      "batch_number": "PARACETAMOL_001",
      "product_name": "Paracetamol 500mg",
      "quantity_sold": 5,
      "timestamp": "2026-03-09T09:30:00Z",
      "doc_id": "PARACETAMOL_001_0"
    },
    {
      "batch_number": "AMOXICILLIN_042",
      "product_name": "Amoxicillin 250mg",
      "quantity_sold": 2,
      "timestamp": "2026-03-09T14:15:00Z",
      "doc_id": "AMOXICILLIN_042_1"
    },
    {
      "batch_number": "IBUPROFEN_067",
      "product_name": "Ibuprofen 400mg",
      "quantity_sold": 8,
      "timestamp": "2026-03-09T16:45:00Z",
      "doc_id": "IBUPROFEN_067_2"
    }
  ],
  "last_updated": "2026-03-09T16:50:00Z"
}
```

**After Midnight (Document deleted)**
```
No document for "2026-03-09" exists
New document created: "2026-03-10"
```

### Queries

**Get today's sales**
```python
today = datetime.date.today().isoformat()
doc = db.collection('daily_sales_log').document(today).get()
if doc.exists:
    items = doc.get('items')
```

**Get sales for specific date**
```python
doc = db.collection('daily_sales_log').document('2026-03-09').get()
items = doc.get('items')
```

**Calculate total sales for day**
```python
items = doc.get('items')
total_sold = sum(item['quantity_sold'] for item in items)
unique_products = len(set(item['batch_number'] for item in items))
```

---

## Collection: `_metadata`

**Purpose:** System metadata and tracking information  
**Document ID:** `"inventory_deductions"` (metadata tracker)

### Document Structure

```json
{
  "last_deduction_date": "2026-03-09",
  "last_deduction_time": "2026-03-10T00:00:15Z"
}
```

### Field Definitions

| Field | Type | Purpose |
|-------|------|---------|
| `last_deduction_date` | String (YYYY-MM-DD) | Date of last midnight deduction |
| `last_deduction_time` | Timestamp | Exact time deduction completed |

### Usage

**Lazy Evaluation Check**
```python
last_deduction = get_last_deduction_date()  # Returns "2026-03-09"
today = datetime.date.today().isoformat()  # Returns "2026-03-10"

if last_deduction < today:
    # Run midnight deduction
    process_midnight_deductions()
```

### Update Frequency

Updated once per day at midnight (or whenever `process_midnight_deductions()` runs).

---

## Data Relationships

```
inventory (Parent)
│
├─── Fields: product_name, stock, reorder_dismissed, category, expiry_date
│
└─── Referenced by:
      daily_sales_log[items[].batch_number]
      _metadata.inventory_deductions (indirectly)

daily_sales_log (Temporary)
│
├─── Items: Array of sales
│
└─── References:
      inventory (batch_number field)
      
_metadata (Config)
│
└─── Tracks: Last deduction date (for lazy evaluation)
```

---

## Midnight Deduction Process

### Before Midnight
```
inventory:
  PARACETAMOL_001:
    product_name: "Paracetamol"
    stock: 60

daily_sales_log["2026-03-09"]:
  items:
    - batch_number: "PARACETAMOL_001"
      quantity_sold: 5
```

### After Midnight
```
inventory:
  PARACETAMOL_001:
    product_name: "Paracetamol"
    stock: 55        ← Updated (60 - 5)

daily_sales_log["2026-03-09"]:
  [DELETED]          ← Cleared

daily_sales_log["2026-03-10"]:
  items: []          ← New empty document created

_metadata.inventory_deductions:
  last_deduction_date: "2026-03-10"
```

---

## Schema Evolution

### Fields Added (Phase 4)

**To `inventory` collection:**
- `stock` (Integer) - Tracks current quantity
- `reorder_dismissed` (Boolean) - Allows dismissing alerts

**New Collections:**
- `daily_sales_log` - Sales transaction log
- `_metadata` (if not exists) - System tracking

### Backward Compatibility

```python
# ensure_inventory_schema() adds missing fields to existing documents
def ensure_inventory_schema():
    # For each doc in 'inventory':
    if 'stock' not in doc:
        doc['stock'] = 0
    if 'reorder_dismissed' not in doc:
        doc['reorder_dismissed'] = False
```

---

## Indexing & Performance

### Recommended Indexes

Create these composite indexes in Firestore Console for best performance:

**Index 1: Reorder Alerts Query**
```
Collection: inventory
Fields: 
  - stock (Ascending)
  - reorder_dismissed (Ascending)
```

**Index 2: Low Stock Query**
```
Collection: inventory
Fields:
  - stock (Ascending)
  - stock (Descending)  [for range queries]
```

**Index 3: Expiry Date**
```
Collection: inventory
Fields:
  - expiry_date (Ascending)
```

### Without Indexes
- Simple queries (single field): ⚡ Fast
- Complex queries (2+ fields): ⚠️ May require index creation

Firestore will prompt you to create indexes automatically if needed.

---

## Backup & Recovery

### Backup Strategy

**Daily Backup:**
```python
# Export daily_sales_log before midnight deduction
backup = db.collection('daily_sales_log').get()
# Save to: sales_archive/2026-03-09.json
```

**Manual Backup:**
```bash
# Use Firebase Console or CLI
gcloud firestore export gs://my-bucket/backup-$(date +%Y%m%d)
```

### Recovery

**Restore Inventory After Accidental Deduction:**
```python
# If deduction ran twice by mistake
original_stock = 55
extra_deducted = 5
corrected_stock = original_stock + extra_deducted  # 60

db.collection('inventory').document('PARACETAMOL_001').update({
    'stock': corrected_stock
})
```

---

## Migration Guide

### From Old Schema (No Stock Tracking)

If you have existing inventory without `stock` and `reorder_dismissed` fields:

```python
def migrate_to_new_schema():
    """Update all inventory docs with new fields"""
    docs = db.collection('inventory').stream()
    batch = db.batch()
    
    for doc in docs:
        if 'stock' not in doc:
            batch.update(doc.reference, {
                'stock': 100,  # Default value
                'reorder_dismissed': False
            })
    
    batch.commit()
    print("✅ Migration complete")

# Run once
migrate_to_new_schema()
```

---

## Size Limits

- **Document Size:** Max 1 MB per document
- **Daily Sales Log:** ~50 sales/day = ~5 KB document (plenty of room)
- **Inventory Item:** ~500 bytes per document (accommodates future fields)
- **Total Inventory:** 10,000 items = ~5 MB (well under Firestore limit)

---

## Cost Optimization

### Reads
- `get_all_inventory_items()`: 1 read (returns all docs in 1 query)
- `get_today_sales_log()`: 1 read (single document)
- Filtered queries: 1 read per matching document

### Writes
- `add_sale_to_log()`: 1 write per sale
- `process_midnight_deductions()`: N writes (N = items sold) + 1 delete
- `dismiss_reorder_alert()`: 1 write per item

### Estimated Monthly Cost
```
Assuming: 50 sales/day, 30 days/month
Reads: 50,000 (sales log) + 1,000 (queries) = 51,000
Writes: 1,500 (sales) + 1,500 (deductions) + 100 (dismissals) = 3,100
Deletes: 30 (daily logs)

Free tier: 50,000 reads/month ✅ (within limit)
Cost: $0 (you're within Firebase free tier)
```

---

## Future Extensions

### Planned Fields (Not Yet Implemented)

```json
{
  // Reorder management
  "reorder_quantity": 100,
  "reorder_threshold": 10,
  "supplier_id": "SUPPLIER_001",
  "last_reorder_date": "2026-03-01",
  
  // Pricing
  "cost_per_unit": 5.50,
  "selling_price": 8.99,
  "profit_margin": 0.635,
  
  // Tracking
  "manufactured_date": "2025-09-15",
  "lot_number": "LOT123",
  "storage_location": "Shelf A3",
  
  // History
  "stock_history": [
    { "date": "2026-03-09", "quantity": 65 },
    { "date": "2026-03-08", "quantity": 70 }
  ]
}
```

### New Collections (Future)

**`sales_archive` - Historical sales data**
```
documents: "2026-03-09", "2026-03-08", ...
purpose: Keep daily_sales_log clean, archive for analytics
```

**`reorder_history` - Track reorder requests**
```
documents: individual reorder requests
fields: item, quantity_needed, requested_by, date, status
```

**`inventory_transactions` - Audit trail**
```
documents: one per transaction
fields: batch_number, action, old_value, new_value, changed_by, timestamp
```

---

## Troubleshooting

### ❌ Document Not Found

**Symptom:** `daily_sales_log["2026-03-09"]` returns null  
**Cause:** Date format issue or document doesn't exist  
**Fix:** Ensure date is YYYY-MM-DD format (not YYYY/MM/DD)

### ❌ Query Returns Empty

**Symptom:** Reorder alerts query returns 0 items  
**Cause:** Missing index or wrong field names  
**Fix:** Check field names match exactly (`reorder_dismissed`, not `dismissed`)

### ❌ Stock Goes Negative

**Symptom:** Inventory shows -5 units  
**Cause:** Sales > inventory before deduction  
**Fix:** Add validation in UI before accepting sale

---

## Summary

| Aspect | Details |
|--------|---------|
| **Total Collections** | 3 collections + sub-documents |
| **Total Documents** | ~1 + items in inventory + 1 per day |
| **Fields per Item** | ~8 fields |
| **Average Doc Size** | 500 bytes |
| **Update Frequency** | Real-time (hourly sales) + once daily (midnight) |
| **Typical Queries** | 1-2 per page load |
| **Monthly Cost** | $0 (within free tier) |

---

**Last Updated:** 2026-03-09  
**Version:** 1.0 (Production)  
**Status:** ✅ Complete
