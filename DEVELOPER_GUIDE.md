# Developer Guide - User-Scoped Firebase Implementation

## Quick Start

### For Backend Developers

When creating new database functions:

```python
# ✅ CORRECT - Always include user_id parameter
def my_new_function(param1: str, user_id: str = "legacy"):
    collection_path = _user_collection(user_id, "my_collection")
    docs = db.collection(collection_path).stream()
    # ... rest of logic

# ❌ WRONG - Missing user_id parameter
def my_new_function(param1: str):
    docs = db.collection("my_collection").stream()  # Global collection!
```

When creating new API endpoints:

```python
# ✅ CORRECT - Extract user_id and pass to database
@app.get("/api/my-endpoint")
def my_endpoint(request: Request):
    user_id = get_user_id_from_token(request)
    data = database.my_function(user_id=user_id)
    return {"data": data}

# ❌ WRONG - Missing user_id extraction
@app.get("/api/my-endpoint")
def my_endpoint():
    data = database.my_function()  # Uses legacy/global!
    return {"data": data}
```

### For Frontend Developers

When making API calls:

```typescript
// ✅ CORRECT - Use authenticatedFetch
import { authenticatedFetch } from '../utils/api';

const fetchData = async () => {
  const res = await authenticatedFetch('/api/my-endpoint');
  const data = await res.json();
  return data;
};

// ❌ WRONG - Plain fetch doesn't send auth token
const fetchData = async () => {
  const res = await fetch('/api/my-endpoint');  // No auth!
  const data = await res.json();
  return data;
};
```

## Architecture Overview

### Data Flow

```
┌─────────────────────────────────────────────────────────────┐
│                         Frontend                             │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  User logs in → Firebase Auth → Gets JWT token       │  │
│  └──────────────────────────────────────────────────────┘  │
│                            ↓                                 │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  authenticatedFetch() adds token to headers          │  │
│  │  Authorization: Bearer {token}                        │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                         Backend                              │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  get_user_id_from_token() extracts user_id          │  │
│  │  from JWT token                                       │  │
│  └──────────────────────────────────────────────────────┘  │
│                            ↓                                 │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  Database functions use user_id to scope             │  │
│  │  collections: users/{user_id}/{collection}           │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                      Firestore                               │
│  users/                                                      │
│    user_123/                                                 │
│      batches/        ← User 123's inventory                 │
│      sales_log/      ← User 123's sales                     │
│    user_456/                                                 │
│      batches/        ← User 456's inventory                 │
│      sales_log/      ← User 456's sales                     │
└─────────────────────────────────────────────────────────────┘
```

## Common Patterns

### Pattern 1: Adding a New Collection

**Backend (database.py):**
```python
def get_my_collection(user_id: str = "legacy") -> list[dict]:
    """Fetch items from my_collection for a specific user."""
    if MOCK_MODE:
        return []
    
    collection_path = _user_collection(user_id, "my_collection")
    docs = db.collection(collection_path).stream()
    
    return [{**doc.to_dict(), "doc_id": doc.id} for doc in docs]
```

**Backend (api.py):**
```python
@app.get("/api/my-collection")
def get_my_collection_endpoint(request: Request):
    try:
        user_id = get_user_id_from_token(request)
        items = database.get_my_collection(user_id)
        return {"items": items}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
```

**Frontend:**
```typescript
import { authenticatedFetch } from '../utils/api';

const fetchMyCollection = async () => {
  const res = await authenticatedFetch('/api/my-collection');
  const data = await res.json();
  return data.items;
};
```

### Pattern 2: Creating Items

**Backend (database.py):**
```python
def create_item(name: str, value: int, user_id: str = "legacy"):
    """Create a new item in user's collection."""
    if MOCK_MODE:
        return
    
    collection_path = _user_collection(user_id, "my_collection")
    db.collection(collection_path).add({
        "name": name,
        "value": value,
        "created_at": datetime.datetime.now().isoformat()
    })
```

**Backend (api.py):**
```python
class CreateItemRequest(BaseModel):
    name: str
    value: int

@app.post("/api/my-collection")
def create_item_endpoint(body: CreateItemRequest, request: Request):
    try:
        user_id = get_user_id_from_token(request)
        database.create_item(body.name, body.value, user_id)
        return {"ok": True}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
```

