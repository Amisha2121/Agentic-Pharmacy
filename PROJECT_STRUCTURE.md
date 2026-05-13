# 📁 NovaMed Project Structure

This document explains the organization of the NovaMed codebase.

---

## 🗂️ Root Directory Structure

```
NovaMed/
├── 📂 backend/              # Python FastAPI backend
├── 📂 frontend/             # React TypeScript frontend  
├── 📂 deployment/           # Deployment scripts & tools
├── 📂 docs/                 # Documentation
├── 📂 config/               # Configuration files
├── 📂 data/                 # Data files & datasets
├── 📂 credentials/          # Sensitive credentials (gitignored)
├── 📂 scripts/              # Utility scripts
├── 📂 tests/                # Test files
├── 📂 uploads/              # Temporary uploads (gitignored)
├── .env                     # Environment variables (gitignored)
├── .gitignore              # Git ignore rules
├── README.md               # Main documentation
└── PROJECT_STRUCTURE.md    # This file
```

---

## 📂 Backend (`/backend`)

Python FastAPI backend with AI agent orchestration.

```
backend/
├── agent.py              # LangGraph AI agent (main orchestrator)
├── api.py                # FastAPI REST API endpoints
├── barcode_scanner.py    # Barcode detection & GS1 parsing
├── database.py           # Firestore database operations
├── ddi_lookup.py         # Drug-drug interaction checker
└── test_data_isolation.py # Database isolation tests
```

### Key Files:

- **`agent.py`** - LangGraph state machine for AI conversations
  - Supervisor node (routing)
  - Vision extraction node
  - Clinical knowledge node
  - Database query/update nodes
  - Human-in-the-loop approval

- **`api.py`** - REST API server
  - Chat endpoints (SSE streaming)
  - Inventory CRUD operations
  - Sales tracking
  - Authentication middleware
  - File upload handling

- **`barcode_scanner.py`** - Barcode processing
  - zxing-cpp integration
  - GS1-128 parsing
  - NDC code extraction
  - Image preprocessing

- **`database.py`** - Firestore operations
  - Per-user data isolation
  - Inventory management
  - Sales logging
  - Chat session storage

- **`ddi_lookup.py`** - Drug interactions
  - FDA DDI dataset queries
  - Fuzzy drug name matching
  - Interaction severity classification

---

## 📂 Frontend (`/frontend`)

React + TypeScript SPA with Vite build system.

```
frontend/
├── src/
│   ├── app/
│   │   ├── components/      # Reusable UI components
│   │   │   ├── ui/         # shadcn/ui components
│   │   │   ├── BoldChatArea.tsx
│   │   │   ├── BoldSidebar.tsx
│   │   │   └── ...
│   │   ├── pages/          # Route pages
│   │   │   ├── Dashboard.tsx
│   │   │   ├── LiveInventory.tsx
│   │   │   ├── AssistantChat.tsx
│   │   │   └── ...
│   │   ├── context/        # React contexts
│   │   │   └── AuthContext.tsx
│   │   ├── utils/          # Utility functions
│   │   │   └── api.ts
│   │   ├── firebase.ts     # Firebase config
│   │   └── routes.tsx      # Route definitions
│   ├── styles/             # Global styles
│   └── main.tsx            # App entry point
├── public/                 # Static assets
├── dist/                   # Production build (gitignored)
├── index.html              # HTML template
├── package.json            # Dependencies
├── vite.config.ts          # Vite configuration
└── tsconfig.json           # TypeScript config
```

### Key Directories:

- **`components/`** - Reusable React components
  - `ui/` - shadcn/ui component library
  - Chat components (BoldChatArea, MessageBubble)
  - Sidebar navigation
  - Onboarding tour

- **`pages/`** - Route-level components
  - Dashboard - Overview & quick actions
  - LiveInventory - Inventory management
  - AssistantChat - AI chat interface
  - LogDailySales - Sales tracking
  - Settings - User preferences

- **`context/`** - React Context providers
  - AuthContext - Firebase authentication

- **`utils/`** - Helper functions
  - api.ts - Authenticated fetch wrapper

---

## 📂 Deployment (`/deployment`)

Automated deployment scripts for Windows.

```
deployment/
├── deploy-all.bat              # Full stack deployment
├── quick-deploy-all.bat        # Quick full deployment
├── deploy.bat                  # Frontend only (full)
├── quick-deploy.bat            # Frontend only (quick)
├── pre-deploy-check.bat        # Pre-deployment validation
├── check-deployment.bat        # Frontend status
├── check-all-deployments.bat   # Full status check
├── push_to_github.bat          # Git push helper
├── cleanup.bat                 # Cleanup script
└── move_scripts.bat            # File organization
```

### Script Usage:

| Script | Purpose | Time |
|--------|---------|------|
| `deploy-all.bat` | Deploy backend + frontend | 3-5 min |
| `quick-deploy-all.bat` | Quick full deploy | 1-2 min |
| `deploy.bat` | Frontend with deps | 2-5 min |
| `quick-deploy.bat` | Frontend only | 30-60 sec |
| `pre-deploy-check.bat` | Validation | 10 sec |
| `check-all-deployments.bat` | Status check | 5 sec |

