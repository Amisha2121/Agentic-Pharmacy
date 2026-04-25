# 🔧 Troubleshooting Guide - User Account Not Syncing

## Quick Diagnosis

### Step 1: Check if Backend Server is Running with New Code

**Problem**: Backend server needs to be restarted to pick up the changes.

**Solution**:
```bash
# Stop the current backend server (Ctrl+C)
# Then restart it:
python api.py
```

**Expected Output**:
```
[OK] Firebase initialized successfully -- LIVE mode.
INFO:     Started server process
INFO:     Uvicorn running on http://0.0.0.0:8000
```

### Step 2: Check if Frontend is Using New Code

**Problem**: Frontend might be using cached code.

**Solution**:
```bash
# In the frontend directory:
cd frontend

# Stop the dev server (Ctrl+C)
# Clear cache and restart:
rm -rf node_modules/.vite
npm run dev
```

**Then in browser**:
- Hard refresh: `Ctrl+Shift+R` (Windows/Linux) or `Cmd+Shift+R` (Mac)
- Or clear browser cache completely

### Step 3: Verify You're Logged In

**Problem**: User might not be authenticated.

**Solution**:

1. Open browser console (F12)
2. Run this command:
```javascript
window.debugAuth()
```

**Expected Output**:
```
✅ User logged in:
  UID: abc123...
  Email: your@email.com
  Display Name: Your Name
  Token (first 50 chars): eyJhbGciOiJSUzI1NiIsImtpZCI6...
  API Test Response: 200 OK
  Items count: 0
```

**If you see "❌ No user logged in"**:
- Logout and login again
- Check if Firebase Auth is configured correctly

### Step 4: Check Network Requests

**Problem**: Authorization header might not be sent.

**Solution**:

1. Open browser DevTools (F12)
2. Go to Network tab
3. Refresh the page
4. Click on any API request (e.g., `/api/inventory`)
5. Check Request Headers

**Expected Headers**:
```
Authorization: Bearer eyJhbGciOiJSUzI1NiIsImtpZCI6...
Content-Type: application/json
```

**If Authorization header is missing**:
- Frontend is not using `authenticatedFetch()`
- Check console for errors
- Verify imports are correct

### Step 5: Check Backend Logs

**Problem**: Backend might be rejecting tokens or not extracting user_id.

**Solution**:

Look at the terminal where `python api.py` is running.

**Expected Logs** (when request comes in):
```
INFO:     127.0.0.1:xxxxx - "GET /api/inventory HTTP/1.1" 200 OK
```

**If you see warnings**:
```
[WARN] Token verification failed: ...
```
This means Firebase Admin SDK can't verify the token.

**Possible causes**:
- Firebase credentials not configured
- Token is from different Firebase project
- Token is expired (should auto-refresh)

### Step 6: Test Backend Directly

**Problem**: Need to verify backend is working.

**Solution**:

Run the test script:
```bash
python test_auth_backend.py
```

**Expected Output**:
```
============================================================
Testing User-Scoped Data Implementation
============================================================

1. Testing _user_collection helper:
   Legacy path: batches
   User path: users/test_user_123/batches
   ✅ _user_collection works correctly

2. Testing database functions accept user_id:
   ✅ get_inventory accepts user_id
   ✅ get_inventory_with_stock accepts user_id
   ...

3. Testing function calls with user_id:
   ✅ get_inventory_with_stock(user_id='test_user_123') returned: <class 'list'>
   ✅ get_inventory_with_stock(user_id='legacy') returned: <class 'list'>

4. Checking Firebase status:
   Mock Mode: False
   ✅ Firebase is connected (LIVE mode)
```

## Common Issues and Solutions

### Issue 1: "Still seeing old data from different account"

**Cause**: Browser cache or localStorage

**Solution**:
```javascript
// In browser console:
localStorage.clear();
sessionStorage.clear();
location.reload();
```

Then logout and login again.

### Issue 2: "Empty inventory but I added items"

**Cause**: Items were added to legacy/global collection, not user-scoped

**Solution**:

Check Firestore console:
1. Go to Firebase Console → Firestore Database
2. Look for your data in two places:
   - Global: `batches/` collection (old data)
   - User-scoped: `users/{your_uid}/batches/` (new data)

If data is in global collection:
- It was added before the update
- You need to re-add items after logging in with new code

### Issue 3: "Authorization header not being sent"

**Cause**: Frontend not using `authenticatedFetch()`

**Solution**:

Check if imports are correct:
```typescript
// ✅ CORRECT
import { authenticatedFetch } from '../utils/api';
const res = await authenticatedFetch('/api/inventory');

// ❌ WRONG
const res = await fetch('/api/inventory');
```

Search for plain fetch calls:
```bash
cd frontend/src
grep -r "await fetch(" --include="*.tsx" --include="*.ts" | grep -v "authenticatedFetch"
```

### Issue 4: "Firebase Admin SDK not available"

**Cause**: firebase-admin package not installed

**Solution**:
```bash
pip install firebase-admin
```

Then restart backend server.

### Issue 5: "Token verification failed"

**Cause**: Firebase credentials mismatch

**Solution**:

1. Check if Firebase credentials file exists:
```bash
ls -la firebase_key.json
# or
ls -la agentic-pharmacy-firebase-adminsdk-*.json
```

2. Verify frontend and backend use same Firebase project:
   - Frontend: Check `frontend/.env` for `VITE_FIREBASE_PROJECT_ID`
   - Backend: Check Firebase credentials file for `project_id`
   - They must match!

3. If they don't match:
   - Download correct credentials from Firebase Console
   - Update backend credentials file
   - Restart backend server

### Issue 6: "API returns 500 error"

**Cause**: Backend error, check logs

**Solution**:

1. Look at backend terminal for error traceback
2. Common errors:
   - `KeyError: 'uid'` → Token verification failed
   - `AttributeError: 'Request' object has no attribute 'headers'` → FastAPI version issue
   - `ImportError: cannot import name 'auth'` → firebase-admin not installed

3. Fix the error and restart backend

## Verification Checklist

Use this to verify everything is working:

- [ ] Backend server restarted with new code
- [ ] Frontend dev server restarted with new code
- [ ] Browser cache cleared (hard refresh)
- [ ] User is logged in (check with `window.debugAuth()`)
- [ ] Authorization header is present in network requests
- [ ] Backend logs show no warnings
- [ ] Test script passes (`python test_auth_backend.py`)
- [ ] Firestore shows data in `users/{uid}/` collections
- [ ] Different accounts show different data

## Manual Testing Steps

### Test 1: Fresh Account
1. Create new account or use test account
2. Login
3. Check inventory → Should be empty
4. Add item "Test Item A"
5. Verify it appears in inventory
6. Logout

### Test 2: Data Isolation
1. Login with different account
2. Check inventory → Should be empty (no "Test Item A")
3. Add item "Test Item B"
4. Logout
5. Login back to first account
6. Verify only "Test Item A" is visible

### Test 3: Real-time Sync
1. Login with account
2. Open Firestore console
3. Navigate to `users/{your_uid}/batches/`
4. Add item directly in Firestore
5. Refresh app
6. Verify item appears

## Debug Commands

### Check Current User
```javascript
// In browser console:
console.log(auth.currentUser);
```

### Get Fresh Token
```javascript
// In browser console:
const token = await auth.currentUser.getIdToken(true);
console.log(token);
```

### Test API Call Manually
```javascript
// In browser console:
const token = await auth.currentUser.getIdToken();
const res = await fetch('/api/inventory', {
  headers: { 'Authorization': `Bearer ${token}` }
});
const data = await res.json();
console.log(data);
```

### Check Firestore Path
```javascript
// In browser console:
console.log('User ID:', auth.currentUser.uid);
console.log('Expected Firestore path:', `users/${auth.currentUser.uid}/batches`);
```

## Still Not Working?

If you've tried everything above and it's still not working:

1. **Collect Debug Info**:
   ```bash
   # Backend info
   python test_auth_backend.py > debug_backend.txt
   
   # Frontend info (in browser console)
   window.debugAuth()
   ```

2. **Check Firestore Rules**:
   - Go to Firebase Console → Firestore Database → Rules
   - Make sure rules allow authenticated access

3. **Verify Firebase Project**:
   - Frontend and backend must use SAME Firebase project
   - Check project IDs match

4. **Check for Errors**:
   - Backend terminal for Python errors
   - Browser console for JavaScript errors
   - Network tab for failed requests

5. **Try Legacy Mode**:
   - Logout
   - Login with: username=`rxai`, password=`pharma2026`
   - This should work with global collections
   - If this works, issue is with Firebase Auth

## Contact Support

If nothing works, provide:
- Output of `python test_auth_backend.py`
- Output of `window.debugAuth()` in browser console
- Screenshot of Network tab showing API request headers
- Backend terminal logs
- Browser console errors

---

**Most Common Fix**: Restart both backend and frontend servers, then hard refresh browser!