**Frontend:**
```typescript
const createItem = async (name: string, value: number) => {
  await authenticatedFetch('/api/my-collection', {
    method: 'POST',
    body: JSON.stringify({ name, value })
  });
};
```

### Pattern 3: Updating Items

**Backend (database.py):**
```python
def update_item(doc_id: str, new_value: int, user_id: str = "legacy"):
    """Update an item in user's collection."""
    if MOCK_MODE:
        return
    
    collection_path = _user_collection(user_id, "my_collection")
    db.collection(collection_path).document(doc_id).update({
        "value": new_value,
        "updated_at": datetime.datetime.now().isoformat()
    })
```

**Backend (api.py):**
```python
class UpdateItemRequest(BaseModel):
    new_value: int

@app.patch("/api/my-collection/{doc_id}")
def update_item_endpoint(doc_id: str, body: UpdateItemRequest, request: Request):
    try:
        user_id = get_user_id_from_token(request)
        database.update_item(doc_id, body.new_value, user_id)
        return {"ok": True}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
```

**Frontend:**
```typescript
const updateItem = async (docId: string, newValue: number) => {
  await authenticatedFetch(`/api/my-collection/${docId}`, {
    method: 'PATCH',
    body: JSON.stringify({ new_value: newValue })
  });
};
```

### Pattern 4: Deleting Items

**Backend (database.py):**
```python
def delete_item(doc_id: str, user_id: str = "legacy"):
    """Delete an item from user's collection."""
    if MOCK_MODE:
        return
    
    collection_path = _user_collection(user_id, "my_collection")
    db.collection(collection_path).document(doc_id).delete()
```

**Backend (api.py):**
```python
@app.delete("/api/my-collection/{doc_id}")
def delete_item_endpoint(doc_id: str, request: Request):
    try:
        user_id = get_user_id_from_token(request)
        database.delete_item(doc_id, user_id)
        return {"ok": True}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
```

**Frontend:**
```typescript
const deleteItem = async (docId: string) => {
  await authenticatedFetch(`/api/my-collection/${docId}`, {
    method: 'DELETE'
  });
};
```

## Helper Functions

### Backend: _user_collection()

```python
def _user_collection(user_id: str, collection_name: str) -> str:
    """
    Return a user-scoped collection path.
    
    Args:
        user_id: The user's Firebase Auth UID
        collection_name: The base collection name
    
    Returns:
        - "users/{user_id}/{collection_name}" for authenticated users
        - "{collection_name}" for legacy users
    """
    if not user_id or user_id == "legacy":
        return collection_name  # Global collection
    return f"users/{user_id}/{collection_name}"  # User-scoped
```

### Backend: get_user_id_from_token()

```python
def get_user_id_from_token(request: Request) -> str:
    """
    Extract user ID from Firebase Auth token in Authorization header.
    
    Args:
        request: FastAPI Request object
    
    Returns:
        - User's Firebase UID if token is valid
        - "legacy" if token is missing or invalid
    """
    if not FIREBASE_AUTH_AVAILABLE:
        return "legacy"
    
    auth_header = request.headers.get('Authorization', '')
    if not auth_header.startswith('Bearer '):
        return "legacy"
    
    token = auth_header.split('Bearer ')[1]
    try:
        decoded_token = firebase_auth.verify_id_token(token)
        return decoded_token['uid']
    except Exception as e:
        print(f"[WARN] Token verification failed: {e}")
        return "legacy"
```

### Frontend: authenticatedFetch()

```typescript
export async function authenticatedFetch(
  url: string, 
  options: RequestInit = {}
): Promise<Response> {
  const user = auth.currentUser;
  const token = user ? await user.getIdToken() : null;
  
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...options.headers,
  };
  
  // Add Authorization header if user is authenticated
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  
  return fetch(url, { ...options, headers });
}
```

## Testing

### Unit Testing Backend Functions

```python
def test_user_scoped_function():
    # Test with user_id
    result = database.get_inventory(user_id="test_user_123")
    assert isinstance(result, list)
    
    # Test with legacy
    result = database.get_inventory(user_id="legacy")
    assert isinstance(result, list)
```

### Integration Testing API Endpoints

