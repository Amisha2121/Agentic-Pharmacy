"""
FastAPI bridge server — exposes the NovaMed backend as REST endpoints
so the React frontend can communicate with Python/LangGraph/Firestore.

Run with:
    python api.py
Or:
    uvicorn api:app --reload --port 8000
"""

import sys
import os
# Ensure the project root is on the path so database.py / mock_data.py are importable
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

# Load .env FIRST with override=True so .env values always beat system/conda env vars
from dotenv import load_dotenv
load_dotenv(override=True)

from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from typing import Optional, List
import json

# Thread-ID → Firebase UID registry.
# Agent nodes import this to get the real user_id regardless of checkpoint state.
_THREAD_USER_MAP: dict = {}

import database

# Firebase Auth imports
try:
    from firebase_admin import auth as firebase_auth
    FIREBASE_AUTH_AVAILABLE = True
except ImportError:
    FIREBASE_AUTH_AVAILABLE = False
    print("[WARN] firebase_admin not available - auth token verification disabled")

def get_user_id_from_token(request: Request) -> str:
    """Extract user ID from Firebase Auth token in Authorization header.
    Returns the UID string, or falls back to 'legacy' if unauthenticated,
    in mock mode, or if verification fails.
    """
    if not FIREBASE_AUTH_AVAILABLE or database.MOCK_MODE:
        return "legacy"
    
    auth_header = request.headers.get('Authorization', '')
    if not auth_header.startswith('Bearer '):
        return "legacy"
    
    token = auth_header.split('Bearer ')[1]
    try:
        decoded_token = firebase_auth.verify_id_token(token)
        return decoded_token['uid']
    except Exception as e:
        print(f"[WARN] Token verification failed: {e}")
        return "legacy"

# Agent is imported lazily to avoid crashing the server if LangGraph/OpenAI
# packages are unavailable. The agent is only needed for /api/chat endpoints.
_agent_app = None
_agent_Command = None
_agent_GraphInterrupt = None

def _load_agent():
    global _agent_app, _agent_Command, _agent_GraphInterrupt
    if _agent_app is None:
        from agent import app as agent_app
        from langgraph.types import Command
        from langgraph.errors import GraphInterrupt
        _agent_app = agent_app
        _agent_Command = Command
        _agent_GraphInterrupt = GraphInterrupt
    return _agent_app, _agent_Command, _agent_GraphInterrupt

