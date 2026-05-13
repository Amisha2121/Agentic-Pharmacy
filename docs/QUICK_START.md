# Quick Start - Data Isolation Setup

## 🚀 5-Minute Setup

### Step 1: Enable Firebase Authentication (2 minutes)
1. Open https://console.firebase.google.com/
2. Select project: `pharmaai-8bb36`
3. Go to **Authentication** → **Sign-in method**
4. Enable **Email/Password**
5. Click **Save**

### Step 2: Apply Firestore Security Rules (2 minutes)
1. Go to **Firestore Database** → **Rules**
2. Copy and paste this:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId}/{document=**} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
    match /{document=**} {
      allow read, write: if request.auth != null;
    }
  }
}
```

3. Click **Publish**

### Step 3: Test (1 minute)
1. Create new account at https://pharmaai-8bb36.web.app/signup
2. Log in
3. Check inventory → Should be empty ✅
4. Add an item → Should appear ✅
5. Log out and create another account
6. Check inventory → Should be empty (first account's item NOT visible) ✅

## ✅ Done!

Your app now has proper per-account data isolation.

## 📚 More Information

- **Full Setup Guide**: See `FIREBASE_SETUP.md`
- **Implementation Details**: See `DATA_ISOLATION_IMPLEMENTATION.md`
- **Completion Status**: See `IMPLEMENTATION_COMPLETE.md`

## 🧪 Run Tests

```bash
python test_data_isolation.py
```

## 🐛 Troubleshooting

### "Authentication required" error
→ User not logged in. Go to /login

### Empty inventory after adding items
→ Check backend logs for correct path: `users/{uid}/batches`

### User sees other users' data
→ Verify Firestore rules are published in Firebase Console

## 🔒 Production Rules (Optional)

For strict isolation in production, use these rules instead:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId}/{document=**} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
    match /{document=**} {
      allow read, write: if false;
    }
  }
}
```

This completely disables root collections.
