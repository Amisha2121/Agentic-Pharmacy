# User-Scoped Data Implementation Guide

## Overview
This document explains how to implement user-scoped data in Firebase Firestore so each user has their own isolated data.

## Architecture

### Firestore Structure
```
users/
  {user_id}/
    batches/
      {doc_id}
    daily_sales_log/
      {doc_id}
    chat_sessions/
      {doc_id}
    archived_sales_log/
      {doc_id}
    quarantine/
      {doc_id}
```

## Implementation Steps

### 1. Backend Changes (database.py)

Already implemented:
- Added `_user_collection()` helper function
- Updated `delete_batch()`, `update_stock()`, `update_category()` to accept `user_id`
- Updated `get_inventory_with_stock()` and `set_stock()` to accept `user_id`

Still needed - Update these functions to accept `user_id` parameter:
- `insert_batch()`
- `get_inventory()`
- `insert_quarantine()`
- `get_quarantine()`
- `save_chat_session()`
- `list_chat_sessions()`
- `load_chat_session()`
- `delete_chat_session()`
- `get_todays_sales_log()`
- `get_sales_history()`
- `add_to_sales_log()`
- `update_sales_log_entry()`
- `delete_sales_log_entry()`
- `get_reorder_alerts()`
- `dismiss_reorder_alert()`
- `get_expired_items()`
- `dismiss_expiry_alert()`

### 2. API Changes (api.py)

Add middleware to extract user_id from Firebase Auth token:
```python
from firebase_admin import auth as firebase_auth

def get_user_id_from_token(request):
    """Extract user ID from Firebase Auth token in Authorization header."""
    auth_header = request.headers.get('Authorization', '')
    if not auth_header.startswith('Bearer '):
        return "legacy"  # Fallback for unauthenticated requests
    
    token = auth_header.split('Bearer ')[1]
    try:
        decoded_token = firebase_auth.verify_id_token(token)
        return decoded_token['uid']
    except:
        return "legacy"
```

Update all API endpoints to:
1. Extract user_id using the middleware
2. Pass user_id to all database functions

Example:
```python
@app.route('/api/inventory', methods=['GET'])
def get_inventory_api():
    user_id = get_user_id_from_token(request)
    items = database.get_inventory_with_stock(user_id)
    return jsonify({"items": items})
```

### 3. Frontend Changes

#### A. Update API calls to send Firebase Auth token

Create an API utility file (`frontend/src/app/utils/api.ts`):
```typescript
import { auth } from '../firebase';

export async function authenticatedFetch(url: string, options: RequestInit = {}) {
  const user = auth.currentUser;
  const token = user ? await user.getIdToken() : null;
  
  const headers = {
    ...options.headers,
    ...(token && { 'Authorization': `Bearer ${token}` }),
  };
  
  return fetch(url, { ...options, headers });
}
```

#### B. Replace all `fetch()` calls with `authenticatedFetch()`

Example in LiveInventory.tsx:
```typescript
import { authenticatedFetch } from '../utils/api';

const fetchInventory = async () => {
  const res = await authenticatedFetch('/api/inventory');
  const data = await res.json();
  setInventory(data.items ?? []);
};
```

### 4. Migration Strategy

For existing users with data in global collections:

```python
def migrate_user_data(user_id: str):
    """One-time migration to move data from global to user-scoped collections."""
    if MOCK_MODE:
        return
    
    collections_to_migrate = [
        "batches",
        "daily_sales_log",
        "chat_sessions",
        "archived_sales_log",
        "quarantine"
    ]
    
    for collection_name in collections_to_migrate:
        # Read from global collection
        docs = db.collection(collection_name).stream()
        
        # Write to user-scoped collection
        for doc in docs:
            user_collection = _user_collection(user_id, collection_name)
            db.collection(user_collection).document(doc.id).set(doc.to_dict())
```

## Benefits

1. **Data Isolation**: Each user sees only their own data
2. **Fresh Start**: New accounts start with empty collections
3. **Security**: Users cannot access other users' data
4. **Scalability**: Better Firestore performance with smaller collections

## Testing

1. Login with Account A → Add inventory items
2. Logout
3. Login with Account B → Should see empty inventory
4. Add different items for Account B
5. Switch back to Account A → Should see original items

## Rollout Plan

1. ✅ Add `_user_collection()` helper (DONE)
2. ✅ Update key functions with `user_id` parameter (PARTIAL)
3. ⏳ Update remaining database functions
4. ⏳ Add auth token middleware to API
5. ⏳ Create `authenticatedFetch()` utility
6. ⏳ Update all frontend API calls
7. ⏳ Test with multiple accounts
8. ⏳ Deploy and monitor

## Notes

- Legacy users (uid="legacy") will continue using global collections
- Firebase Auth tokens expire after 1 hour and are automatically refreshed
- Consider adding user_id index to Firestore for better query performance
