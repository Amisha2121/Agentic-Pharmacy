<div align="center">

# 🏥 Agentic Pharmacy AI

![React](https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)
![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)
![FastAPI](https://img.shields.io/badge/FastAPI-009688?style=for-the-badge&logo=fastapi&logoColor=white)
![Python](https://img.shields.io/badge/Python-3.11+-3776AB?style=for-the-badge&logo=python&logoColor=white)
![TailwindCSS](https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)
![Firebase](https://img.shields.io/badge/Firebase-FFCA28?style=for-the-badge&logo=firebase&logoColor=black)
![LangGraph](https://img.shields.io/badge/LangGraph-000000?style=for-the-badge)

**A sleek, production-grade AI pharmacy management system.**  
Modern dashboard to track real-time inventory, predict reorder cycles, manage expirations, process daily sales, and interact directly with an agentic LLM via text, voice commands, and attachments. Scan medicine labels with AI, track stock in real-time, check drug interactions from FDA data, and enforce pharmacist approval for expired medications.

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

## 🏗️ Architecture

**Stack:**

| Layer | Technology |
|---|---|
| Frontend Framework | React + TypeScript + Vite |
| Styling | TailwindCSS + Lucide Icons |
| Backend Server | FastAPI (Python) |
| Database | Firebase Firestore |
| LLM Models | Various LangGraph nodes & Vision APIs |

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

*PharmaAI platform architecture updated successfully.*

</div>