---

## 📂 Documentation (`/docs`)

Project documentation and guides.

```
docs/
├── README.md           # Full feature documentation
├── DEPLOYMENT.md       # Deployment guide
└── QUICK_START.md      # Quick start guide
```

---

## 📂 Configuration (`/config`)

Configuration files and templates.

```
config/
├── .env.example        # Environment variables template
├── firebase.json       # Firebase hosting config
├── .firebaserc         # Firebase project config
├── requirements.txt    # Python dependencies
└── Procfile           # Render deployment config
```

### Key Files:

- **`.env.example`** - Template for environment variables
  - Copy to `.env` and fill in your values
  - Never commit `.env` to git

- **`firebase.json`** - Firebase hosting configuration
  - Public directory: `frontend/dist`
  - Rewrites for SPA routing
  - Cache headers

- **`requirements.txt`** - Python dependencies
  - FastAPI, LangGraph, Firebase Admin
  - zxing-cpp, Pillow, pandas
  - OpenAI client (for Groq)

---

## 📂 Data (`/data`)

Data files and datasets.

```
data/
├── ddi_datasets/       # Drug interaction datasets
│   ├── ddi_drugbank.csv
│   └── ddinter_A.csv
└── fda_ddi.csv         # FDA drug interaction data
```

---

## 📂 Credentials (`/credentials`)

**⚠️ GITIGNORED - Never commit these files!**

```
credentials/
└── agentic-pharmacy-firebase-adminsdk-*.json
```

Store Firebase service account keys and other sensitive credentials here.

---

## 📂 Scripts (`/scripts`)

Utility scripts for maintenance and testing.

```
scripts/
├── diagnose_and_sync.py    # Firestore diagnostic tool
├── daily_alert_job.py      # Automated alert system
└── evaluation_dataset.py   # Test dataset
```

---

## 📂 Tests (`/tests`)

Test files and test data.

```
tests/
└── (test files)
```

---

## 📂 Uploads (`/uploads`)

**⚠️ GITIGNORED - Temporary file storage**

Temporary storage for uploaded images and PDFs during barcode scanning.
Files are automatically cleaned up after 1 hour.

---

## 🔐 Environment Variables

### Backend (`.env`)

```env
# Groq (LLM)
GROQ_API_KEY=your_groq_api_key

# Firebase Admin
FIREBASE_PROJECT_ID=pharmaai-8bb36
FIREBASE_PRIVATE_KEY=...
FIREBASE_CLIENT_EMAIL=...

# ChromaDB (optional)
CHROMA_API_KEY=...
CHROMA_TENANT=...
CHROMA_DATABASE=...
```

### Frontend (`frontend/.env`)

```env
# Firebase Client
VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_AUTH_DOMAIN=pharmaai-8bb36.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=pharmaai-8bb36
VITE_FIREBASE_STORAGE_BUCKET=...
VITE_FIREBASE_MESSAGING_SENDER_ID=...
VITE_FIREBASE_APP_ID=...

# Backend API
VITE_API_URL=https://your-backend.onrender.com
```

---

## 🚀 Deployment Architecture

```
┌─────────────────┐
│   GitHub Repo   │
└────────┬────────┘
         │
         ├─────────────────┐
         │                 │
         ▼                 ▼
┌─────────────────┐  ┌──────────────┐
│  Render (Auto)  │  │   Firebase   │
│   Backend API   │  │   Hosting    │
└────────┬────────┘  └──────┬───────┘
         │                  │
         │                  │
         ▼                  ▼
┌─────────────────────────────┐
│   Firebase Firestore DB     │
│   (Shared by both)          │
└─────────────────────────────┘
```

### Deployment Flow:

1. **Backend (Render):**
   - Push to GitHub → Render auto-deploys
   - Runs `uvicorn api:app`
   - Connects to Firestore

2. **Frontend (Firebase):**
   - Run `deploy.bat` or `quick-deploy.bat`
   - Builds with Vite
   - Deploys to Firebase Hosting

---

## 📝 File Naming Conventions

- **Python files:** `snake_case.py`
- **TypeScript/React:** `PascalCase.tsx` for components, `camelCase.ts` for utilities
- **Scripts:** `kebab-case.bat`
- **Docs:** `UPPERCASE.md` for important docs, `lowercase.md` for guides

---

## 🔄 Git Workflow

```bash
# 1. Make changes
# ...

# 2. Check status
git status

# 3. Stage changes
git add .

# 4. Commit
git commit -m "Description of changes"

# 5. Push (triggers Render deploy)
git push origin main

# 6. Deploy frontend
deployment\quick-deploy.bat
```

---

## 🆘 Quick Reference

### Start Development:
```bash
# Backend
cd backend && python api.py

# Frontend
cd frontend && npm run dev
```

### Deploy:
```bash
# Everything
deployment\deploy-all.bat

# Frontend only
deployment\quick-deploy.bat
```

### Check Status:
```bash
deployment\check-all-deployments.bat
```

---

**Last Updated:** 2026-05-13
