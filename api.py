"""
FastAPI bridge server — exposes the Agentic Pharmacy backend as REST endpoints
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

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from typing import Optional, List
import json

import database

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
app = FastAPI(title="Agentic Pharmacy API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

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
def get_inventory():
    try:
        items = database.get_inventory_with_stock()
        return {"items": items}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/inventory")
def add_inventory_item(body: AddItemRequest):
    try:
        database.insert_batch(body.batch_number, body.expiry_date, body.product_name, body.category, body.stock)
        return {"ok": True}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.delete("/api/inventory/{doc_id}")
def delete_inventory_item(doc_id: str):
    try:
        database.delete_batch(doc_id)
        return {"ok": True}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.patch("/api/inventory/{doc_id}/stock")
def update_inventory_stock(doc_id: str, body: UpdateStockRequest):
    try:
        database.update_stock(doc_id, body.new_stock)
        return {"ok": True}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.patch("/api/inventory/{doc_id}/category")
def update_inventory_category(doc_id: str, body: UpdateCategoryRequest):
    try:
        database.update_category(doc_id, body.new_category)
        return {"ok": True}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.patch("/api/inventory/{doc_id}/stock")
def update_inventory_stock(doc_id: str, body: UpdateStockRequest):
    try:
        database.update_stock(doc_id, body.new_stock)
        return {"ok": True}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# ── Chat sessions ──────────────────────────────────────────────────────────────

@app.get("/api/sessions")
def list_sessions():
    try:
        sessions = database.list_chat_sessions()
        return {"sessions": sessions}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/sessions/{session_id}/messages")
def load_session(session_id: str):
    try:
        messages = database.load_chat_session(session_id)
        return {"messages": messages}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/sessions/{session_id}")
def save_session(session_id: str, body: SaveSessionRequest):
    try:
        database.save_chat_session(session_id, body.messages, body.title)
        return {"ok": True}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.delete("/api/sessions/{session_id}")
def delete_session(session_id: str):
    try:
        database.delete_chat_session(session_id)
        return {"ok": True}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# ── Chat / Agent ───────────────────────────────────────────────────────────────

def _stream_agent(thread_id: str, message: str, image_paths: List[str]):
    """Generator that streams SSE events from LangGraph agent."""
    try:
        agent_app, _, GraphInterrupt = _load_agent()
    except Exception as e:
        payload = json.dumps({"type": "error", "content": f"Agent unavailable: {e}"})
        yield f"data: {payload}\n\n"
        return

    graph_config = {"configurable": {"thread_id": thread_id}}
    try:
        result = None
        for event in agent_app.stream(
            {
                "image_paths": image_paths,
                "user_query": message,
                "final_response": "",
                "pending_quarantine": None,
                "hitl_decision": None,
            },
            config=graph_config,
            stream_mode="values",
        ):
            result = event

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
def chat(body: ChatRequest):
    """SSE streaming endpoint — runs the LangGraph agent and streams the response."""
    return StreamingResponse(
        _stream_agent(body.thread_id, body.message, body.image_paths),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )


@app.post("/api/chat/resume")
def chat_resume(body: ChatResumeRequest):
    """Resume the LangGraph agent after a HITL interrupt."""
    try:
        agent_app, Command, _ = _load_agent()
    except Exception as e:
        raise HTTPException(status_code=503, detail=f"Agent unavailable: {e}")
    graph_config = {"configurable": {"thread_id": body.thread_id}}
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
def get_today_sales():
    try:
        logs = database.get_todays_sales_log()
        return {"logs": logs}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/sales/history")
def get_sales_history():
    try:
        history = database.get_sales_history(days=5)
        return {"history": history}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/sales")
def add_sale(body: AddSaleRequest):
    try:
        log_id = database.add_to_sales_log(body.batch_number, body.product_name, body.qty_sold)
        return {"log_id": log_id, "ok": True}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.patch("/api/sales/{log_id}")
def update_sale(log_id: str, body: UpdateSaleRequest):
    try:
        database.update_sales_log_entry(log_id, body.new_qty)
        return {"ok": True}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.delete("/api/sales/{log_id}")
def delete_sale(log_id: str):
    try:
        database.delete_sales_log_entry(log_id)
        return {"ok": True}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# ── Reorder Alerts ─────────────────────────────────────────────────────────────

@app.get("/api/reorder-alerts")
def get_reorder_alerts():
    try:
        alerts = database.get_reorder_alerts()
        return {"alerts": alerts}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/reorder-alerts/{doc_id}/dismiss")
def dismiss_reorder_alert(doc_id: str):
    try:
        database.dismiss_reorder_alert(doc_id)
        return {"ok": True}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# ── Expired Items ──────────────────────────────────────────────────────────────

@app.get("/api/expired")
def get_expired_items():
    try:
        items = database.get_expired_items()
        return {"items": items}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/expired/{doc_id}/dismiss")
def dismiss_expired_alert(doc_id: str):
    try:
        database.dismiss_expiry_alert(doc_id)
        return {"ok": True}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# ── Quarantine ─────────────────────────────────────────────────────────────────

@app.get("/api/quarantine")
def get_quarantine():
    try:
        items = database.get_quarantine()
        return {"items": items}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# ── Barcode Scan ───────────────────────────────────────────────────────────────

import shutil, uuid
from fastapi import UploadFile, File
import barcode_scanner as _barcode_scanner

@app.post("/api/scan-barcode")
async def scan_barcode_endpoint(file: UploadFile = File(...)):
    """Upload an image, run instant local barcode decoding, and return results.
    Called by the frontend immediately after image selection so the pharmacist
    gets instant barcode feedback before the image is sent to the LLM agent.
    """
    try:
        upload_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), "uploads")
        os.makedirs(upload_dir, exist_ok=True)
        ext = os.path.splitext(file.filename or ".jpg")[1] or ".jpg"
        filename = f"bc_{uuid.uuid4().hex}{ext}"
        filepath = os.path.join(upload_dir, filename)
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
    """Save an uploaded image to a temp folder and return its path for the agent."""
    try:
        upload_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), "uploads")
        os.makedirs(upload_dir, exist_ok=True)
        ext = os.path.splitext(file.filename or ".jpg")[1] or ".jpg"
        filename = f"{uuid.uuid4().hex}{ext}"
        filepath = os.path.join(upload_dir, filename)
        with open(filepath, "wb") as f:
            shutil.copyfileobj(file.file, f)
        return {"path": filepath, "filename": filename}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# ── Entry point ────────────────────────────────────────────────────────────────

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("api:app", host="0.0.0.0", port=8000, reload=True)
