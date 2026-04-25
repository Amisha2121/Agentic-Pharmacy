# 🚀 Quick Start - Fix "Not Synced to Account" Issue

## The Problem
Your data is not syncing to your current account because the servers need to be restarted to use the new code.

## The Solution (3 Steps)

### Step 1: Restart Backend Server

```bash
# Stop the current backend (press Ctrl+C in the terminal running it)

# Then start it again:
python api.py
```

**Wait for this message**:
```
[OK] Firebase initialized successfully -- LIVE mode.
INFO:     Uvicorn running on http://0.0.0.0:8000
```

### Step 2: Restart Frontend Server

```bash
# Stop the current frontend (press Ctrl+C in the terminal running it)

# Navigate to frontend folder:
cd frontend

# Start it again:
npm run dev
```

**Wait for this message**:
```
VITE ready in XXX ms
Local: http://localhost:5173/
```

### Step 3: Clear Browser Cache & Test

1. **Hard Refresh Browser**:
   - Windows/Linux: `Ctrl + Shift + R`
   - Mac: `Cmd + Shift + R`

2. **Open Browser Console** (Press F12)

3. **Run Debug Command**:
   ```javascript
   window.debugAuth()
   ```

4. **Check Output**:
   - ✅ Should show: "User logged in" with your UID
   - ✅ Should show: "API Test Response: 200 OK"
   - ✅ Should show: Authorization header being sent

## Verify It's Working

### Test 1: Check Your Current Account
1. Login to your account
2. Go to Live Inventory
3. Add a test item: "My Test Item"
4. Verify it appears

### Test 2: Check Data Isolation
1. Logout
2. Login with a different account (or create new one)
3. Go to Live Inventory
4. Should be EMPTY (no "My Test Item")
5. Add different item: "Other Account Item"
6. Logout
7. Login back to first account
8. Should only see "My Test Item" (not "Other Account Item")

## If Still Not Working

Run the test script:
```bash
python test_auth_backend.py
```

This will tell you exactly what's wrong.

Then check the full troubleshooting guide:
```bash
# Open TROUBLESHOOTING.md
```

## Quick Debug Commands

### Check if you're logged in:
```javascript
// In browser console (F12):
window.debugAuth()
```

### Check what user ID you have:
```javascript
// In browser console:
console.log('My User ID:', auth.currentUser?.uid);
```

### Check if Authorization header is sent:
1. Open DevTools (F12)
2. Go to Network tab
3. Refresh page
4. Click any API request
5. Look for "Authorization: Bearer ..." in Request Headers

## Common Issues

### "window.debugAuth is not a function"
- Frontend not restarted properly
- Clear cache and hard refresh

### "No user logged in"
- Logout and login again
- Check Firebase Auth configuration

### "API Test Response: 401 Unauthorized"
- Backend can't verify token
- Check Firebase credentials match

### "Still seeing other user's data"
- Clear browser cache completely
- Logout and login again
- Check Firestore console for data location

## Expected Behavior After Fix

✅ Each account has its own empty inventory  
✅ Adding items only shows in current account  
✅ Switching accounts shows different data  
✅ Notification badges show correct counts per user  
✅ Chat history is separate per user  
✅ Sales logs are separate per user  

## Need More Help?

1. Read `TROUBLESHOOTING.md` for detailed solutions
2. Run `python test_auth_backend.py` to diagnose backend
3. Check browser console for errors
4. Check backend terminal for errors

---

**TL;DR**: Restart backend (`python api.py`), restart frontend (`npm run dev`), hard refresh browser (`Ctrl+Shift+R`), then test with `window.debugAuth()`
