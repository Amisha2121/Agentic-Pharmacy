<div align="center">

# 💊 Agentic Pharmacy

![React](https://img.shields.io/badge/React_18-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)
![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)
![FastAPI](https://img.shields.io/badge/FastAPI-009688?style=for-the-badge&logo=fastapi&logoColor=white)
![Python](https://img.shields.io/badge/Python_3.11+-3776AB?style=for-the-badge&logo=python&logoColor=white)
![Firebase](https://img.shields.io/badge/Firebase-FFCA28?style=for-the-badge&logo=firebase&logoColor=black)
![LangGraph](https://img.shields.io/badge/LangGraph-000000?style=for-the-badge)

**AI-powered pharmacy management system with intelligent inventory tracking, multimodal barcode scanning, and conversational AI assistant.**

[Live Demo](https://pharmaai-8bb36.web.app) • [Report Bug](https://github.com/Amisha2121/Agentic-Pharmacy/issues) • [Request Feature](https://github.com/Amisha2121/Agentic-Pharmacy/issues)

</div>

---

## 📖 About the Project

Agentic Pharmacy is a modern pharmacy management system that combines AI-powered automation with an intuitive user interface. Built for pharmacists and medical staff, it streamlines inventory management, sales tracking, and operational workflows through conversational AI and intelligent automation.

The system features a bold, editorial design with complete dark mode support, per-account data isolation, and real-time inventory tracking. By integrating multimodal AI capabilities with traditional pharmacy operations, Agentic Pharmacy reduces manual data entry and enhances operational efficiency.

---

## ✨ Key Features

### 🤖 AI Chat Assistant
A LangGraph-powered conversational agent that serves as your operational hub.
- **Multi-Modal Input:** Text, voice, image uploads, and PDF processing
- **Context-Aware:** Maintains conversation context for natural interactions
- **Smart Routing:** Automatically routes queries to specialized agents
- **Human-in-the-Loop:** Requests approval for critical operations like expired medicine handling

### 📊 Dashboard & Analytics
Real-time overview of pharmacy operations.
- **Today's Overview:** Key metrics including total items, low stock alerts, and expiring items
- **Quick Access:** Fast navigation to all major features
- **Dark Mode Support:** Complete theme switching with optimized colors
- **Clean Design:** Bold editorial style with Inter font family

### 📦 Live Inventory Management
Comprehensive inventory tracking with real-time updates.
- **Stock Monitoring:** Visual health indicators and urgency badges
- **Category Organization:** Organized by medicine categories
- **Batch Tracking:** Track individual batches with expiry dates
- **CSV Export:** Export inventory data for reporting
- **Per-Account Isolation:** Complete data separation between users

### 🔖 Barcode Scanning
Instant barcode decoding with AI fallback.
- **Local Decoding:** Fast GS1-128, DataMatrix, QR, and EAN barcode processing
- **Vision Extraction:** AI-powered label reading when barcodes are unreadable
- **Automatic Data Entry:** Extracts brand name, batch number, expiry date, and category

### � Daily Sales Logging
Streamlined point-of-sale interface.
- **Quick Entry:** Fast sales logging with real-time stock updates
- **Stock Validation:** Prevents sales of out-of-stock items
- **Sales History:** Standalone sales history page with date range filtering
- **Statistics:** Daily, weekly, and monthly sales analytics
- **CSV Export:** Download sales data for accounting

### ⚠️ Alerts & Monitoring
Proactive inventory management.
- **Reorder Alerts:** Automatic notifications for low stock items
- **Expiry Tracking:** Monitor items approaching expiration
- **Visual Urgency:** Color-coded alerts with severity indicators
- **Sortable Tables:** Easy filtering and organization

### ⚙️ Settings & Customization
Complete control over your pharmacy profile.
- **Profile Management:** Update name, email, and contact information
- **Theme Switching:** Light and dark mode with smooth transitions
- **Notifications:** Customizable alert preferences
- **Privacy Controls:** Data export and history management
- **Account Security:** Secure authentication with Firebase

---

## 🏗️ Architecture & Tech Stack

### Frontend
- **Framework:** React 18 with TypeScript
- **Build Tool:** Vite
- **Styling:** Tailwind CSS with custom design system
- **UI Components:** shadcn/ui components
- **Icons:** Lucide React
- **Routing:** React Router v6
- **Font:** Inter (Google Fonts)
- **Hosting:** Firebase Hosting

### Backend
- **Framework:** FastAPI (Python)
- **API Style:** REST + Server-Sent Events (SSE) for streaming
- **Database:** Firebase Firestore with per-user data isolation
- **Authentication:** Firebase Auth (Email, Google, Phone)

### AI & ML
- **Orchestration:** LangGraph (State Machine Architecture)
- **Text LLM:** `llama-3.1-8b-instant` via Groq API
- **Vision LLM:** `llama-4-scout-17b` via Groq API
- **Speech-to-Text:** Groq Whisper (`whisper-large-v3`)
- **Vector DB:** ChromaDB Cloud for RAG
- **Barcode Decoder:** `zxing-cpp` (Local C++ bindings)

### Design System
- **Colors:** `#16a34a` (green), `#0F172A` (near black), `#F8FAFC` (off-white)
- **Borders:** 2px solid black borders on all components
- **Buttons:** Pill-shaped (border-radius: 999px)
- **Cards:** Rounded corners (border-radius: 24px)
- **Typography:** Inter font family, bold weights, uppercase labels
- **Dark Mode:** Complete theme support with smooth transitions

---

## 🌐 API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/chat` | SSE stream for AI chat processing via LangGraph |
| `POST` | `/api/chat/resume` | Resume agent workflow after HITL interrupt |
| `POST` | `/api/scan-barcode` | Decode barcode and return GS1 data |
| `POST` | `/api/upload-image` | Upload image for vision processing |
| `GET` | `/api/inventory` | Get full user inventory with stock levels |
| `POST` | `/api/inventory` | Add new inventory item |
| `DELETE` | `/api/inventory/{id}` | Delete specific batch |
| `PATCH` | `/api/inventory/{id}/stock` | Update stock count |
| `GET` | `/api/sales` | Get sales history with date filtering |
| `POST` | `/api/sales` | Log new sale |
| `DELETE` | `/api/sales/{id}` | Delete sale record |
| `GET` | `/api/reorder-alerts` | Get items below reorder threshold |
| `GET` | `/api/expired` | Get expired or expiring items |
| `GET` | `/api/sessions` | Get chat session history |
| `DELETE` | `/api/sessions/{id}` | Delete chat session |

All endpoints require Firebase authentication token in the `Authorization` header.

---

## 🛠️ Installation & Setup

### Prerequisites
- Python 3.11+
- Node.js 18+
- Firebase project with Firestore and Authentication enabled
- API keys for Groq and ChromaDB

### 1. Clone Repository

```bash
git clone https://github.com/Amisha2121/Agentic-Pharmacy.git
cd Agentic-Pharmacy
```

### 2. Firebase Setup

1. Create a Firebase project at [Firebase Console](https://console.firebase.google.com/)
2. Enable **Firestore Database** in test mode
3. Enable **Authentication** methods:
   - Email/Password
   - Google
   - Phone
4. **Backend:** Download service account JSON from Project Settings → Service Accounts
5. **Frontend:** Copy Firebase config from Project Settings → General → Your Apps

### 3. Backend Configuration

```bash
# Install Python dependencies
pip install -r requirements.txt

# Create environment file
cp .env.example .env
```

Edit `.env` and add:
```env
GROQ_API_KEY=your_groq_api_key
FIREBASE_CREDENTIALS_PATH=path_to_service_account.json
CHROMA_API_KEY=your_chroma_api_key
CHROMA_TENANT=your_chroma_tenant
CHROMA_DATABASE=your_chroma_database
```

```bash
# Start backend server
python api.py
# Server runs on http://localhost:8000
```

### 4. Frontend Configuration

```bash
cd frontend

# Install dependencies
npm install

# Create environment file
```

Create `frontend/.env`:
```env
VITE_FIREBASE_API_KEY=your_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_project_id.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_project_id.firebasestorage.app
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id
VITE_FIREBASE_MEASUREMENT_ID=your_measurement_id
```

```bash
# Start development server
npm run dev
# App runs on http://localhost:5173
```

### 5. Deploy to Firebase (Optional)

```bash
# Build frontend
cd frontend
npm run build

# Deploy to Firebase Hosting
firebase deploy
```

---

## 🧪 Testing

Agentic Pharmacy includes a comprehensive backend test suite that executes in a sandboxed, in-memory mock environment (preventing any accidental mutations to live production data).

**Test Coverage Includes:**
- `test_api.py`: Validates all 16 FastAPI endpoints, ensuring correct status codes and JSON response schemas.
- `test_database.py`: Verifies CRUD operations and strict data isolation rules per-user account.
- `test_agent.py`: Validates LLM prompt logic, tool usage, and Regex extraction precision.
- `test_barcode_scanner.py`: Confirms GS1-128 compliance for multi-identifier concatenation (GTIN, Expiry, Batch).
- `test_ddi_lookup.py`: Asserts correct Drug-Drug Interaction lookup logic, including fuzzy matching and INN synonym translation.

**Running the Tests:**
```bash
# Run the entire test suite (automatically mocks Firestore)
python -m unittest discover tests

# Run a specific test suite
python -m unittest tests.test_barcode_scanner
```

---

## 📁 Project Structure

```
Agentic-Pharmacy/
├── api.py                    # FastAPI server with REST + SSE endpoints
├── agent.py                  # LangGraph agent definitions
├── database.py               # Firestore CRUD operations
├── barcode_scanner.py        # Barcode decoding with zxing-cpp
├── ddi_lookup.py            # Drug interaction checker
├── requirements.txt          # Python dependencies
├── .env.example             # Environment variables template
├── firebase.json            # Firebase hosting configuration
├── .firebaserc              # Firebase project configuration
│
└── frontend/
    ├── index.html
    ├── package.json
    ├── vite.config.ts
    ├── tailwind.config.js
    ├── .env                 # Firebase config (not in git)
    │
    └── src/
        ├── main.tsx         # React entry point
        │
        └── app/
            ├── App.tsx
            ├── routes.tsx   # Route configuration
            ├── firebase.ts  # Firebase initialization
            │
            ├── components/
            │   ├── BoldSidebar.tsx
            │   ├── BoldChatArea.tsx
            │   ├── MessageBubble.tsx
            │   ├── RootLayout.tsx
            │   └── ui/      # shadcn/ui components
            │
            ├── context/
            │   └── AuthContext.tsx
            │
            ├── pages/
            │   ├── Landing.tsx
            │   ├── Login.tsx
            │   ├── Signup.tsx
            │   ├── Dashboard.tsx
            │   ├── AssistantChat.tsx
            │   ├── LiveInventory.tsx
            │   ├── LogDailySales.tsx
            │   ├── SalesHistoryStandalone.tsx
            │   ├── ReorderAlerts.tsx
            │   ├── ExpiredItems.tsx
            │   └── Settings.tsx
            │
            ├── utils/
            │   └── api.ts   # API client functions
            │
            └── styles/
                ├── index.css      # Global styles
                ├── tailwind.css   # Tailwind config
                └── theme.css      # Theme variables
```

---

## 🔒 Security & Data Privacy

- **Per-User Data Isolation:** All Firestore data is scoped to `users/{uid}/*` collections
- **Firebase Authentication:** Secure authentication with Email, Google, and Phone providers
- **API Authorization:** All API endpoints require valid Firebase auth tokens
- **No Data Sharing:** Complete data separation between pharmacy accounts
- **Secure Hosting:** Deployed on Firebase Hosting with HTTPS

---

## 🎨 Design Philosophy

Agentic Pharmacy features a bold, editorial design system inspired by modern SaaS applications:

- **Typography:** Inter font family with bold weights and uppercase labels
- **Color Palette:** Green accent (#16a34a), near-black borders (#0F172A), clean backgrounds
- **Components:** Pill-shaped buttons, rounded cards with black borders
- **Dark Mode:** Complete theme support with optimized contrast
- **Accessibility:** High contrast ratios and keyboard navigation support

---

## 🚀 Deployment

The application is deployed on Firebase Hosting:

**Live URL:** [https://pharmaai-8bb36.web.app](https://pharmaai-8bb36.web.app)

To deploy your own instance:

```bash
# Build frontend
cd frontend
npm run build

# Deploy to Firebase
firebase deploy
```

---

## 📝 License

This project is licensed under the MIT License - see the LICENSE file for details.

---

## 👥 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the project
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

---

## 📧 Contact

Project Link: [https://github.com/Amisha2121/Agentic-Pharmacy](https://github.com/Amisha2121/Agentic-Pharmacy)

---

<div align="center">

*Built with ❤️ using LangGraph · Groq · Firebase · React · FastAPI*

**[⬆ Back to Top](#-agentic-pharmacy)**

</div>
