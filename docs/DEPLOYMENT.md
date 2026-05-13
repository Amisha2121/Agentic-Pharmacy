# 🚀 NovaMed Deployment Guide

This guide covers deploying the NovaMed frontend to Firebase Hosting.

## Prerequisites

Before deploying, ensure you have:

1. **Node.js** installed (v18 or higher)
   ```bash
   node --version
   ```

2. **Firebase CLI** installed globally
   ```bash
   npm install -g firebase-tools
   ```

3. **Firebase Authentication**
   ```bash
   firebase login
   ```

4. **Correct Firebase Project Selected**
   ```bash
   firebase use pharmaai-8bb36
   ```

---

## 🎯 Deployment Methods

### Method 1: Full Deployment (Recommended for first-time)

Use this when deploying for the first time or after updating dependencies:

```bash
deploy.bat
```

**What it does:**
1. ✅ Checks Node.js installation
2. ✅ Installs/updates frontend dependencies
3. ✅ Builds the production bundle
4. ✅ Deploys to Firebase Hosting

**Time:** ~2-5 minutes (depending on internet speed)

---

### Method 2: Quick Deploy (Faster)

Use this when dependencies are already installed and you just made code changes:

```bash
quick-deploy.bat
```

**What it does:**
1. ✅ Builds the production bundle
2. ✅ Deploys to Firebase Hosting

**Time:** ~30-60 seconds

---

### Method 3: Manual Deployment

If you prefer manual control:

```bash
# 1. Navigate to frontend directory
cd frontend

# 2. Install dependencies (if needed)
npm install

# 3. Build for production
npm run build

# 4. Go back to root
cd ..

# 5. Deploy to Firebase
firebase deploy --only hosting
```

---

## 🌐 Deployment URLs

After successful deployment, your app will be available at:

- **Production URL:** https://pharmaai-8bb36.web.app
- **Firebase Console:** https://console.firebase.google.com/project/pharmaai-8bb36

---

## 🔧 Build Configuration

### Environment Variables

The frontend uses environment variables for configuration. Make sure `frontend/.env` contains:

```env
VITE_FIREBASE_API_KEY=your_api_key
VITE_FIREBASE_AUTH_DOMAIN=pharmaai-8bb36.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=pharmaai-8bb36
VITE_FIREBASE_STORAGE_BUCKET=pharmaai-8bb36.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id
VITE_API_URL=https://your-backend-api.com
```

### Build Output

- **Source:** `frontend/src/`
- **Build Output:** `frontend/dist/`
- **Deployed From:** `frontend/dist/` (configured in `firebase.json`)

---

## 🐛 Troubleshooting

### Issue: "Firebase command not found"

**Solution:** Install Firebase CLI globally
```bash
npm install -g firebase-tools
```

### Issue: "Not logged in to Firebase"

**Solution:** Login to Firebase
```bash
firebase login
```

### Issue: "Build failed"

**Solution:** Check for TypeScript errors
```bash
cd frontend
npm run build:check
```

### Issue: "Wrong Firebase project"

**Solution:** Select the correct project
```bash
firebase use pharmaai-8bb36
```

### Issue: "Deployment failed - Permission denied"

**Solution:** Ensure you have deployment permissions for the Firebase project
- Check Firebase Console → Project Settings → Users and Permissions
- You need at least "Editor" role

---

## 📊 Deployment Checklist

Before deploying to production:

- [ ] All tests pass
- [ ] No console errors in development
- [ ] Environment variables are set correctly
- [ ] Firebase project is correct (`pharmaai-8bb36`)
- [ ] Backend API is accessible
- [ ] Database rules are configured
- [ ] Authentication is working

---

## 🔄 Rollback

If you need to rollback to a previous deployment:

1. **View deployment history:**
   ```bash
   firebase hosting:channel:list
   ```

2. **Rollback via Firebase Console:**
   - Go to Firebase Console → Hosting
   - Click on "Release history"
   - Click "Rollback" on the desired version

---

## 🚀 CI/CD (Optional)

For automated deployments, you can set up GitHub Actions:

1. Create `.github/workflows/deploy.yml`
2. Add Firebase token as GitHub secret
3. Configure workflow to run on push to main branch

Example workflow:
```yaml
name: Deploy to Firebase

on:
  push:
    branches: [ main ]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-node@v2
        with:
          node-version: '18'
      - run: cd frontend && npm ci && npm run build
      - uses: FirebaseExtended/action-hosting-deploy@v0
        with:
          repoToken: '${{ secrets.GITHUB_TOKEN }}'
          firebaseServiceAccount: '${{ secrets.FIREBASE_SERVICE_ACCOUNT }}'
          channelId: live
          projectId: pharmaai-8bb36
```

---

## 📝 Post-Deployment

After successful deployment:

1. **Test the live site:** https://pharmaai-8bb36.web.app
2. **Check Firebase Console** for any errors
3. **Monitor performance** in Firebase Performance Monitoring
4. **Review analytics** in Firebase Analytics

---

## 🆘 Support

If you encounter issues:

1. Check the [Firebase Status Page](https://status.firebase.google.com/)
2. Review Firebase Console logs
3. Check browser console for errors
4. Verify API connectivity

---

**Last Updated:** 2026-05-13
**Project:** NovaMed (pharmaai-8bb36)