```python
def test_api_with_auth():
    # Create mock token
    token = create_test_token(uid="test_user_123")
    
    # Make request with token
    response = client.get(
        "/api/inventory",
        headers={"Authorization": f"Bearer {token}"}
    )
    
    assert response.status_code == 200
    assert "items" in response.json()
```

### Frontend Testing

```typescript
// Mock authenticatedFetch in tests
jest.mock('../utils/api', () => ({
  authenticatedFetch: jest.fn()
}));

test('fetches user inventory', async () => {
  const mockData = { items: [{ id: '1', name: 'Test' }] };
  (authenticatedFetch as jest.Mock).mockResolvedValue({
    json: async () => mockData
  });
  
  const result = await fetchInventory();
  expect(result).toEqual(mockData.items);
});
```

## Troubleshooting

### Issue: "Token verification failed"

**Cause**: Invalid or expired Firebase Auth token

**Solution**:
1. Check if user is logged in: `auth.currentUser`
2. Token auto-refreshes, but may need manual refresh
3. Check Firebase console for auth issues
4. Verify Firebase Admin SDK is properly initialized

### Issue: "User sees other user's data"

**Cause**: Missing user_id parameter or not using authenticatedFetch

**Solution**:
1. Verify API endpoint extracts user_id
2. Verify database function accepts user_id
3. Verify frontend uses authenticatedFetch
4. Check browser network tab for Authorization header

### Issue: "Legacy users can't access data"

**Cause**: Legacy users should use global collections

**Solution**:
1. Verify `user_id == "legacy"` returns global collection path
2. Check if legacy login sets uid to "legacy"
3. Verify API falls back to "legacy" when no token

### Issue: "New users see old data"

**Cause**: Data not properly scoped or cached

**Solution**:
1. Clear browser cache and localStorage
2. Verify Firestore collections are user-scoped
3. Check if user_id is correctly extracted
4. Verify no global collection queries

## Best Practices

### ✅ DO

- Always include `user_id` parameter in database functions
- Always extract `user_id` in API endpoints
- Always use `authenticatedFetch()` in frontend
- Use `_user_collection()` helper for collection paths
- Default `user_id` to `"legacy"` for backward compatibility
- Handle missing/invalid tokens gracefully
- Log auth failures for debugging

### ❌ DON'T

- Don't use plain `fetch()` for API calls
- Don't hardcode collection paths
- Don't expose user_id in URLs or query params
- Don't trust client-provided user_id
- Don't skip token verification
- Don't log sensitive token data
- Don't create global collections for new features

## Migration Guide

### Migrating Existing Functions

**Before:**
```python
def get_items():
    docs = db.collection("items").stream()
    return [doc.to_dict() for doc in docs]
```

**After:**
```python
def get_items(user_id: str = "legacy"):
    collection_path = _user_collection(user_id, "items")
    docs = db.collection(collection_path).stream()
    return [doc.to_dict() for doc in docs]
```

### Migrating Existing Endpoints

**Before:**
```python
@app.get("/api/items")
def get_items_endpoint():
    items = database.get_items()
    return {"items": items}
```

**After:**
```python
@app.get("/api/items")
def get_items_endpoint(request: Request):
    user_id = get_user_id_from_token(request)
    items = database.get_items(user_id)
    return {"items": items}
```

### Migrating Frontend Code

**Before:**
```typescript
const fetchItems = async () => {
  const res = await fetch('/api/items');
  return await res.json();
};
```

**After:**
```typescript
import { authenticatedFetch } from '../utils/api';

const fetchItems = async () => {
  const res = await authenticatedFetch('/api/items');
  return await res.json();
};
```

## Resources

- [Firebase Auth Documentation](https://firebase.google.com/docs/auth)
- [Firestore Security Rules](https://firebase.google.com/docs/firestore/security/get-started)
- [FastAPI Request Object](https://fastapi.tiangolo.com/tutorial/request-directly/)
- [React Context API](https://react.dev/reference/react/useContext)

## Support

For questions or issues:
1. Check this guide first
2. Review implementation files
3. Check Firebase console for errors
4. Review browser console and network tab
5. Check backend logs for auth failures

---

**Last Updated**: April 25, 2026  
**Version**: 1.0.0
