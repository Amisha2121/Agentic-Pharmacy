<div align="center">

# 🏥 Agentic Pharmacy AI

![React](https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)
![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)
![FastAPI](https://img.shields.io/badge/FastAPI-009688?style=for-the-badge&logo=fastapi&logoColor=white)
![Python](https://img.shields.io/badge/Python-3.11+-3776AB?style=for-the-badge&logo=python&logoColor=white)
![TailwindCSS](https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)
![Firebase](https://img.shields.io/badge/Firebase-FFCA28?style=for-the-badge&logo=firebase&logoColor=black)
![LangGraph](https://img.shields.io/badge/LangGraph-000000?style=for-the-badge)
![zxing-cpp](https://img.shields.io/badge/zxing--cpp-GS1%20Barcode-brightgreen?style=for-the-badge)

**A sleek, production-grade AI pharmacy management system.**  
Modern dashboard to track real-time inventory, predict reorder cycles, manage expirations, process daily sales, and interact directly with an agentic LLM via text, voice commands, and attachments. Now with **instant GS1 barcode scanning** — point your camera at any medicine box and the system reads batch number and expiry from the barcode before the AI even runs.

</div>

---

- [Features](#-features)
- [Dashboard Tabs](#️-dashboard-tabs)
- [Installation](#️-installation--setup)
- [Architecture](#️-architecture)

---

### 🎙️ Web Speech API & Voice Input
Interact entirely hands-free. Use the built-in **Voice Input widget** powered by the browser's native API.
- Click the microphone in the chat bar and speak your query.
- Spoken audio dynamically converts into text and is natively fed into the backend pharmacy brain.

### 📦 Live Stock Extractor & Management
Inventory updates happen in **real-time** directly from the UI and backend:
- Global inventory spread categorizes medicines beautifully (e.g. `Pain & Fever`, `Cold & Allergy`).
- Edit, delete, or create products visually without needing complex database management tools.

### 📥 Spreadsheet/CSV Automated Exports
Need hard reports? 
- Instantly export your absolute full active database via the **Global Export** button.
- Optionally open a specific category to export a tightly formatted spreadsheet of only those drugs.

### 🚨 Smart Reorder ALerts
Proactive stock awareness to prevent missing a patient's medicine:
- Visually flags drugs reaching low territory (e.g., `< 10 stock` glows amber)
- Alerts critically out of scale medications (e.g., `0 stock` glows red).
- Instantly dismiss acknowledged restocking events to keep the workspace clean.

### ⛔ Upcoming Expiration Watch
Scans your entire inventory and compares it to live time.
- **Proactive Early Warnings**: Unlike standard system reacting *after* an item expires, PharmaAI warns 90 days out to allow safe discarding procedures or clearance!
- Automatically flags medicines running up on the expiration edge and allows similar instant-dismissal workflows.

### 🔖 GS1 Barcode & DataMatrix Scanning *(New)*
Instant, 100% accurate batch and expiry data directly from medicine packaging barcodes — no OCR required.
- **Instant Local Decode**: As soon as you attach an image, the backend runs `zxing-cpp` locally (no API call) to decode GS1-128, DataMatrix, QR, and EAN barcodes.
- **Live Badge in UI**: A green `DataMatrix ✅ | Batch: BN123 | Exp: 2027-06-30` badge appears in the chat bar immediately after image selection.
- **Ground-Truth Injection**: Verified batch/expiry from the barcode are **pinned** into the LLM prompt — the Vision AI only needs to identify the brand name and category, eliminating date-reading errors entirely.
- **Dual-Stage Fallback**: If no barcode is detected (old or damaged labels), the system falls back to full MultiModal LLM Vision scanning with Indian medication label rules.
- **GS1 Application Identifiers** decoded: `01` GTIN · `10` Batch/Lot · `17` Expiry · `11` Manufacture Date · `37` Quantity.

---

## 🖥️ Dashboard Tabs
| Tab | What it does |
|---|---|
| **💬 Assistant Chat** | The main conversational AI hub. Takes voice, image attachments, and text. |
| **📋 Live Inventory** | Real-time grids of active batches with counts and comprehensive CSV export tools. |
| **🛒 Log Daily Sales** | Intuitive fast interface to deduct and track purchases. |
| **🚨 Reorder Alerts** | Pinpoints low-stock and dead-stock. |
| **⛔ Expirations & Alerts** | Early warning system for upcoming and past expiration dates. |
| **⚙️ Account Settings** | Dynamically manage display username globally synced across all interfaces. |

---

## 🏗️ Architecture & Pipeline

PharmaAI operates on a robust, multi-agent AI pipeline driven by LangGraph, backed by a FastAPI server and a React frontend.

**Technology Stack:**

| Layer | Technology |
|---|---|
| Frontend | React 18 + TypeScript + Vite + TailwindCSS |
| Backend | FastAPI (Python) — REST + SSE streaming |
| Database | Firebase Firestore (live, schema-less) |
| AI Orchestration | LangGraph state machine + Groq API |
| LLM Models | `llama-3.3-70b-versatile` (text) · `llama-4-scout-17b` (vision) |
| Voice | Groq Whisper `whisper-large-v3` |
| Barcode Decoding | `zxing-cpp` — GS1-128, DataMatrix, QR, EAN (local, no API) |
| Vector Search | ChromaDB Cloud (clinical RAG fallback) |
| Drug Interactions | FDA OpenFDA DDI dataset via `ddi_lookup.py` |

### 🧠 The LangGraph Agentic Pipeline

The core intelligence of PharmaAI is structured as a state machine where a Supervisor node routes user queries to specialized worker agents based on context.

1. **Input Processing:** The frontend captures text, voice (transcribed via Whisper), or image uploads (medicine boxes).
2. **🔖 Stage 0 — Barcode Pre-Scan *(runs before the LLM)*:** On any image upload, `barcode_scanner.py` runs `zxing-cpp` locally to decode GS1-128, DataMatrix, QR, and EAN barcodes. If batch number and expiry are found, they are pinned as verified ground truth — the LLM is told **not** to re-read them from the label. A live badge appears in the UI immediately.
3. **Supervisor Node:** Analyzes the user's input and categorizes the intent to route correctly:
   - **Image Uploaded:** Routes immediately to the *Vision Extraction Node*.
   - **"ADD" Intent:** Routes to the *Text Add Node* for natural language inventory entry.
   - **"CLINICAL" Intent:** Routes to the *Clinical Knowledge Node* for drug interaction checks.
   - **"UPDATE" Intent:** Routes to the *Database Update Node* to modify existing stock details.
   - **"INVENTORY" / "GENERAL" Intent:** Routes to the *Database Query Node* to answer stock queries.
4. **Specialized Worker Agents:**
   - **Vision Extraction Node:** Receives barcode-verified batch/expiry (if found) and only asks the multimodal LLM to identify the brand name and category. If no barcode was detected, full Indian label OCR rules apply (Mfg. Date vs. Exp. Date disambiguation).
   - **Human-in-the-Loop (HITL) Approval:** If the Vision Node detects an *expired* medication, it pauses the pipeline. The frontend prompts the pharmacist for manual review. If approved, the item is sent to the *Quarantine* database; if rejected, it is discarded.
   - **Text Add & Update Nodes:** Extract structured JSON (batch, name, expiry, category, stock) from natural language instructions and dispatch updates to Firestore.
   - **Clinical Agent (DDI & RAG):** First queries a structured FDA Drug-Drug Interaction dataset. If no direct match is found, it falls back to a **ChromaDB Vector Database** for Retrieval-Augmented Generation (RAG) to provide clinical insights.
   - **Query Node:** Given the current real-time state of the database, answers auditory or textual questions regarding stock availability and predicted shortages.

### 🌐 REST API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/chat` | SSE stream — runs the LangGraph agent |
| `POST` | `/api/chat/resume` | Resume after HITL interrupt |
| `POST` | `/api/scan-barcode` | **Instant barcode decode** — returns GS1 data |
| `POST` | `/api/upload-image` | Plain image upload (barcode-scan fallback) |
| `GET` | `/api/inventory` | Full inventory with stock levels |
| `POST` | `/api/inventory` | Add item manually |
| `DELETE` | `/api/inventory/{id}` | Delete a batch |
| `PATCH` | `/api/inventory/{id}/stock` | Update stock count |
| `GET/POST/DELETE` | `/api/sales` | Daily sales log CRUD |
| `GET` | `/api/reorder-alerts` | Low-stock alerts |
| `GET` | `/api/expired` | Upcoming/past expiry watch |
| `GET/DELETE` | `/api/sessions` | Chat session history |

---

## 🛡️ Installation & Setup

PharmaAI is divided into two separate architectures (Frontend and Backend) working closely together.

### 1. Terminal 1 - Configure & Run Backend Server
Ensure Python 3.9+ is installed.

```bash
cd /path/to/AgenticAI
pip install -r requirements.txt
python api.py
```
*Note: Make sure your `firebase_key.json` and `.env` live in this root directory.*

### 2. Terminal 2 - Build & Run Frontend Application
Ensure Node.js 18+ is installed.

```bash
cd /path/to/AgenticAI/frontend
npm install
npm run dev
```

### 3. Log In  
Navigate to `http://localhost:5173`.
Log in securely using your configured application defaults:
- **Username**: `rxai`
- **Password**: `pharma2026`

*You may customize your Display Name locally by clicking your Account panel.*

---

<div align="center">

*Built with ❤️ — LangGraph · Groq · Firebase · zxing-cpp · FastAPI · React*

</div>
