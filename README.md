<div align="center">

# 💊 PharmaAI

![React](https://img.shields.io/badge/React_18-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)
![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)
![FastAPI](https://img.shields.io/badge/FastAPI-009688?style=for-the-badge&logo=fastapi&logoColor=white)
![Python](https://img.shields.io/badge/Python_3.11+-3776AB?style=for-the-badge&logo=python&logoColor=white)
![Firebase](https://img.shields.io/badge/Firebase-FFCA28?style=for-the-badge&logo=firebase&logoColor=black)
![LangGraph](https://img.shields.io/badge/LangGraph-000000?style=for-the-badge)

**Agentic Pharmacy Intelligence — AI-powered inventory, barcode scanning & drug interaction detection.**

</div>

---

## ✨ Features

| Feature | Description |
|---|---|
| 💬 **AI Chat Assistant** | Conversational agent for inventory queries, stock updates, and clinical lookups via text or voice |
| 📦 **Live Inventory** | Real-time category grid with CSV export, stock editing, and reorder alerts |
| 🔖 **GS1 Barcode Scanning** | Instant local decode of GS1-128, DataMatrix, QR & EAN barcodes via `zxing-cpp` |
| 🧠 **Vision Extraction** | Multimodal LLM reads medicine labels from uploaded images or PDFs |
| ⛔ **Expiry Watch** | 90-day early warning system for upcoming and past expirations |
| 💊 **Drug Interaction Checker** | FDA DDI dataset + ChromaDB RAG fallback for clinical safety queries |
| 🛒 **Daily Sales Log** | Fast stock deduction interface with persistent sales history |
| 🔐 **Firebase Auth** | Google OAuth, email/password, and phone OTP sign-up |

---

## 🏗️ Architecture

| Layer | Technology |
|---|---|
| Frontend | React 18 + TypeScript + Vite |
| Backend | FastAPI (Python) — REST + SSE streaming |
| Database | Firebase Firestore (user-scoped) |
| AI Orchestration | LangGraph state machine + Groq API |
| LLM — Text | `llama-3.3-70b-versatile` |
| LLM — Vision | `llama-4-scout-17b` (multimodal) |
| Voice | Groq Whisper `whisper-large-v3` |
| Barcode | `zxing-cpp` — local, no API call |
| Vector Search | ChromaDB Cloud (clinical RAG) |
| Drug Interactions | FDA OpenFDA DDI via `ddi_lookup.py` |

### LangGraph Agent Pipeline

```
User Input (text / voice / image / PDF)
    │
    ▼
Barcode Pre-Scan (zxing-cpp, before LLM)
    │
    ▼
Supervisor Node  ──► routes by intent
    │
    ├── Image/PDF  → Vision Extraction Node → HITL Approval (if expired)
    ├── ADD text   → Add Medicine Node
    ├── CLINICAL   → DDI Lookup + ChromaDB RAG
    ├── UPDATE     → Database Update Node
    └── INVENTORY  → Database Query Node
```

All Firestore writes are scoped to `users/{uid}/batches` — data is never shared between accounts.

---

## 🌐 API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/chat` | SSE stream — runs the LangGraph agent |
| `POST` | `/api/chat/resume` | Resume after HITL interrupt |
| `POST` | `/api/scan-barcode` | Instant barcode decode (GS1 data) |
| `POST` | `/api/upload-image` | Image upload for vision processing |
| `GET` | `/api/inventory` | Full user inventory with stock levels |
| `POST` | `/api/inventory` | Add item manually |
| `DELETE` | `/api/inventory/{id}` | Delete a batch |
| `PATCH` | `/api/inventory/{id}/stock` | Update stock count |
| `GET/POST/DELETE` | `/api/sales` | Daily sales log CRUD |
| `GET` | `/api/reorder-alerts` | Low-stock alerts |
| `GET` | `/api/expired` | Upcoming/past expiry watch |
| `GET/DELETE` | `/api/sessions` | Chat session history |

---

## 🛠️ Installation & Setup

### Prerequisites
- Python 3.11+
- Node.js 18+
- Firebase project with Firestore + Authentication enabled
- Groq API key

### 1. Backend

```bash
# Clone and enter directory
cd Agentic-Pharmacy-main

# Install dependencies
pip install -r requirements.txt

# Configure environment
cp .env.example .env
# Fill in: GROQ_API_KEY, FIREBASE_CREDENTIALS_JSON, CHROMA_API_KEY

# Run backend
python api.py
# → http://localhost:8000
```

### 2. Frontend

```bash
cd frontend
npm install
npm run dev
# → http://localhost:5173
```

### 3. Firebase Setup
- Enable **Firestore** and **Authentication** (Email, Google, Phone) in Firebase Console
- Download your service account JSON as `firebase_key.json` in the project root
- Add your Firebase web config to `frontend/src/firebase.ts`

---

## 📁 Project Structure

```
Agentic-Pharmacy-main/
├── api.py              # FastAPI server + SSE streaming
├── agent.py            # LangGraph agent (all nodes)
├── database.py         # Firestore CRUD (user-scoped)
├── barcode_scanner.py  # zxing-cpp GS1 barcode decoder
├── ddi_lookup.py       # Drug-drug interaction checker
├── requirements.txt
└── frontend/
    └── src/
        ├── app/pages/  # Login, Signup, Dashboard pages
        └── firebase.ts # Firebase client config
```

---

<div align="center">

*Built with ❤️ — LangGraph · Groq · Firebase · zxing-cpp · FastAPI · React*

</div>