# ── App setup ─────────────────────────────────────────────────────────────────
app = FastAPI(title="NovaMed API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173", "https://pharmaai-8bb36.web.app", "https://novamed-f8129.web.app", "https://novamed-f8129.firebaseapp.com"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/health")
def health():
    return {
        "status": "ok",
        "firebase_mode": "LIVE" if not database.MOCK_MODE else "MOCK",
    }

# ── Pydantic models ────────────────────────────────────────────────────────────

class ChatRequest(BaseModel):
    thread_id: str
    message: str
    image_paths: List[str] = []

class ChatResumeRequest(BaseModel):
    thread_id: str
    decision: str  # "approve" or "reject"

class SaveSessionRequest(BaseModel):
    messages: List[dict]
    title: Optional[str] = ""

class AddSaleRequest(BaseModel):
    batch_number: str
    product_name: str
    qty_sold: int

class UpdateSaleRequest(BaseModel):
    new_qty: int

class AddItemRequest(BaseModel):
    product_name: str
    batch_number: str
    expiry_date: str
    category: str = "Other"
    stock: int = 0

class UpdateStockRequest(BaseModel):
    new_stock: int

class UpdateCategoryRequest(BaseModel):
    new_category: str

# ── Inventory ──────────────────────────────────────────────────────────────────

@app.get("/api/inventory")
def get_inventory(request: Request):
    try:
        user_id = get_user_id_from_token(request)
        items = database.get_inventory_with_stock(user_id)
        return {"items": items}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/inventory")
def add_inventory_item(body: AddItemRequest, request: Request):
    try:
        user_id = get_user_id_from_token(request)
        database.insert_batch(body.batch_number, body.expiry_date, body.product_name, body.category, body.stock, user_id)
        return {"ok": True}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.delete("/api/inventory/{doc_id}")
def delete_inventory_item(doc_id: str, request: Request):
    try:
        user_id = get_user_id_from_token(request)
        database.delete_batch(doc_id, user_id)
        return {"ok": True}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.patch("/api/inventory/{doc_id}/stock")
def update_inventory_stock(doc_id: str, body: UpdateStockRequest, request: Request):
    try:
        user_id = get_user_id_from_token(request)
        database.update_stock(doc_id, body.new_stock, user_id)
        return {"ok": True}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.patch("/api/inventory/{doc_id}/category")
def update_inventory_category(doc_id: str, body: UpdateCategoryRequest, request: Request):
    try:
        user_id = get_user_id_from_token(request)
        database.update_category(doc_id, body.new_category, user_id)
        return {"ok": True}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# ── Migrate Legacy ─────────────────────────────────────────────────────────────

@app.post("/api/migrate-legacy")
def migrate_legacy_endpoint(request: Request):
    try:
        user_id = get_user_id_from_token(request)
        if user_id == "legacy" or database.MOCK_MODE:
            return {"ok": True, "migrated": 0}
            
        legacy_docs = list(database.db.collection(database.COLLECTION).stream())
        if not legacy_docs:
            return {"ok": True, "migrated": 0}

        target_col = database.db.collection(f"users/{user_id}/{database.COLLECTION}")
        migrated = 0
        
        for doc in legacy_docs:
            data = doc.to_dict()
            bn = data.get("batch_number", "")
            if not bn:
                continue
            # Check if already exists in target
            from firebase_admin import firestore
            existing = list(target_col.where(filter=firestore.FieldFilter("batch_number", "==", bn)).limit(1).stream())
            if not existing:
                target_col.add(data)
                migrated += 1
                
        return {"ok": True, "migrated": migrated}
    except Exception as e:
        print(f"Migration error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# ── Chat sessions ──────────────────────────────────────────────────────────────

@app.get("/api/sessions")
def list_sessions(request: Request):
    try:
        user_id = get_user_id_from_token(request)
        sessions = database.list_chat_sessions(user_id=user_id)
        return {"sessions": sessions}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/sessions/{session_id}/messages")
def load_session(session_id: str, request: Request):
    try:
        user_id = get_user_id_from_token(request)
        messages = database.load_chat_session(session_id, user_id)
        return {"messages": messages}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/sessions/{session_id}")
def save_session(session_id: str, body: SaveSessionRequest, request: Request):
    try:
        user_id = get_user_id_from_token(request)
        database.save_chat_session(session_id, body.messages, body.title, user_id)
        return {"ok": True}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.delete("/api/sessions/{session_id}")
def delete_session(session_id: str, request: Request):
    try:
        user_id = get_user_id_from_token(request)
        database.delete_chat_session(session_id, user_id)
        return {"ok": True}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# ── Chat / Agent ───────────────────────────────────────────────────────────────

def _stream_agent(thread_id: str, message: str, image_paths: List[str], user_id: str = "legacy"):
    """Generator that streams SSE events from LangGraph agent."""
    try:
        agent_app, _, GraphInterrupt = _load_agent()
    except Exception as e:
        payload = json.dumps({"type": "error", "content": f"Agent unavailable: {e}"})
        yield f"data: {payload}\n\n"
        return

    graph_config = {"configurable": {"thread_id": thread_id, "user_id": user_id}}
    # Also register user_id in module-level map so agent nodes can read it
    # regardless of checkpoint state (MemorySaver can restore old state without user_id)
    _THREAD_USER_MAP[thread_id] = user_id

    # ── Seed messages from Firestore if MemorySaver has no checkpoint ──────
    # This handles server restarts so the agent remembers prior conversation.
    try:
        existing_state = agent_app.get_state(graph_config)
        has_checkpoint = bool(existing_state and existing_state.values)
    except Exception:
        has_checkpoint = False

    seed_messages: List[dict] = []
    if not has_checkpoint:
        try:
            # Pass user_id so we load THIS user's session, not the legacy pool
            stored = database.load_chat_session(thread_id, user_id)
            for m in stored:
                role = "user" if m.get("role") == "user" or m.get("type") == "user" else "assistant"
                content = m.get("content", "")
                if content:
                    seed_messages.append({"role": role, "content": content})
        except Exception:
            pass

    try:
        result = None
        initial_state: dict = {
            "image_paths": image_paths,
            "user_query": message,
            "user_id": user_id,
            "final_response": "",
            "pending_quarantine": None,
            "hitl_decision": None,
        }
        # Inject prior history only on first call for this thread_id (after server restart)
        if seed_messages:
            initial_state["messages"] = seed_messages

        for event in agent_app.stream(
            initial_state,
            config=graph_config,
            stream_mode="values",
        ):
            result = event

        # ── Execute DB writes with guaranteed correct user_id ─────────────────
        # The agent queues items in pending_inserts; the API does the actual write.
        if result:
            for item in (result.get("pending_inserts") or []):
                try:
                    database.insert_batch(
                        item["batch_number"], item["expiry_date"],
                        item["product_name"], item["category"],
                        item.get("stock", 0), user_id,
                    )
                    print(f"[api] insert_batch OK → user_id={user_id}, product={item['product_name']}")
                except Exception as db_err:
                    print(f"[api] insert_batch FAILED: {db_err}")

        final_text = result.get("final_response", "") if result else ""
        payload = json.dumps({"type": "done", "content": final_text})
        yield f"data: {payload}\n\n"

    except GraphInterrupt as gi:
        interrupt_value = gi.args[0] if gi.args else {}
        if hasattr(interrupt_value, '__iter__') and not isinstance(interrupt_value, dict):
            try:
                interrupt_value = list(interrupt_value)[0].value
            except Exception:
                interrupt_value = {}
        product = interrupt_value.get("product", {}) if isinstance(interrupt_value, dict) else {}
        payload = json.dumps({"type": "hitl", "product": product})
        yield f"data: {payload}\n\n"

    except Exception as e:
        payload = json.dumps({"type": "error", "content": str(e)})
        yield f"data: {payload}\n\n"


@app.post("/api/chat")
def chat(body: ChatRequest, request: Request):
    """SSE streaming endpoint — runs the LangGraph agent and streams the response."""
    user_id = get_user_id_from_token(request)
    return StreamingResponse(
        _stream_agent(body.thread_id, body.message, body.image_paths, user_id),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )


@app.post("/api/chat/resume")
def chat_resume(body: ChatResumeRequest, request: Request):
    """Resume the LangGraph agent after a HITL interrupt. Requires a valid auth token."""
    user_id = get_user_id_from_token(request)  # ← auth guard added
    try:
        agent_app, Command, _ = _load_agent()
    except Exception as e:
        raise HTTPException(status_code=503, detail=f"Agent unavailable: {e}")
    graph_config = {"configurable": {"thread_id": body.thread_id, "user_id": user_id}}
    try:
        result = None
        for event in agent_app.stream(
            Command(resume={"decision": body.decision}),
            config=graph_config,
            stream_mode="values",
        ):
            result = event
        final_text = result.get("final_response", "") if result else ""
        return {"content": final_text}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# ── Sales ──────────────────────────────────────────────────────────────────────

@app.get("/api/sales/today")
def get_today_sales(request: Request):
    try:
        user_id = get_user_id_from_token(request)
        logs = database.get_todays_sales_log(user_id)
        return {"logs": logs}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/sales/history")
def get_sales_history(request: Request, days: int = 30):
    try:
        user_id = get_user_id_from_token(request)
        history = database.get_sales_history(days=days, user_id=user_id)
        return {"history": history}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/sales")
def add_sale(body: AddSaleRequest, request: Request):
    try:
        user_id = get_user_id_from_token(request)
        log_id = database.add_to_sales_log(body.batch_number, body.product_name, body.qty_sold, user_id)
        return {"log_id": log_id, "ok": True}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.patch("/api/sales/{log_id}")
def update_sale(log_id: str, body: UpdateSaleRequest, request: Request):
    try:
        user_id = get_user_id_from_token(request)
        database.update_sales_log_entry(log_id, body.new_qty, user_id)
        return {"ok": True}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.delete("/api/sales/{log_id}")
def delete_sale(log_id: str, request: Request):
    try:
        user_id = get_user_id_from_token(request)
        database.delete_sales_log_entry(log_id, user_id)
        return {"ok": True}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# ── Reorder Alerts ─────────────────────────────────────────────────────────────

@app.get("/api/reorder-alerts")
def get_reorder_alerts(request: Request):
    try:
        user_id = get_user_id_from_token(request)
        alerts = database.get_reorder_alerts(user_id)
        return {"alerts": alerts}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/reorder-alerts/{doc_id}/dismiss")
def dismiss_reorder_alert(doc_id: str, request: Request):
    try:
        user_id = get_user_id_from_token(request)
        database.dismiss_reorder_alert(doc_id, user_id)
        return {"ok": True}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# ── Expired Items ──────────────────────────────────────────────────────────────

@app.get("/api/expired")
def get_expired_items(request: Request):
    try:
        user_id = get_user_id_from_token(request)
        items = database.get_expired_items(user_id)
        return {"items": items}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/expired/{doc_id}/dismiss")
def dismiss_expired_alert(doc_id: str, request: Request):
    try:
        user_id = get_user_id_from_token(request)
        database.dismiss_expiry_alert(doc_id, user_id)
        return {"ok": True}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# ── Quarantine ─────────────────────────────────────────────────────────────────

@app.get("/api/quarantine")
def get_quarantine(request: Request):
    try:
        user_id = get_user_id_from_token(request)
        items = database.get_quarantine(user_id)
        return {"items": items}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# ── Barcode Scan ───────────────────────────────────────────────────────────────

import shutil, uuid
from fastapi import UploadFile, File
import barcode_scanner as _barcode_scanner
import threading as _threading
import time as _time

UPLOAD_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "uploads")
UPLOAD_TTL_SECONDS = 3600  # auto-delete uploads older than 1 hour

def _cleanup_old_uploads():
    """Background thread: periodically remove uploads older than UPLOAD_TTL_SECONDS."""
    while True:
        try:
            _time.sleep(1800)  # run every 30 minutes
            now = _time.time()
            if os.path.isdir(UPLOAD_DIR):
                for fname in os.listdir(UPLOAD_DIR):
                    fpath = os.path.join(UPLOAD_DIR, fname)
                    try:
                        if os.path.isfile(fpath) and (now - os.path.getmtime(fpath)) > UPLOAD_TTL_SECONDS:
                            os.remove(fpath)
                            print(f"[cleanup] Deleted old upload: {fname}")
                    except Exception:
                        pass
        except Exception as e:
            print(f"[cleanup] Error: {e}")

# Start background cleanup thread on server startup
_threading.Thread(target=_cleanup_old_uploads, daemon=True, name="upload-cleanup").start()

@app.post("/api/scan-barcode")
async def scan_barcode_endpoint(file: UploadFile = File(...)):
    """Upload an image, run instant local barcode decoding, and return results.
    Called by the frontend immediately after image selection so the pharmacist
    gets instant barcode feedback before the image is sent to the LLM agent.
    """
    try:
        os.makedirs(UPLOAD_DIR, exist_ok=True)
        ext = os.path.splitext(file.filename or ".jpg")[1] or ".jpg"
        filename = f"bc_{uuid.uuid4().hex}{ext}"
        filepath = os.path.join(UPLOAD_DIR, filename)
        with open(filepath, "wb") as f:
            shutil.copyfileobj(file.file, f)

        result = _barcode_scanner.scan_image(filepath)
        result["path"] = filepath
        result["filename"] = filename
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# ── Image Upload ───────────────────────────────────────────────────────────────

@app.post("/api/upload-image")
async def upload_image(file: UploadFile = File(...)):
    """Save an uploaded image to a temp folder and return its path for the agent.
    Files are automatically removed by the background cleanup thread after 1 hour.
    """
    try:
        os.makedirs(UPLOAD_DIR, exist_ok=True)
        ext = os.path.splitext(file.filename or ".jpg")[1] or ".jpg"
        filename = f"{uuid.uuid4().hex}{ext}"
        filepath = os.path.join(UPLOAD_DIR, filename)
        with open(filepath, "wb") as f:
            shutil.copyfileobj(file.file, f)
        return {"path": filepath, "filename": filename}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# ── Drug-Drug Interaction Direct Check ────────────────────────────────────────

class DDICheckRequest(BaseModel):
    drug_a: str
    drug_b: str

@app.post("/api/ddi-check")
def ddi_check(body: DDICheckRequest, request: Request):
    """Directly check a drug-drug interaction using the FDA DDI dataset.
    Returns structured result + human-readable formatted string.
    Requires authentication.
    """
    get_user_id_from_token(request)  # auth guard
    try:
        import ddi_lookup
        result = ddi_lookup.check_interaction(body.drug_a, body.drug_b)
        formatted = ddi_lookup.format_interaction_result(body.drug_a, body.drug_b)
        return {**result, "formatted": formatted}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# ── Entry point ────────────────────────────────────────────────────────────────

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("api:app", host="0.0.0.0", port=8000, reload=True)
