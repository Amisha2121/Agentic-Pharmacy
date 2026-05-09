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

PharmaAI is a next-generation pharmacy management system that leverages state-of-the-art agentic AI to streamline daily workflows. Designed for pharmacists, clinicians, and medical staff, the system replaces traditional point-of-sale and inventory software with an intuitive, conversational, and highly automated interface.

By combining deterministic tools (like local GS1 barcode decoding) with advanced large language models (for visual data extraction and clinical Retrieval-Augmented Generation), PharmaAI reduces manual data entry, prevents stockouts, and drastically enhances patient safety by actively monitoring drug-drug interactions.

---

## ✨ Key Features & Modules

### 1. 🤖 Agentic AI Chat Assistant
A LangGraph-powered conversational agent serves as the core operational hub. 
- **Multi-Modal Input:** Interact via text, voice, image uploads, or multi-page PDFs.
- **Context-Aware Routing:** The "Supervisor" node seamlessly routes your query to specialized agents (e.g., Inventory Logging, Database Query, Clinical lookup) while retaining conversational context (e.g., "Add 10 more of that").
- **Human-in-the-Loop (HITL):** If the agent detects an expired medicine during a scan, it pauses execution and requests human approval to either discard the item or move it to a secure quarantine database.

### 2. 📦 Live Inventory Dashboard
A real-time, user-scoped grid displaying stock levels across categories.
- **Visual Health Indicators:** Automatically color-coded stock health bars and urgency badges.
- **Data Portability:** Instant CSV export of the entire inventory or specific categories.
- **Polished UI:** A dark-themed, glass-morphism aesthetic ensuring a professional, clinical environment free of unnecessary "statistical clutter".

### 3. 🔖 Instant Barcode & Vision Extraction
- **Zero-Latency Decoding:** Uses local `zxing-cpp` to instantly decode standard GS1-128, DataMatrix, QR, and EAN barcodes before invoking the LLM.
- **Multimodal Fallback:** If a barcode is missing or unreadable, the system uses the `llama-4-scout-17b` vision model to read the medicine label's text, intelligently extracting the brand name, batch number, expiry date, and category.

### 4. 🛒 Daily Sales Logging
A fast, streamlined interface optimized for point-of-sale operations.
- **Quick-Select Chips:** Dynamically suggests recently sold items, complete with real-time stock badges.
- **Historical Tracking:** Expandable and collapsible historical sales logs, archived nightly.
- **Safety Checks:** Prevents logging sales for out-of-stock items natively in the UI.

### 5. ⛔ Expiry & Reorder Watch
Proactive operational dashboards ensuring pharmacy compliance.
- **Sortable & Filterable Tables:** Easily filter by "Out of Stock", "Low Stock", "Expired", or "Expiring Soon".
- **Dismissible Alerts:** Pharmacists can acknowledge and dismiss alerts with smooth UI fade-out animations.
- **Visual Urgency:** Contextual iconography (Alert Triangles vs. Clocks) immediately communicates the severity of the alert.

### 6. 💊 Clinical Safety Checker
- **FDA OpenFDA Dataset:** Direct deterministic lookup against a local cache of the FDA Drug-Drug Interaction dataset (`ddi_lookup.py`).
- **ChromaDB RAG Synthesis:** If a direct match fails, the agent falls back to a vector search to synthesize clinical advice using general medical knowledge, ensuring the pharmacist always has safety context.

---

## 🏗️ Architecture & Tech Stack

PharmaAI is built on a modern, decoupled architecture designed for speed and security.

### Tech Stack
| Layer | Technology |
|---|---|
| **Frontend** | React 18, TypeScript, Vite, Tailwind CSS, Lucide Icons |
| **Backend** | FastAPI (Python) — REST API + Server-Sent Events (SSE) streaming |
| **Database** | Firebase Firestore (Strictly user-scoped collections) |
| **AI Orchestration** | LangGraph (State Machine Architecture) |
| **LLM (Text)** | `llama-3.1-8b-instant` (via Groq API for ultra-fast generation) |
| **LLM (Vision)** | `llama-4-scout-17b` (Multimodal analysis via Groq) |
| **Speech-to-Text** | Groq Whisper (`whisper-large-v3`) |
| **Barcode Decoder** | `zxing-cpp` (Fast local C++ bindings, no external API calls) |
| **Vector DB** | ChromaDB Cloud (For clinical RAG lookups) |
| **Medical Data** | FDA OpenFDA DDI |

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

