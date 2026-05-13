# ⚡ NovaMed Quick Reference

Quick commands and file locations for daily development.

---

## 🚀 Common Commands

### **Start Development**
```bash
# Backend
cd backend
python api.py

# Frontend
cd frontend
npm run dev
```

### **Deploy**
```bash
# Everything (backend + frontend)
deployment\deploy-all.bat

# Quick deploy (skip deps)
deployment\quick-deploy-all.bat

# Frontend only
deployment\quick-deploy.bat

# Backend only (auto-deploys on push)
git push origin main
```

### **Check Status**
```bash
# All deployments
deployment\check-all-deployments.bat

# Frontend only
deployment\check-deployment.bat

# Pre-deployment check
deployment\pre-deploy-check.bat
```

---

## 📁 Important File Locations

| What | Where |
|------|-------|
| Backend code | `backend/` |
| Frontend code | `frontend/src/` |
| Deployment scripts | `deployment/` |
| Documentation | `docs/` |
| Config files | `config/` |
| Environment variables | `.env` (root) |
| Firebase config | `config/firebase.json` |
| Python dependencies | `config/requirements.txt` |
| Frontend dependencies | `frontend/package.json` |

---

## 🔧 Configuration Files

### **Backend Environment (`.env`)**
```env
GROQ_API_KEY=your_key
FIREBASE_PROJECT_ID=pharmaai-8bb36
```

### **Frontend Environment (`frontend/.env`)**
```env
VITE_FIREBASE_API_KEY=your_key
VITE_API_URL=https://your-backend.onrender.com
```

---

## 🌐 Live URLs

- **Frontend:** https://pharmaai-8bb36.web.app
- **Backend:** Check Render dashboard
- **Firebase Console:** https://console.firebase.google.com/project/pharmaai-8bb36
- **Render Dashboard:** https://dashboard.render.com

---

## 🐛 Troubleshooting

### **Backend not starting?**
```bash
cd backend
pip install -r ../config/requirements.txt
python api.py
```

### **Frontend build failing?**
```bash
cd frontend
npm install
npm run build
```

### **Deployment failing?**
```bash
# Check pre-deployment
deployment\pre-deploy-check.bat

# Check git status
git status

# Check Firebase login
firebase login
```

---

## 📝 Git Workflow

```bash
# 1. Check status
git status

# 2. Add changes
git add .

# 3. Commit
git commit -m "Your message"

# 4. Push (triggers backend deploy)
git push origin main

# 5. Deploy frontend
deployment\quick-deploy.bat
```

---

## 🔑 Key Scripts

| Script | Purpose |
|--------|---------|
| `backend/api.py` | Start backend server |
| `backend/agent.py` | AI agent logic |
| `deployment/deploy-all.bat` | Deploy everything |
| `deployment/quick-deploy-all.bat` | Quick full deploy |
| `deployment/check-all-deployments.bat` | Check status |

---

## 📦 Dependencies

### **Install Backend Dependencies**
```bash
pip install -r config/requirements.txt
```

### **Install Frontend Dependencies**
```bash
cd frontend
npm install
```

---

## 🎯 Quick Actions

### **Add a new feature**
1. Create feature branch: `git checkout -b feature/my-feature`
2. Make changes
3. Test locally
4. Commit: `git commit -m "Add my feature"`
5. Push: `git push origin feature/my-feature`
6. Create Pull Request on GitHub

### **Fix a bug**
1. Create bugfix branch: `git checkout -b fix/bug-name`
2. Fix the bug
3. Test
4. Commit: `git commit -m "Fix bug-name"`
5. Push: `git push origin fix/bug-name`
6. Create Pull Request

### **Deploy to production**
1. Merge to main branch
2. Run: `deployment\deploy-all.bat`
3. Check: `deployment\check-all-deployments.bat`
4. Test live site

---

## 📚 Documentation Links

- **Full Docs:** [docs/README.md](docs/README.md)
- **Deployment Guide:** [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md)
- **Project Structure:** [PROJECT_STRUCTURE.md](PROJECT_STRUCTURE.md)
- **Quick Start:** [docs/QUICK_START.md](docs/QUICK_START.md)

---

## 🆘 Need Help?

1. Check documentation in `docs/`
2. Review `PROJECT_STRUCTURE.md`
3. Check deployment logs in Render/Firebase
4. Review error messages in console
5. Check `.env` files are configured

---

**Last Updated:** 2026-05-13
