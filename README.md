# 🏥 Agentic Pharmacy AI

<div align="center">

![Python](https://img.shields.io/badge/Python-3.11+-3776AB?style=for-the-badge&logo=python&logoColor=white)
![Streamlit](https://img.shields.io/badge/Streamlit-FF4B4B?style=for-the-badge&logo=streamlit&logoColor=white)
![Firebase](https://img.shields.io/badge/Firebase-FFCA28?style=for-the-badge&logo=firebase&logoColor=black)
![LangGraph](https://img.shields.io/badge/LangGraph-000000?style=for-the-badge&logo=langchain&logoColor=white)
![Groq](https://img.shields.io/badge/Groq_LLaMA_4-F54D27?style=for-the-badge)

**A production-grade, multi-agent pharmacy management system.**  
Scan medicine labels with AI, track stock in real-time, check drug interactions from FDA data, and enforce pharmacist approval for expired medications.

</div>

---

## 📋 Table of Contents

- [Features](#-features)
- [Dashboard Tabs](#️-dashboard-tabs)
- [Architecture](#️-architecture)
- [Safety Mechanisms](#️-safety--accuracy)
- [Installation](#️-installation--setup)
- [Project Structure](#-project-structure)
- [Firestore Schema](#-firestore-collections)

---

## ✨ Features

### 📸 AI-Powered Label Scanning
Upload 1–6 photos of any medicine package. The **LLaMA 4 Scout** vision model reads:
- Batch number, product name, category, expiry date
- Stock quantity (auto-extracted from label text, e.g. *"30 tablets"*)
- Correctly distinguishes Manufacturing Date from Expiry Date on Indian packaging
- **Blocks expired products outright** — rejects logging with a clear message
- Supports manual expiry hints: `"exp 11/2026"`

### 🤖 Multi-Agent LangGraph Workflow

| Agent Node | Trigger | Action |
|---|---|---|
| **Vision Agent** | Image uploaded | Extracts all label fields, validates expiry |
| **HITL Gate** | Expired item detected | Pauses with `interrupt()` — waits for pharmacist decision |
| **DDI Lookup** | Drug interaction query | Deterministic FDA dataset lookup — zero hallucination |
| **Clinical Knowledge** | General medical question | ChromaDB vector search → LLM synthesis |

### 🛑 Human-in-the-Loop Safety
When an expired medication is scanned, the workflow **pauses completely**. The pharmacist sees the product details and must click:
- **✅ Approve** → moved to a separate `quarantine` Firestore collection
- **❌ Reject** → discarded, nothing written to database

### 📦 Real-Time Stock Sync
Stock updates happen **instantly** — no overnight batch, no latency:

```
Log sale (8 × Elements)  →  batches.Number: 60 → 52  (immediate)
Edit qty (8 → 10)         →  batches.Number: 52 → 50  (diff applied)
Delete entry              →  batches.Number: 50 → 52  (restored)
```

A `stock_deducted` flag on each log entry prevents any double-deduction.

### 🔬 FDA-Grounded DDI Lookup
*"Can I take Paracetamol with Warfarin?"* — answered with verbatim FDA label text:
- **560 drugs** sourced from openFDA Drug Labels API
- **INN synonym map**: `Paracetamol → Acetaminophen`, `Salbutamol → Albuterol`, etc.
- **RapidFuzz typo tolerance** (≥90% threshold) for misspelled drug names
- ChromaDB fallback for drugs not in the FDA dataset

### ⛔ Expired Item Detection
Scans the entire inventory against today's date. Expired items shown with severity badges:

| Badge | Meaning |
|---|---|
| 🟠 | Expired within 30 days |
| 🔴 | Expired 1–12 months ago |
| ⚫ | Expired over a year ago |

---

## 🖥️ Dashboard Tabs

| Tab | What it does |
|---|---|
| **💬 Assistant Chat** | Scan labels, ask DDI questions, query current inventory |
| **📋 Live Inventory** | Category-grid view of all batches with stock numbers |
| **🛒 Log Daily Sales** | Add / edit / delete sales with live stock feedback |
| **🚨 Reorder Alerts** | Medicines at or near zero stock |
| **⛔ Expired Items** | Full inventory scan for expired medicines |

---

## 🏗️ Architecture

```
User Input (text / images)
        │
        ▼
  Route Intent (LLM router)
        │
   ┌────┴──────────────────────────────┐
   │                                   │
Vision Agent                  Clinical / DDI / Inventory
   │
   ├── Expired? ──YES──► interrupt() ──► HITL Gate
   │                                        │
   │                                  Approve/Reject
   │
   └── Valid ──► add_to_sales_log()
                      │
                      └──► _adjust_stock_by_batch()  ← IMMEDIATE
```

**Stack:**

| Layer | Technology |
|---|---|
| LLM (Vision) | Groq `llama-4-scout-17b-16e-instruct` |
| LLM (Text) | Groq `llama-3.3-70b-versatile` |
| Orchestration | LangGraph + MemorySaver checkpointer |
| Database | Firebase Firestore |
| Vector DB | ChromaDB Cloud |
| DDI Data | FDA openFDA API → pandas CSV |
| UI | Streamlit |

---

## 🛡️ Safety & Accuracy

| Mechanism | Protects against |
|---|---|
| **HITL Checkpoint** | AI writing expired drugs to live inventory |
| **Hard expiry block** | Any expired medicine being logged at all |
| **Quarantine collection** | Expired items mixing with live stock |
| **FDA-sourced DDI** | Hallucinated drug interaction answers |
| **Expiry sanity check** | Mfg. Date being misread as Expiry Date |
| **Stock floor at 0** | Stock going negative |
| **`stock_deducted` flag** | Same sale deducting stock twice |

---

## 🛠️ Installation & Setup

### 1. Clone & Install

```bash
git clone https://github.com/Amisha2121/Agentic-Pharmacy.git
cd Agentic-Pharmacy
python -m venv venv
venv\Scripts\activate        # Windows
# source venv/bin/activate   # macOS / Linux
pip install -r requirements.txt
```

### 2. Environment Variables

Create a `.env` file in the project root:

```env
GROQ_API_KEY=your_groq_api_key

FIREBASE_CREDENTIALS_PATH=firebase_key.json

CHROMA_API_KEY=your_chroma_api_key
CHROMA_TENANT=your_tenant
CHROMA_DATABASE=your_database
```

Place your Firebase service account key as `firebase_key.json` in the project root.

### 3. Build DDI Dataset *(one-time)*

```bash
python build_full_ddi_bulk.py
```

Downloads the Kaggle medicine list, queries 30 000 FDA drug labels, saves `data/fda_ddi.csv`.

### 4. Run

```bash
venv\Scripts\python.exe -m streamlit run main.py
# or on macOS/Linux:
# streamlit run main.py
```

Open **http://localhost:8501**

---

## 📁 Project Structure

```
AgenticAI/
├── main.py                  # Streamlit app — 5 tabs, HITL approval, page-load stock sync
├── agent.py                 # LangGraph graph, all agent nodes, expiry blocking logic
├── database.py              # Firebase helpers — real-time stock, sales log, archival
├── inventory_sales_ui.py    # Sales, Reorder Alerts, and Expired Items tab UIs
├── ddi_lookup.py            # FDA DDI lookup + INN synonyms + RapidFuzz matching
├── knowledge_base.py        # ChromaDB vector store seeding
├── daily_audit.py           # Standalone CLI inventory audit
├── workflow_tracker.py      # Live LangGraph node visualiser for Streamlit
├── build_full_ddi_bulk.py   # One-time DDI dataset builder
├── data/
│   └── fda_ddi.csv          # 560-drug FDA interaction dataset
├── DATABASE_SCHEMA.md       # Firestore schema reference
├── ARCHITECTURE.md          # DDI fuzzy matching architecture
├── IMPLEMENTATION_SUMMARY.md
└── INVENTORY_TRACKING_GUIDE.md
```

---

## 📊 Firestore Collections

| Collection | Purpose |
|---|---|
| `batches` | Live inventory — one doc per batch, `Number` field = current stock |
| `daily_sales_log` | Today's sale entries — flat docs with `stock_deducted` flag |
| `archived_sales_log` | Permanent past-day sales history (moved from log each page load) |
| `quarantine` | HITL-approved expired medicines, isolated from live stock |

---

<div align="center">

*Version 2.0 · Updated 2026-03-10*

</div>