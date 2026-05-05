<div align="center">

# 💊 PharmaAI (Agentic Pharmacy)

![React](https://img.shields.io/badge/React_18-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)
![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)
![FastAPI](https://img.shields.io/badge/FastAPI-009688?style=for-the-badge&logo=fastapi&logoColor=white)
![Python](https://img.shields.io/badge/Python_3.11+-3776AB?style=for-the-badge&logo=python&logoColor=white)
![Firebase](https://img.shields.io/badge/Firebase-FFCA28?style=for-the-badge&logo=firebase&logoColor=black)
![LangGraph](https://img.shields.io/badge/LangGraph-000000?style=for-the-badge)

**Agentic Pharmacy Intelligence — AI-powered inventory management, multimodal barcode scanning & clinical drug interaction detection.**

</div>

---

## 📖 About the Project

PharmaAI is a next-generation pharmacy management system that leverages state-of-the-art agentic AI to streamline daily workflows. Designed for pharmacists and medical staff, the system replaces traditional point-of-sale and inventory software with an intuitive, conversational interface.

By combining deterministic tools (like local GS1 barcode decoding) with advanced large language models (for visual data extraction and clinical RAG), PharmaAI reduces manual data entry, prevents stockouts, and enhances patient safety by actively monitoring drug-drug interactions.

## ✨ Key Features

- 💬 **AI Chat Assistant**: A LangGraph-powered conversational agent that handles inventory queries, stock updates, clinical safety lookups, and general medical knowledge queries via text or voice.
- 📦 **Live Inventory Dashboard**: A real-time, user-scoped grid displaying stock levels, categories, with inline editing and instant CSV export.
- 🔖 **Instant Barcode Scanning**: Local, zero-latency decoding of GS1-128, DataMatrix, QR, and EAN barcodes via `zxing-cpp`.
- 🧠 **Vision Extraction Engine**: Multimodal LLM capabilities to read complex medicine labels directly from uploaded photos or batch-process multiple pages of PDF invoices directly into the Live Inventory.
- ⛔ **Expiry & Reorder Watch**: Automated 90-day early warning system for upcoming expirations and low-stock threshold alerts.
- 💊 **Clinical Safety Checker**: Integration with the FDA OpenFDA dataset plus a ChromaDB-powered Retrieval-Augmented Generation (RAG) fallback for drug interaction checks.
- 🛒 **Daily Sales Log**: Fast, streamlined interface for daily stock deduction and historical sales tracking.
- 🔐 **Secure Authentication**: Firebase-backed auth supporting Google OAuth, Email/Password, and Phone OTP, with strict user-data isolation.

---

## 🏗️ Architecture

PharmaAI is built on a modern, decoupled stack.

### Tech Stack
| Layer | Technology |
|---|---|
| **Frontend** | React 18, TypeScript, Vite, Tailwind CSS, Lucide Icons |
| **Backend** | FastAPI (Python) — REST API + Server-Sent Events (SSE) streaming |
| **Database** | Firebase Firestore (Strictly user-scoped collections) |
| **AI Orchestration** | LangGraph (State Machine Architecture) |
| **LLM (Text)** | `llama-3.1-8b-instant` (via Groq API) |
| **LLM (Vision)** | `llama-4-scout-17b` (Multimodal analysis) |
| **Speech-to-Text** | Groq Whisper (`whisper-large-v3`) |
| **Barcode Decoder** | `zxing-cpp` (Fast local C++ bindings, no external API calls) |
| **Vector DB** | ChromaDB Cloud (For clinical RAG lookups) |
| **Medical Data** | FDA OpenFDA DDI (`ddi_lookup.py`) |

### LangGraph Agent Pipeline
The core of the assistant is a routing supervisor that directs user requests to specialized nodes:

```text
User Input (Text / Voice / Image / PDF)
    │
    ▼
Barcode Pre-Scan (Local zxing-cpp decode)
    │
    ▼
Supervisor Node  ──► Routes by intent classification
    │
    ├── [IMAGE/PDF]  → Vision Extraction Node → HITL Approval (if expired)
    ├── [ADD]        → Add Medicine Node
    ├── [CLINICAL]   → DDI Lookup + ChromaDB RAG Synthesis
    ├── [UPDATE]     → Database Update Node
    └── [INVENTORY]  → Database Query Node
```

*Security Note: All Firestore writes and reads are scoped to `users/{uid}/*`. Data is never shared or leaked between accounts.*

---

## 🌐 API Endpoints

The FastAPI backend provides robust REST endpoints alongside the streaming chat interface.

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/chat` | Main SSE stream — processes messages via the LangGraph agent |
| `POST` | `/api/chat/resume` | Resumes the agent workflow after a Human-In-The-Loop (HITL) interrupt |
| `POST` | `/api/scan-barcode` | Instant barcode decode, returning GS1 standard data |
| `POST` | `/api/upload-image` | Temporary image upload for vision processing |
| `GET` | `/api/inventory` | Retrieves full user inventory with real-time stock levels |
| `POST` | `/api/inventory` | Add a new item manually |
| `DELETE` | `/api/inventory/{id}` | Delete a specific batch |
| `PATCH` | `/api/inventory/{id}/stock` | Quick-update stock count |
| `GET/POST/DELETE` | `/api/sales` | CRUD operations for the daily sales log |
| `GET` | `/api/reorder-alerts` | Fetch items at or below reorder threshold |
| `GET` | `/api/expired` | Fetch items past or approaching expiry |
| `GET/DELETE` | `/api/sessions` | Manage chat session history |

---

## 🛠️ Installation & Setup

### Prerequisites
- Python 3.11+
- Node.js 18+
- A Firebase project with Firestore and Authentication (Email, Google, Phone) enabled.
- API Keys for Groq and ChromaDB.

### 1. Backend Setup

```bash
# Clone the repository and enter the directory
git clone https://github.com/yourusername/Agentic-Pharmacy.git
cd Agentic-Pharmacy-main

# Install Python dependencies
pip install -r requirements.txt

# Configure environment variables
cp .env.example .env
```
Open `.env` and fill in:
- `GROQ_API_KEY`
- `FIREBASE_CREDENTIALS_PATH` (or `FIREBASE_CREDENTIALS_JSON`)
- `CHROMA_API_KEY`, `CHROMA_TENANT`, `CHROMA_DATABASE`

```bash
# Start the FastAPI backend
python api.py
# Server runs on http://localhost:8000
```

### 2. Frontend Setup

```bash
# Open a new terminal window
cd Agentic-Pharmacy-main/frontend

# Install Node dependencies
npm install

# Configure environment variables
cp .env.example .env
```
Open `frontend/.env` and add your Firebase configuration variables (e.g., `VITE_FIREBASE_API_KEY`, etc.).

```bash
# Start the Vite development server
npm run dev
# App runs on http://localhost:5173
```

### 3. Firebase Configuration details
1. Go to the [Firebase Console](https://console.firebase.google.com/).
2. Enable **Firestore Database**.
3. Enable **Authentication** and turn on the Email/Password, Google, and Phone providers.
4. Go to Project Settings -> Service Accounts, generate a new private key, and save it as `firebase_key.json` in the root of the project (`Agentic-Pharmacy-main/`).
5. Copy your Web App configuration keys into the frontend's `.env` file.

---

## 📁 Project Structure

```text
Agentic-Pharmacy-main/
├── api.py              # FastAPI server + HTTP routes + SSE streaming
├── agent.py            # LangGraph agent definitions and routing logic
├── database.py         # Universal Firestore CRUD operations
├── barcode_scanner.py  # Local zxing-cpp GS1 barcode decoder wrapper
├── ddi_lookup.py       # OpenFDA Drug-Drug Interaction checker
├── requirements.txt    # Pinned Python dependencies
├── .env.example        # Backend environment variables template
├── scripts/            # Dev utilities, eval scripts, migration helpers
│   ├── daily_alert_job.py
│   ├── build_ddi_dataset.py
│   └── evaluation_runner.py
└── frontend/           # React + Vite Web Application
    ├── index.html
    ├── package.json
    ├── .env.example    # Frontend environment variables template
    └── src/
        ├── app/
        │   ├── components/ # Chat UI, Sidebar, Premium Barcode Scanner UI, etc.
        │   ├── context/    # Auth and App state providers
        │   ├── pages/      # Inventory, Sales, Auth, Settings
        │   └── utils/      # API helpers (e.g., authenticatedFetch)
        ├── firebase.ts     # Firebase client initialization
        └── main.tsx        # React mounting point
```

---

<div align="center">

*Built with ❤️ — LangGraph · Groq · Firebase · zxing-cpp · FastAPI · React*

</div>
