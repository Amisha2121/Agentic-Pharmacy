# 🏥 Agentic Pharmacy AI — Intelligent Inventory & Safety System

A production-grade, multi-agent pharmacy management system built with **LangGraph**, **Groq LLaMA 4**, and **Firebase**. It automates drug inventory logging from label photos, enforces human-in-the-loop safety checkpoints for expired medication, and grounds clinical interaction queries in real FDA drug data.

---

## ✨ Key Features

### 🤖 Multi-Agent LangGraph Workflow
The app is a state machine with four intelligent nodes, routed automatically based on the user's intent:

| Node | Trigger | What it does |
|---|---|---|
| **Vision Agent** | Image uploaded | Reads medicine label → extracts batch, expiry, name, category |
| **Human Approval Gate** | Expired item detected | Pauses graph, waits for pharmacist approval before any write |
| **DDI Lookup Tool** | Drug interaction query | Exact pandas lookup in FDA dataset — no AI guessing |
| **Clinical Knowledge** | General medical question | ChromaDB vector search → LLM synthesis |

### 🛑 Human-in-the-Loop (HITL) Checkpoint
When the Vision Agent detects an **expired medication**, the LangGraph workflow **pauses** using `interrupt()`. The Streamlit dashboard shows:

> ⚠️ *"Critical: Attempting to log expired medication. Approve moving [Drug] to Quarantine DB?"*

The pharmacist clicks **✅ Approve** (routes to a separate `quarantine` Firestore collection) or **❌ Reject** (discards entirely). The graph resumes via `Command(resume=…)`. Nothing is written to Firebase until a human decides.

### 🔬 Structured Drug-Drug Interaction (DDI) Lookup
Clinical queries like *"Can I take Paracetamol with Warfarin?"* are answered by a **deterministic pandas tool**, not an LLM:

- **560 drugs** with verbatim FDA drug label interaction text
- Dataset built from the [Kaggle 11k medicine dataset](https://www.kaggle.com/datasets/singhnavjot2062001/11000-medicine-details) cross-referenced against the **FDA openFDA Drug Labels API**
- **INN synonym map**: `Paracetamol → Acetaminophen`, `Kivexa → Abacavir`, `Salbutamol → Albuterol`, etc.
- Falls back to ChromaDB vector search only if neither drug is in the FDA dataset

### 📸 Multimodal Vision Scanning
Upload 1–6 photos of a medicine package. The LLaMA 4 Scout vision model:
- Reads batch numbers, manufacturing and **expiry dates** (correctly ordered on Indian labels)
- Auto-generates batch IDs for unreadable barcodes
- Supports user-provided expiry hints (`"exp 11/2026"`)
- Detects suspiciously old dates (likely Mfg. Date misread) with a warning

---

## 🏗️ Technical Architecture

```
User Input (text / images)
        │
        ▼
    Route Intent (LLM classifier)
        │
   ┌────┴─────────────────────────┐
   │                              │
Vision Extraction Node    Clinical / Inventory / Update Node
   │
   ▼
Human Approval Gate ←── interrupt() pauses here if expired
   │
   └── Approve → insert_quarantine() → Firestore "quarantine"
   └── Reject  → discard, nothing written
```

**Stack:**
- **LLM**: Groq (`llama-4-scout-17b` for vision, `llama-3.3-70b` for text)
- **Orchestration**: LangGraph with `MemorySaver` checkpointer
- **Database**: Firebase Firestore (`batches` + `quarantine` collections)
- **Vector DB**: ChromaDB Cloud
- **DDI Data**: FDA openFDA Drug Labels API → pandas CSV lookup
- **UI**: Streamlit

---

## 🛠️ Installation & Setup

### 1. Clone & Install

```bash
git clone https://github.com/Amisha2121/Agentic-Pharmacy.git
cd Agentic-Pharmacy
python -m venv venv
venv\Scripts\activate        # Windows
pip install -r requirements.txt
pip install "kagglehub[pandas-datasets]"
```

### 2. Environment Variables

Create a `.env` file:

```env
# Groq (LLM + Vision)
GROQ_API_KEY=your_groq_api_key

# Firebase
FIREBASE_CREDENTIALS_PATH=firebase_key.json

# ChromaDB Cloud
CHROMA_API_KEY=your_chroma_api_key
CHROMA_TENANT=your_tenant
CHROMA_DATABASE=your_database
```

Place your Firebase service account JSON as `firebase_key.json` in the project root.

### 3. Build the DDI Dataset (one-time)

```bash
python build_full_ddi_bulk.py
```

This downloads the Kaggle medicine list, scans 30,000 FDA drug labels, and saves `data/fda_ddi.csv` (~560 drugs with full interaction text).

---

## 🖥️ Usage

```bash
venv\Scripts\python.exe -m streamlit run main.py
```

Open **http://localhost:8501**

### Dashboard Tabs

| Tab | Description |
|---|---|
| **💬 Assistant Chat** | Scan labels, ask DDI questions, query inventory, update records |
| **📋 Live Inventory** | Browse stock by category (Tablets, Syrups, Capsules…) |

---

## �️ Safety & Accuracy

| Mechanism | What it prevents |
|---|---|
| **HITL Checkpoint** | AI cannot write expired drugs to inventory without pharmacist approval |
| **Quarantine Collection** | Approved-expired items are stored separately, never mixing with live stock |
| **FDA-grounded DDI lookup** | Drug interaction answers cite verbatim FDA label text — no hallucination |
| **Expiry sanity check** | Dates > 3 years old flagged as likely Mfg. Date misread |
| **Temporal injection** | Today's date injected into every inventory prompt |

---

## 📁 Project Structure

```
AgenticAI/
├── main.py                  # Streamlit UI + HITL approval logic
├── agent.py                 # LangGraph graph, all nodes, MemorySaver
├── database.py              # Firebase Firestore helpers (batches + quarantine)
├── ddi_lookup.py            # Pandas-based FDA DDI lookup tool + synonym map
├── build_full_ddi_bulk.py   # One-time script: builds data/fda_ddi.csv
├── knowledge_base.py        # ChromaDB vector seeding
├── daily_audit.py           # Standalone inventory audit script
├── data/
│   └── fda_ddi.csv          # 560-drug FDA interaction dataset
└── firebase_key.json        # Firebase credentials (not committed)
```