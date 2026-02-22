# 🏥 Agentic Pharmacy: AI-Driven Inventory & Safety System

An intelligent, multi-agent pharmacy management system that automates drug restocking, clinical queries, and safety alerts using **Gemini 2.5 Flash-Lite**, **LangGraph**, and **Twilio**.

## 🚀 Key Features

* **Multimodal AI Vision**: Automatically extracts batch numbers, expiry dates, and product categories from medicine labels using `gemini-2.5-flash-lite`.
* **Agentic Routing**: Uses a semantic router to decide whether a query requires SQL database access, Vector search (RAG), or vision processing.
* **Automated Safety Alerts**: Proactively audits inventory and sends **SMS notifications** via Twilio to your mobile device when expired or near-expiry batches are detected.
* **Dual-Database Architecture**:
* **PostgreSQL (Supabase)**: For structured inventory data and transaction history.
* **ChromaDB**: For unstructured clinical guidelines and medical knowledge (RAG).


* **Dynamic Dashboard**: A modern Streamlit UI featuring categorized inventory cards and a live alert center.

---

## 🏗️ Technical Architecture

The system is built as a state machine using **LangGraph**, ensuring reliable transitions between different AI capabilities:

1. **Vision Node**: Processes uploaded images with **exponential backoff** to handle API rate limits gracefully.
2. **Clinical Knowledge Node**: Performs semantic search on local medical documents to answer safety questions.
3. **Inventory Node**: Executes grounded SQL queries against the inventory, with built-in **temporal awareness** (using real-time system dates).
4. **Auto-Audit Script**: A standalone background task that runs a daily check and triggers mobile notifications.

---

## 🛠️ Installation & Setup

### 1. Clone the Repository

```bash
git clone https://github.com/your-username/pharmacy-ai-agent.git
cd pharmacy-ai-agent

```

### 2. Set Up Virtual Environment

```bash
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt

```

### 3. Environment Variables

Create a `.env` file in the root directory:

```env
# Gemini API
GOOGLE_API_KEY=your_gemini_api_key

# Supabase / PostgreSQL
DB_URL=your_supabase_postgresql_url

# Twilio (SMS Notifications)
TWILIO_ACCOUNT_SID=your_sid
TWILIO_AUTH_TOKEN=your_token
TWILIO_PHONE_NUMBER=your_twilio_number
MY_PHONE_NUMBER=your_mobile_number

# AWS (Optional - if using SNS)
AWS_ACCESS_KEY_ID=your_key
AWS_SECRET_ACCESS_KEY=your_secret

```

---

## 🖥️ Usage

### Run the Interactive Dashboard

```bash
streamlit run main.py

```

### Run the Automated Daily Audit

To test the automatic mobile notification system without opening the UI:

```bash
python auto_notif.py

```

---

## 📊 Dashboard Preview

| Tab | Description |
| --- | --- |
| **💬 Assistant Chat** | Chat with the AI to scan labels, ask clinical questions, or update records. |
| **📋 Live Inventory** | View products sorted into square category boxes (Tablets, Syrups, etc.). |
| **🔔 Alert Notifications** | See critical items expiring soon and trigger manual mobile alerts. |

---

## 🛡️ Grounding & Hallucination Prevention

To ensure pharmacy-grade accuracy, this agent implements:

* **Negative Constraints**: The AI is forbidden from "guessing" stock levels not found in the SQL database.
* **Time Awareness**: Injects the current system date (`YYYY-MM-DD`) into every prompt to prevent errors in expiry reasoning.
* **Deterministic Logic**: Uses Python's `datetime` library for alert calculations rather than relying solely on LLM logic.

---