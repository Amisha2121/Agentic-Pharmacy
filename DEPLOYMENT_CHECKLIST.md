# 🚀 Deployment Checklist - User-Scoped Firebase Implementation

## Pre-Deployment Verification

### 1. Code Review ✅
- [x] All database functions accept `user_id` parameter
- [x] All API endpoints extract and pass `user_id`
- [x] All frontend pages use `authenticatedFetch()`
- [x] No plain `fetch()` calls in active files (only in *_old backup files)
- [x] Import statements include `authenticatedFetch` utility

### 2. Environment Setup
- [ ] Verify Firebase Admin SDK is installed: `pip install firebase-admin`
- [ ] Verify Firebase credentials are configured in backend
- [ ] Verify frontend `.env` has Firebase config variables:
  - `VITE_FIREBASE_API_KEY`
  - `VITE_FIREBASE_AUTH_DOMAIN`
  - `VITE_FIREBASE_PROJECT_ID`
  - `VITE_FIREBASE_STORAGE_BUCKET`
  - `VITE_FIREBASE_MESSAGING_SENDER_ID`
  - `VITE_FIREBASE_APP_ID`

### 3. Backend Testing
- [ ] Start backend server: `python api.py`
- [ ] Verify no errors on startup
- [ ] Check Firebase connection: Look for "[OK] Firebase initialized successfully"
- [ ] Test token verification with a sample request

### 4. Frontend Testing
- [ ] Install dependencies: `cd frontend && npm install`
- [ ] Start dev server: `npm run dev`
- [ ] Verify no TypeScript errors
- [ ] Check browser console for errors

## Functional Testing

### Test Scenario 1: New User Registration
- [ ] Create new account (Google/Email/Phone)
- [ ] Verify empty inventory on first login
- [ ] Add test inventory items
- [ ] Verify items are saved
- [ ] Logout

### Test Scenario 2: Data Isolation
- [ ] Login with Account A
- [ ] Add 3 inventory items
- [ ] Note the item names
- [ ] Logout
- [ ] Login with Account B
- [ ] Verify inventory is empty (no items from Account A)
- [ ] Add 2 different inventory items
- [ ] Logout
- [ ] Login back to Account A
- [ ] Verify original 3 items are still there
- [ ] Verify Account B's items are NOT visible

### Test Scenario 3: Sales Logging
- [ ] Login with test account
- [ ] Add inventory item with stock = 10
- [ ] Log a sale of 3 units
- [ ] Verify stock decreased to 7
- [ ] Logout and login with different account
- [ ] Verify sales log is empty
- [ ] Verify inventory is empty

### Test Scenario 4: Chat Sessions
- [ ] Login with Account A
- [ ] Start a chat session
- [ ] Send 3 messages
- [ ] Verify chat is saved
- [ ] Logout
- [ ] Login with Account B
- [ ] Verify chat history is empty
- [ ] Start new chat
- [ ] Logout and login back to Account A
- [ ] Verify original chat is still there

### Test Scenario 5: Notifications
- [ ] Login with test account
- [ ] Add item with stock = 5 (triggers reorder alert)
- [ ] Add item with past expiry date
- [ ] Verify notification badges show correct counts
- [ ] Logout and login with different account
- [ ] Verify notification badges show 0

### Test Scenario 6: Legacy User Support
- [ ] Login with legacy credentials (rxai/pharma2026)
- [ ] Verify access to global collections
- [ ] Add test data
- [ ] Logout
- [ ] Login with Firebase Auth account
- [ ] Verify legacy data is NOT visible

## API Endpoint Testing

Test each endpoint with and without auth token:

### Inventory Endpoints
- [ ] GET `/api/inventory` - Returns user-scoped items
- [ ] POST `/api/inventory` - Creates item in user scope
- [ ] DELETE `/api/inventory/{doc_id}` - Deletes from user scope
- [ ] PATCH `/api/inventory/{doc_id}/stock` - Updates user's item
- [ ] PATCH `/api/inventory/{doc_id}/category` - Updates user's item

### Sales Endpoints
- [ ] GET `/api/sales/today` - Returns user's sales
- [ ] GET `/api/sales/history` - Returns user's history
- [ ] POST `/api/sales` - Creates sale in user scope
- [ ] PATCH `/api/sales/{log_id}` - Updates user's sale
- [ ] DELETE `/api/sales/{log_id}` - Deletes user's sale