*Security Note: All Firestore writes and reads are strictly scoped to `users/{uid}/*`. Data is completely isolated per pharmacist/clinic.*

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

### 1. Firebase Configuration
1. Go to the [Firebase Console](https://console.firebase.google.com/).
2. Create a new project and enable **Firestore Database**.
3. Go to **Authentication** -> **Sign-in method** and enable:
   - Email/Password
   - Google
   - Phone
4. **Backend Setup**: Go to Project Settings -> Service Accounts -> Generate new private key. Save this JSON file in the root of your project directory (e.g., `firebase_key.json`).
5. **Frontend Setup**: Go to Project Settings -> General -> Your Apps. Create a Web App and copy the `firebaseConfig` object values.

### 2. Backend Setup

```bash
# Clone the repository and enter the directory
git clone https://github.com/yourusername/Agentic-Pharmacy.git
cd Agentic-Pharmacy-master

# Install Python dependencies
pip install -r requirements.txt

# Configure environment variables
cp .env.example .env
```
Open the newly created `.env` file and fill in:
- `GROQ_API_KEY`
- `FIREBASE_CREDENTIALS_PATH` (Set this to the name of your downloaded JSON key from step 1.4)
- `CHROMA_API_KEY`, `CHROMA_TENANT`, `CHROMA_DATABASE`

```bash
# Start the FastAPI backend
python api.py
# Server runs on http://localhost:8000
```

### 3. Frontend Setup

```bash
# Open a new terminal window
cd Agentic-Pharmacy-master/frontend

# Install Node dependencies
npm install

# Configure environment variables
# Create a .env file in the frontend directory
```
Create `frontend/.env` and add your Firebase configuration variables from step 1.5:
```env
VITE_FIREBASE_API_KEY="your_api_key"
VITE_FIREBASE_AUTH_DOMAIN="your_project_id.firebaseapp.com"
VITE_FIREBASE_PROJECT_ID="your_project_id"
VITE_FIREBASE_STORAGE_BUCKET="your_project_id.firebasestorage.app"
VITE_FIREBASE_MESSAGING_SENDER_ID="your_sender_id"
VITE_FIREBASE_APP_ID="your_app_id"
VITE_FIREBASE_MEASUREMENT_ID="your_measurement_id"
```

```bash
# Start the Vite development server
npm run dev
# App runs on http://localhost:5173
```

---

## 📁 Project Structure

```text
Agentic-Pharmacy-master/
├── api.py              # FastAPI server + HTTP routes + SSE streaming
├── agent.py            # LangGraph agent definitions and routing logic
├── database.py         # Universal Firestore CRUD operations
├── barcode_scanner.py  # Local zxing-cpp GS1 barcode decoder wrapper
├── ddi_lookup.py       # OpenFDA Drug-Drug Interaction checker
├── requirements.txt    # Pinned Python dependencies
├── .env.example        # Backend environment variables template
├── scripts/            # Dev utilities, eval scripts, migration helpers
└── frontend/           # React + Vite Web Application
    ├── index.html
    ├── package.json
    ├── .env            # Frontend environment variables (Firebase config)
    └── src/
        ├── app/
        │   ├── components/ # Message bubbles, Sidebars, Modals, Chat UI
        │   ├── context/    # Auth context provider
        │   ├── pages/      # Live Inventory, Daily Sales, Expirations, Chat
        │   └── firebase.ts # Firebase client initialization
        └── main.tsx        # React mounting point
```

---

<div align="center">

*Built with ❤️ — LangGraph · Groq · Firebase · zxing-cpp · FastAPI · React*

</div>
