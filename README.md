# 💊 NovaMed - AI-Powered Pharmacy Management System

![React](https://img.shields.io/badge/React_18-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)
![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)
![FastAPI](https://img.shields.io/badge/FastAPI-009688?style=for-the-badge&logo=fastapi&logoColor=white)
![Python](https://img.shields.io/badge/Python_3.11+-3776AB?style=for-the-badge&logo=python&logoColor=white)
![Firebase](https://img.shields.io/badge/Firebase-FFCA28?style=for-the-badge&logo=firebase&logoColor=black)

**AI-powered pharmacy management system with intelligent inventory tracking, multimodal barcode scanning, and conversational AI assistant.**

[Live Demo](https://pharmaai-8bb36.web.app) • [Documentation](docs/) • [Report Bug](https://github.com/Amisha2121/Agentic-Pharmacy/issues)

---

## 📁 Project Structure

```
NovaMed/
├── 📂 backend/              # Python FastAPI backend
│   ├── agent.py            # LangGraph AI agent
│   ├── api.py              # FastAPI REST API
│   ├── barcode_scanner.py  # Barcode detection & parsing
│   ├── database.py         # Firestore database operations
│   └── ddi_lookup.py       # Drug-drug interaction checker
│
├── 📂 frontend/            # React + TypeScript frontend
│   ├── src/               # Source code
│   ├── public/            # Static assets
│   └── dist/              # Production build
│
├── 📂 deployment/          # Deployment scripts
│   ├── deploy-all.bat     # Full stack deployment
│   ├── quick-deploy-all.bat  # Quick full deployment
│   ├── deploy.bat         # Frontend only
│   ├── quick-deploy.bat   # Quick frontend deploy
│   └── check-all-deployments.bat  # Status checker
│
├── 📂 docs/               # Documentation
│   ├── README.md          # Full documentation
│   ├── DEPLOYMENT.md      # Deployment guide
│   └── QUICK_START.md     # Quick start guide
│
├── 📂 config/             # Configuration files
│   ├── .env.example       # Environment variables template
│   ├── firebase.json      # Firebase hosting config
│   ├── .firebaserc        # Firebase project config
│   ├── requirements.txt   # Python dependencies
│   └── Procfile          # Render deployment config
│
├── 📂 data/               # Data files
│   ├── ddi_datasets/      # Drug interaction datasets
│   └── fda_ddi.csv        # FDA drug interaction data
│
├── 📂 credentials/        # Sensitive credentials (gitignored)
│   └── *.json            # Firebase service account keys
│
├── 📂 scripts/            # Utility scripts
├── 📂 tests/              # Test files
└── 📂 uploads/            # Temporary file uploads

```

---

## 🚀 Quick Start

### **1. Clone the Repository**
```bash
git clone https://github.com/Amisha2121/Agentic-Pharmacy.git
cd Agentic-Pharmacy
```

### **2. Backend Setup**
```bash
# Install Python dependencies
pip install -r config/requirements.txt

# Set up environment variables
copy config\.env.example .env
# Edit .env with your API keys

# Run backend
cd backend
python api.py
```

### **3. Frontend Setup**
```bash
# Install dependencies
cd frontend
npm install

# Run development server
npm run dev
```

### **4. Deploy Everything**
```bash
# Deploy both backend and frontend
deployment\deploy-all.bat
```

---

## 📚 Documentation

- **[Full Documentation](docs/README.md)** - Complete feature guide
- **[Deployment Guide](docs/DEPLOYMENT.md)** - Deploy to production
- **[Quick Start Guide](docs/QUICK_START.md)** - Get started in 5 minutes

---

## ✨ Key Features

### 🤖 **AI Chat Assistant**
- Multimodal input (text, voice, images, PDFs)
- Context-aware conversations
- Smart routing to specialized agents
- Human-in-the-loop for critical operations

### 📊 **Dashboard & Analytics**
- Real-time inventory overview
- Low stock alerts
- Expiring items tracking
- Dark mode support

### 📦 **Inventory Management**
- Batch tracking with expiry dates
- Category organization
- Stock monitoring
- CSV export

### 🔍 **Barcode Scanner**
- GS1-128, DataMatrix, QR codes
- NDC code extraction
- Camera & upload support
- Automatic product identification

### 💊 **Drug Interaction Checker**
- FDA drug interaction database
- Real-time safety checks
- Clinical knowledge base

### 📈 **Sales Tracking**
- Daily sales logging
- Historical reports
- Export to CSV
- Analytics dashboard

---

## 🛠️ Technology Stack

**Frontend:**
- React 18 + TypeScript
- Vite (build tool)
- TailwindCSS (styling)
- Lucide Icons
- React Router

**Backend:**
- Python 3.11+
- FastAPI (REST API)
- LangGraph (AI orchestration)
- Groq (LLM inference)
- Firebase Firestore (database)

**AI/ML:**
- Llama 3.1 (via Groq)
- ChromaDB (vector search)
- zxing-cpp (barcode detection)

**Deployment:**
- Frontend: Firebase Hosting
- Backend: Render
- Database: Firebase Firestore

---

## 🚀 Deployment

### **Quick Deploy (Both Backend & Frontend)**
```bash
deployment\deploy-all.bat
```

### **Frontend Only**
```bash
deployment\quick-deploy.bat
```

### **Backend Only**
```bash
git push origin main  # Auto-deploys on Render
```

### **Check Deployment Status**
```bash
deployment\check-all-deployments.bat
```

📖 **See [DEPLOYMENT.md](docs/DEPLOYMENT.md) for detailed instructions**

---

## 🌐 Live URLs

- **Frontend:** https://pharmaai-8bb36.web.app
- **Backend:** Check your Render dashboard
- **Firebase Console:** https://console.firebase.google.com/project/pharmaai-8bb36

---

## 🔧 Environment Variables

Required environment variables (see `config/.env.example`):

**Backend:**
- `GROQ_API_KEY` - Groq API key for LLM
- `FIREBASE_*` - Firebase configuration
- `CHROMA_*` - ChromaDB configuration

**Frontend:**
- `VITE_FIREBASE_*` - Firebase client config
- `VITE_API_URL` - Backend API URL

---

## 📝 Scripts Reference

| Script | Purpose | Location |
|--------|---------|----------|
| `deploy-all.bat` | Deploy backend + frontend | `deployment/` |
| `quick-deploy-all.bat` | Quick full deploy | `deployment/` |
| `deploy.bat` | Frontend only (full) | `deployment/` |
| `quick-deploy.bat` | Frontend only (quick) | `deployment/` |
| `check-all-deployments.bat` | Check status | `deployment/` |
| `pre-deploy-check.bat` | Pre-deployment validation | `deployment/` |

---

## 🧪 Testing

```bash
# Run backend tests
cd backend
pytest

# Run frontend tests
cd frontend
npm test
```

---

## 🤝 Contributing

Contributions are welcome! Please:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

---

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

---

## 🆘 Support

- **Documentation:** [docs/](docs/)
- **Issues:** [GitHub Issues](https://github.com/Amisha2121/Agentic-Pharmacy/issues)
- **Deployment Help:** [DEPLOYMENT.md](docs/DEPLOYMENT.md)

---

## 🎯 Roadmap

- [ ] Mobile app (React Native)
- [ ] Advanced analytics dashboard
- [ ] Multi-language support
- [ ] Prescription management
- [ ] Integration with pharmacy POS systems

---

**Built with ❤️ by the NovaMed Team**

**Last Updated:** 2026-05-13