### Alert Endpoints
- [ ] GET `/api/reorder-alerts` - Returns user's alerts
- [ ] POST `/api/reorder-alerts/{doc_id}/dismiss` - Dismisses user's alert
- [ ] GET `/api/expired` - Returns user's expired items
- [ ] POST `/api/expired/{doc_id}/dismiss` - Dismisses user's alert

### Chat Endpoints
- [ ] GET `/api/sessions` - Returns user's sessions
- [ ] GET `/api/sessions/{session_id}/messages` - Returns user's messages
- [ ] POST `/api/sessions/{session_id}` - Saves to user scope
- [ ] DELETE `/api/sessions/{session_id}` - Deletes user's session
- [ ] POST `/api/chat` - Streams with user context
- [ ] POST `/api/chat/resume` - Resumes user's chat

### Other Endpoints
- [ ] GET `/api/quarantine` - Returns user's quarantine items
- [ ] POST `/api/scan-barcode` - Works with auth
- [ ] POST `/api/upload-image` - Works with auth

## Security Testing

### Authorization Tests
- [ ] Request without token → Falls back to "legacy"
- [ ] Request with invalid token → Falls back to "legacy"
- [ ] Request with expired token → Gets refreshed automatically
- [ ] Request with valid token → Uses correct user_id
- [ ] User A cannot access User B's data via API manipulation

### Token Handling
- [ ] Token auto-refreshes before expiry (1 hour)
- [ ] Frontend handles token refresh gracefully
- [ ] Backend validates token signature
- [ ] Backend extracts correct user_id from token

## Performance Testing

- [ ] Page load times are acceptable
- [ ] API response times < 500ms for typical requests
- [ ] Firestore queries are efficient (using user_id index)
- [ ] No N+1 query issues
- [ ] Frontend doesn't make redundant API calls

## Error Handling

- [ ] Network errors show user-friendly messages
- [ ] Auth errors redirect to login
- [ ] API errors don't expose sensitive info
- [ ] Console logs don't contain tokens or sensitive data
- [ ] Failed requests don't crash the app

## Browser Compatibility

- [ ] Chrome/Edge (latest)
- [ ] Firefox (latest)
- [ ] Safari (latest)
- [ ] Mobile browsers (iOS Safari, Chrome Mobile)

## Firestore Console Verification

- [ ] Open Firebase Console → Firestore Database
- [ ] Verify `users/{user_id}` collections exist
- [ ] Verify data is properly scoped
- [ ] Check for any orphaned data in global collections
- [ ] Verify indexes are created if needed

## Rollback Plan

If issues are found:

1. **Immediate Rollback**
   - Revert to previous commit
   - Restart backend server
   - Clear browser cache
   - Verify old functionality works

2. **Partial Rollback**
   - Keep backend changes
   - Revert frontend to use plain `fetch()`
   - All users will use "legacy" mode

3. **Data Recovery**
   - Legacy data remains in global collections
   - User-scoped data remains in `users/{user_id}/` collections
   - No data loss in either scenario

## Post-Deployment Monitoring

### First 24 Hours
- [ ] Monitor error logs for auth failures
- [ ] Check Firestore usage metrics
- [ ] Monitor API response times
- [ ] Watch for user-reported issues
- [ ] Verify notification counts are accurate

### First Week
- [ ] Review user feedback
- [ ] Check for data isolation issues
- [ ] Monitor Firestore costs
- [ ] Verify no data leakage between users
- [ ] Confirm all features work as expected

## Success Criteria

✅ All tests pass  
✅ No data leakage between users  
✅ Performance is acceptable  
✅ No critical errors in logs  
✅ Users can login and use all features  
✅ Legacy users still work  
✅ New users start with empty data  

## Sign-Off

- [ ] Developer: Implementation complete and tested
- [ ] QA: All test scenarios pass
- [ ] Product Owner: Features work as expected
- [ ] DevOps: Deployment successful

---

**Ready for Production**: ⬜ YES / ⬜ NO  
**Date**: _______________  
**Deployed By**: _______________  
**Notes**: _______________
