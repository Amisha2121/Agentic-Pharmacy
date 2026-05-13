# -*- coding: utf-8 -*-
import os
import json
import re
import time
import base64
import random
import datetime
from typing import Annotated, TypedDict, Optional
import operator
from pydantic import BaseModel, Field
from openai import OpenAI
from dotenv import load_dotenv

import chromadb
from langgraph.graph import StateGraph, START, END
from langgraph.types import interrupt, Command
from langgraph.checkpoint.memory import MemorySaver

import database
import ddi_lookup
import barcode_scanner

load_dotenv(override=True)

def _resolve_user_id(state: dict, thread_id: str = "") -> str:
    """Get the Firebase UID for the current request.
    Looks up by thread_id in the api._THREAD_USER_MAP (always fresh,
    bypasses LangGraph checkpoint state), then falls back to state['user_id'].
    """
    try:
        import api as _api
        if thread_id:
            uid = _api._THREAD_USER_MAP.get(thread_id)
            if uid and uid != "legacy":
                return uid
        return state.get("user_id") or "legacy"
    except Exception:
        return state.get("user_id") or "legacy"


# Groq uses OpenAI-compatible API
def get_client() -> OpenAI:
    return OpenAI(
        api_key=os.getenv("GROQ_API_KEY"),
        base_url="https://api.groq.com/openai/v1"
    )

def transcribe_audio(audio_bytes: bytes) -> str:
    """Transcribe audio bytes using Groq Whisper model."""
    import tempfile
    
    with tempfile.NamedTemporaryFile(delete=False, suffix=".wav") as temp_file:
        temp_file.write(audio_bytes)
        temp_file_path = temp_file.name
        
    try:
        client = get_client()
        with open(temp_file_path, "rb") as audio_file:
            # Note: The model name could be 'whisper-large-v3' or 'whisper-1' depending on the exact OpenAI SDK / Groq support
            transcription = client.audio.transcriptions.create(
                file=audio_file,
                model="whisper-large-v3", 
                response_format="text"
            )
        return transcription.strip()
    finally:
        if os.path.exists(temp_file_path):
            os.remove(temp_file_path)


VISION_MODEL = "meta-llama/llama-4-scout-17b-16e-instruct"  # Supports vision
TEXT_MODEL   = "llama-3.1-8b-instant"                        # Fastest Groq model (~10x faster than 70b)

# ChromaDB Cloud fallback
class MockCollection:
    def query(self, *args, **kwargs): return {"documents": [["No clinical data found (MOCK)."]]}

vector_collection = MockCollection()
try:
    import threading
    _chroma_ready = threading.Event()
    def _init_chroma():
        global vector_collection
        try:
            chroma_client = chromadb.CloudClient(
                api_key=os.getenv("CHROMA_API_KEY"),
                tenant=os.getenv("CHROMA_TENANT"),
                database=os.getenv("CHROMA_DATABASE")
            )
            vector_collection = chroma_client.get_or_create_collection(name="amisha2121_agentic_pharmacy_main")
            print("ChromaDB: vector_collection ready")
        except Exception as e:
            print(f"ChromaDB error: {e}. Using mock collection.")
        finally:
            _chroma_ready.set()
    threading.Thread(target=_init_chroma, daemon=True).start()
except Exception as e:
    print(f"ChromaDB init thread error: {e}")

# State definition
class PharmacyState(TypedDict):
    image_paths: list[str]
    user_query: str
    final_response: str
    user_id: str                             # Firebase UID — scopes all DB writes
    # HITL fields
    pending_quarantine: Optional[dict]   # Set when expired item needs human approval
    hitl_decision: Optional[str]         # "approve" or "reject" — injected on resume
    next_node: str                       # The supervisor uses this to direct the graph
    # Items queued for DB write — the API layer does the actual insert with correct user_id
    pending_inserts: Optional[list]      # [{batch_number, expiry_date, product_name, category, stock}]
    # ── Memory & Continuity ───────────────────────────────────────────────────
    # Auto-accumulates: each node returns only NEW messages [{role, content}]
    messages: Annotated[list[dict], operator.add]
    last_added_medicine: Optional[dict]       # {name, batch, expiry}
    last_scanned_image: Optional[dict]        # {product_name, batch_number, expiry_date, category}
    last_interaction_checked: Optional[dict]  # {drug_a, drug_b, result}
    turn_number: int

# --- SUPERVISOR NODE ---
def supervisor_node(state: PharmacyState):
    """Appends user message to history, then routes to the correct worker."""
    user_query = state.get("user_query", "")
    new_turn = (state.get("turn_number") or 0) + 1
    user_msg = [{"role": "user", "content": user_query}]

    # Images always go to vision node
    if state.get("image_paths") and len(state["image_paths"]) > 0:
        return {"next_node": "vision_extraction_node", "messages": user_msg, "turn_number": new_turn}

    client = get_client()
    full_history = state.get("messages") or []

    # Build context summary for the router
    ctx_parts = []
    if m := state.get("last_added_medicine"):
        ctx_parts.append(f"Last added: {m.get('name')} batch={m.get('batch')} expiry={m.get('expiry')}")
    if m := state.get("last_scanned_image"):
        ctx_parts.append(f"Last scanned: {m.get('product_name')} batch={m.get('batch_number')}")
    if m := state.get("last_interaction_checked"):
        ctx_parts.append(f"Last interaction: {m.get('drug_a')} + {m.get('drug_b')} -> {m.get('result')}")
    context_str = "\n".join(ctx_parts) or "No prior actions this session."

    recent_str = "\n".join(
        f"{msg['role'].upper()}: {msg['content'][:200]}" for msg in full_history[-6:]
    ) or "No history."

    try:
        response = client.chat.completions.create(
            model=TEXT_MODEL,
            messages=[
                {"role": "system", "content": f"""Route to: ADD | INVENTORY | CLINICAL | UPDATE | DELETE | GENERAL
Use conversation context to resolve pronouns like 'it', 'that', 'same batch'.

Context:\n{context_str}\nRecent:\n{recent_str}"""},
                {"role": "user", "content": f"""Categories:
- ADD: add/log/insert medicine (no image). Use for 'add it'/'log it'.
- INVENTORY: stock questions, 'what did I add'.
- CLINICAL: drug interactions, side effects.
- UPDATE: rename/update a batch name.
- DELETE: remove/delete a batch. Use for 'delete it'/'remove it'.
- GENERAL: greetings, anything else.

Query: "{user_query}"
Reply with EXACTLY one word."""}
            ],
            temperature=0.0,
            max_tokens=5,
            timeout=10,
        )
        decision = response.choices[0].message.content.strip().upper()
        if "ADD" in decision:
            return {"next_node": "text_add_node", "messages": user_msg, "turn_number": new_turn}
        elif "CLINICAL" in decision:
            return {"next_node": "clinical_knowledge_node", "messages": user_msg, "turn_number": new_turn}
        elif "UPDATE" in decision:
            return {"next_node": "database_update_node", "messages": user_msg, "turn_number": new_turn}
        elif "DELETE" in decision or "REMOVE" in decision:
            return {"next_node": "database_delete_node", "messages": user_msg, "turn_number": new_turn}
    except Exception:
        pass
    return {"next_node": "database_query_node", "messages": user_msg, "turn_number": new_turn}

def route_from_supervisor(state: PharmacyState):
    """Conditional edge from the Supervisor to the next worker."""
    return state.get("next_node", "database_query_node")

# --- VISION NODE ---
def vision_extraction_node(state: PharmacyState):
    client = get_client()
    user_query = state.get("user_query", "")
    image_paths = state.get("image_paths", [])
    today = datetime.date.today()
    n = len(image_paths)

    # ── STAGE 0: Barcode pre-scan ──────────────────────────────────────────
    # Try to decode GS1 / standard barcodes before invoking the (slower) LLM.
    barcode_result = {"found": False}
    barcode_hint_text = ""
    pdf_text = None

    for img_path in image_paths:
        scan = barcode_scanner.scan_image(img_path)
        if scan.get("pdf_text"):
            pdf_text = scan["pdf_text"]
        if scan["found"]:
            barcode_result = scan
            barcode_hint_text = barcode_scanner.build_barcode_hint(scan)
            break  # Use the first file that gives barcodes (usually there's only 1 file anyway)

    # --- Check if user manually typed an expiry date in their hint ---
    expiry_override = None
    exp_match = re.search(
        r'\bexp(?:iry|\.?\s*date)?\s*[:\-]?\s*(\d{1,2}[\/\-]\d{2,4}|\d{4}[\/\-]\d{1,2})',
        user_query, re.IGNORECASE
    )
    if exp_match:
        raw_exp = exp_match.group(1)
        try:
            import pandas as pd
            parsed = pd.to_datetime(raw_exp, dayfirst=True, errors="coerce")
            if parsed is not pd.NaT:
                expiry_override = parsed.strftime("%Y-%m-%d")
        except Exception:
            pass

    # --- Check if user typed a stock/quantity hint ---
    stock_hint = 0
    stock_match = re.search(
        r'(?:qty|quantity|stock|number|count|units?|tablets?|capsules?|pieces?|pcs|have|nos?)'
        r'(?:\s+(?:as|of|is|=|to))?\s*[:\-]?\s*([0-9]+)',
        user_query, re.IGNORECASE
    )
    if not stock_match:
        stock_match = re.search(r'\bquantity\b.{0,20}?\b([0-9]+)\b', user_query, re.IGNORECASE)
    if not stock_match:
        stock_match = re.search(r'^\s*([0-9]+)\s+[A-Za-z]', user_query)
    if stock_match:
        try:
            stock_hint = int(stock_match.group(1))
        except (ValueError, IndexError):
            stock_hint = 0

    # --- Build the image content blocks ---
    image_blocks = []
    has_pdf = False
    _tmp_pdf_images = []  # track temp files to clean up later
    for img_path in image_paths:
        if img_path.lower().endswith('.pdf'):
            has_pdf = True
            # Convert each PDF page to a JPEG at 300 DPI and add as vision image
            try:
                import fitz  # PyMuPDF
                import tempfile
                doc = fitz.open(img_path)
                for page_idx, page in enumerate(doc):
                    pix = page.get_pixmap(dpi=300)
                    tmp = tempfile.NamedTemporaryFile(suffix='.jpg', delete=False)
                    tmp_path = tmp.name
                    tmp.close()
                    pix.save(tmp_path)
                    _tmp_pdf_images.append(tmp_path)
                    with open(tmp_path, "rb") as f:
                        b64 = base64.b64encode(f.read()).decode("utf-8")
                    image_blocks.append({"type": "image_url", "image_url": {"url": f"data:image/jpeg;base64,{b64}"}})
                    if page_idx >= 4:  # cap at 5 pages to avoid token overflow
                        break
            except Exception as pdf_err:
                print(f"[vision] PDF→image conversion failed: {pdf_err}. Falling back to text only.")
            continue
        with open(img_path, "rb") as f:
            b64 = base64.b64encode(f.read()).decode("utf-8")
        ext = img_path.rsplit(".", 1)[-1].lower()
        mime = "image/png" if ext == "png" else "image/jpeg"
        image_blocks.append({"type": "image_url", "image_url": {"url": f"data:{mime};base64,{b64}"}})
    # Enforce Groq vision limit: max 5 images per request
    if len(image_blocks) > 5:
        image_blocks = image_blocks[:5]

    n_images = len(image_blocks)
    if has_pdf:
        sides_msg = (
            f"You are looking at {n_images} page image(s) extracted from a PDF document. "
            "Each page may contain ONE OR MORE different medicine labels or barcodes. "
            "Scan EVERY page carefully and return a SEPARATE JSON object for EACH distinct product you find. "
            "Do NOT merge different products into one entry. If a page has 3 barcodes, return 3 objects."
        )
    elif n_images > 1:
        sides_msg = (
            f"You are looking at {n_images} photos of DIFFERENT SIDES of THE SAME medication package. "
            f"Combine information from ALL {n_images} photos to fill in the details below."
        )
    else:
        sides_msg = "You are looking at a photo of a medication package label."

    barcode_context = ""
    if barcode_hint_text:
        barcode_context = f"""

⚡ BARCODE PRE-SCAN RESULTS (use these as EXACT ground truth):
{barcode_hint_text}
"""

    pdf_context = ""
    if pdf_text:
        pdf_context = f"""

📄 PDF TEXT EXTRACTED:
{pdf_text[:3000]}
"""

    prompt = f"""{sides_msg}{barcode_context}{pdf_context}

User hint (use if helpful): "{user_query}"

════════════════════════════════════════════
STAGE 1 — BARCODE SCAN (always runs first)
════════════════════════════════════════════

Attempt to locate and decode any barcode or matrix code visible in the image.
Supported formats: GS1-128, DataMatrix, QR Code, EAN-13, EAN-8, Code-128.

If a barcode IS found and successfully decoded (or provided in pre-scan results above):
- Extract the following GS1 Application Identifiers if present:
    AI (01) → GTIN
    AI (10) → Batch / Lot Number         → maps to: batch_number
    AI (17) → Expiry Date (YYMMDD)       → maps to: expiry_date
    AI (11) → Manufacturing Date         → IGNORE — do NOT use as expiry
    AI (37) → Quantity                   → maps to: stock
- Mark barcode_found: true
- Pin extracted values as GROUND TRUTH — do NOT re-read them from label text
- Proceed to Stage 2 ONLY to extract: product_name and category (from label text)
- Do NOT attempt to re-read batch_number or expiry_date from the label

If a barcode is NOT found, or cannot be decoded:
- Set barcode_found: false
- Set barcode_verified_fields: []
- Proceed immediately to Stage 2 — full text extraction mode
- Do NOT fabricate a barcode result. Do NOT assume one exists.

════════════════════════════════════════════
STAGE 2 — TEXT EXTRACTION FROM LABEL
════════════════════════════════════════════

Read the visible printed text on the medicine label carefully.
Extract only what is clearly and unambiguously readable.

Fields to extract:

  product_name   → Brand name printed on the front of the package.
                   If not readable → set to "UNKNOWN". Do NOT guess.

  batch_number   → The value next to "Batch No.", "Lot No.", "B.No.", or similar.
                   ⚠ Only populate this if barcode_found is false.
                   If not readable → set to "UNKNOWN". Do NOT generate a placeholder.

  expiry_date    → The date next to "Exp.", "Expiry", "Use Before", or similar.
                   ⚠ Only populate this if barcode_found is false.
                   Convert to YYYY-MM-DD format using these rules:
                     MM/YYYY       → last day of that month  (e.g. 11/2026 → "2026-11-30")
                     MM/YY         → assume 20YY, last day   (e.g. 06/27  → "2027-06-30")
                     DD/MM/YYYY    → convert directly
                   ⚠ CRITICAL — Indian labels stamp dates VERTICALLY in this order:
                       Line 1: Batch No.
                       Line 2: Mfg. Date   ← MANUFACTURING date (always earlier)
                       Line 3: Exp. Date   ← EXPIRY date (always later)
                   NEVER use the Mfg. Date as the expiry date.
                   If expiry is not readable or ambiguous → set to "UNKNOWN".

  category       → Pick exactly one from this list based on the product name/type:
                     Pain & Fever | Cold & Allergy | Digestion & Nausea |
                     Skin & Dermatology | Vitamins & Nutrition |
                     First Aid & Wound Care | Eye & Ear Care | Oral Care |
                     Feminine Care | Baby & Child Care | Cardiovascular & BP |
                     Diabetes Care | Antibiotics | Medical Devices |
                     Personal Hygiene | General/Other
                   If category cannot be determined → set to "General/Other".

  stock          → Number of units/tablets/bottles shown on the label (e.g. "10 tablets").
                   If not stated → set to 0. Do NOT guess.

════════════════════════════════════════════
OUTPUT RULES — STRICT
════════════════════════════════════════════

1. Output A JSON ARRAY OF OBJECTS (one for each product identified). No markdown. No explanation.
2. UNKNOWN is the only allowed value for fields you cannot read — never null for strings.
3. Never invent, hallucinate, or fill in a field from general medical knowledge.
4. If you cannot read a field, you MUST set it to UNKNOWN (strings) or 0 (numbers).
5. Do not copy the Mfg. Date into expiry_date under any circumstances.
6. Do not add fields that are not listed below.

════════════════════════════════════════════
FINAL JSON SCHEMA (RETURN AS AN ARRAY)
════════════════════════════════════════════

[
  {{
    "barcode_found": true,
    "barcode_verified_fields": ["batch_number", "expiry_date"],
    "product_name": "...",
    "batch_number": "...",
    "expiry_date": "YYYY-MM-DD",
    "category": "...",
    "stock": 0
  }}
]
"""

    max_retries = 2
    for attempt in range(max_retries):
        try:
            # We might only have text (from PDF) and no images
            messages = [{"type": "text", "text": prompt}]
            if image_blocks:
                messages = image_blocks + messages
                
            # If there are no images, we can use the fast text model
            model_to_use = TEXT_MODEL if not image_blocks else VISION_MODEL

            response = client.chat.completions.create(
                model=model_to_use,
                messages=[{"role": "user", "content": messages if image_blocks else prompt}],
                temperature=0.0,
                max_tokens=2000,
                timeout=30,
            )

            raw = response.choices[0].message.content.strip()
            print(f"[vision] Raw LLM output ({len(raw)} chars): {raw[:200]}")

            # ── Robust JSON extraction ────────────────────────────────────────
            def _try_parse_items(text: str):
                """Return a list of dicts parsed from text, or None on failure."""
                # Strategy 1: strip markdown code fences
                if "```" in text:
                    for part in text.split("```"):
                        c = part.strip().lstrip("json").strip()
                        if c.startswith("[") or c.startswith("{"):
                            text = c
                            break

                # Strategy 2: find the JSON array with regex
                arr_match = re.search(r'\[.*?\]', text, re.DOTALL)
                if arr_match:
                    try:
                        return json.loads(arr_match.group(0))
                    except json.JSONDecodeError:
                        pass

                # Strategy 3: progressive truncation — LLM sometimes cuts off mid-array
                if '[' in text:
                    chunk = text[text.index('['):]
                    for end in range(len(chunk), 0, -1):
                        try:
                            result = json.loads(chunk[:end])
                            if isinstance(result, list) and result:
                                return result
                        except json.JSONDecodeError:
                            continue

                # Strategy 4: single-object fallback wrapped in a list
                obj_match = re.search(r'\{.*?\}', text, re.DOTALL)
                if obj_match:
                    try:
                        return [json.loads(obj_match.group(0))]
                    except json.JSONDecodeError:
                        pass

                return None

            items = _try_parse_items(raw)

            if not items:
                print(f"[vision] JSON parse failed. Full response:\n{raw}")
                if attempt < max_retries - 1:
                    continue  # retry the LLM call
                return {
                    "final_response": "⚠️ Could not extract product details — the AI returned an unreadable response. Please try again.",
                    "pending_quarantine": None,
                    "hitl_decision": None,
                }

            responses = []
            pending_inserts = []  # API will write these with correct user_id

            for item in items:
                batch    = item.get("batch_number", "UNKNOWN")
                expiry   = item.get("expiry_date", "UNKNOWN")
                name     = item.get("product_name", "Unknown")
                category = item.get("category", "Unknown")
                try:
                    img_stock = int(item.get("stock", 0) or 0)
                except (ValueError, TypeError):
                    img_stock = 0
                
                stock = stock_hint if stock_hint > 0 else img_stock

                override_note = ""
                if expiry_override:
                    expiry = expiry_override
                    override_note = " *(expiry from your hint)*"

                if not batch or str(batch).upper() in ("UNKNOWN", "NOT FOUND", "N/A", ""):
                    batch = f"BATCH-{datetime.datetime.now().strftime('%Y%m%d-%H%M%S')}-{random.randint(10,99)}"
                    batch_note = " *(batch unreadable, auto-ID assigned)*"
                else:
                    batch_note = ""

                # Expiry sanity check
                try:
                    import pandas as pd
                    exp_date = pd.to_datetime(expiry, dayfirst=False, errors="coerce").date()
                    if exp_date and exp_date < today:
                        reason = f"This product expired on **{exp_date}**."
                        responses.append(f"❌ **Not Logged — Expired Product** | **{name}** ({category}) | Batch: {batch} | Expiry: {exp_date}\n⚠️ {reason}")
                        continue
                except Exception:
                    pass

                # Queue for API-layer insert — API has guaranteed correct user_id
                pending_inserts.append({
                    "batch_number": str(batch),
                    "expiry_date":  str(expiry),
                    "product_name": str(name),
                    "category":     str(category),
                    "stock":        stock,
                })
                stock_note = f" | Stock: {stock}" if stock > 0 else ""
                responses.append(f"✅ Logged **{name}** ({category}) | Batch: {batch}{batch_note} | Exp: {expiry}{override_note}{stock_note}")

            final_text = "\n\n".join(responses)
            last_scan = None
            for item in items:
                if item.get("product_name") not in ("Unknown", "UNKNOWN", "", None):
                    last_scan = {
                        "product_name": item.get("product_name"),
                        "batch_number": item.get("batch_number"),
                        "expiry_date": item.get("expiry_date"),
                        "category": item.get("category"),
                        "stock": item.get("stock", 0),
                    }
                    break
            return {
                "final_response": final_text,
                "messages": [{"role": "assistant", "content": final_text}],
                "pending_quarantine": None,
                "hitl_decision": None,
                "pending_inserts": pending_inserts,
                **(({"last_scanned_image": last_scan}) if last_scan else {}),
            }

        except Exception as e:
            if "429" in str(e) and attempt < max_retries - 1:
                time.sleep((2 ** attempt) + random.random())
            else:
                return {
                    "final_response": f"⚠️ Vision error - {str(e)}",
                    "pending_quarantine": None,
                    "hitl_decision": None,
                }

    return {
        "final_response": "⚠️ Vision failed after multiple retries.",
        "pending_quarantine": None,
        "hitl_decision": None,
    }


# --- HUMAN APPROVAL NODE ---
def human_approval_node(state: PharmacyState):
    """Pauses graph if expired item is pending approval. Resumes with decision."""
    pending = state.get("pending_quarantine")

    # Nothing to approve — pass through
    if not pending:
        return {}

    # ✋ Pause the graph and hand control back to Streamlit
    decision_payload = interrupt({
        "reason": "expired_medication",
        "product": pending,
    })

    # --- Resumed with human decision ---
    decision = decision_payload.get("decision", "reject") if isinstance(decision_payload, dict) else "reject"

    if decision == "approve":
        database.insert_quarantine(
            pending["batch"],
            pending["expiry"],
            pending["name"],
            pending["category"],
        )
        return {
            "final_response": (
                f"🔒 **Moved to Quarantine** | **{pending['name']}** ({pending['category']}) "
                f"| Batch: {pending['batch']}{pending.get('batch_note', '')} "
                f"| Expired: {pending['expiry']} | Logged to quarantine collection."
            ),
            "pending_quarantine": None,
            "hitl_decision": "approve",
        }
    else:
        return {
            "final_response": (
                f"❌ **Rejected & Discarded** | **{pending['name']}** ({pending['category']}) "
                f"| Batch: {pending['batch']} | Expired: {pending['expiry']} "
                f"| Item was NOT logged to any database."
            ),
            "pending_quarantine": None,
            "hitl_decision": "reject",
        }


# --- INVENTORY QUERY NODE ---
def database_query_node(state: PharmacyState):
    user_query = state.get("user_query", "")
    today = datetime.date.today().strftime("%Y-%m-%d")
    user_id = _resolve_user_id(state)
    inventory_data = database.get_inventory(user_id)
    # Include zero-stock items so the agent can report out-of-stock products
    inventory_context = "\n".join(
        [f"- {r[2]} ({r[3]}) | Batch: {r[0]} | Exp: {r[1]} | Stock: {r[5]}{'  ⚠️ OUT OF STOCK' if r[5] == 0 else ''}" for r in inventory_data]
    ) or "No inventory items yet."

    full_history = state.get("messages") or []
    system_prompt = f"""You are a pharmacy inventory assistant with conversation memory.
TODAY: {today}
INVENTORY:
{inventory_context}

Rules:
1. Give SHORT, direct answers (2-3 sentences max)
2. Only provide detailed explanations if user asks "why", "how", or "explain"
3. For stock queries: just state the quantity and expiry
4. Mark EXPIRED if today > expiry date
5. Answer medical questions helpfully using your knowledge
6. Use history to resolve 'it', 'that batch', 'same medicine'

Be concise and organized. Expand only when asked."""

    llm_messages = [{"role": "system", "content": system_prompt}] + full_history[-8:]

    client = get_client()
    try:
        response = client.chat.completions.create(
            model=TEXT_MODEL,
            messages=llm_messages,
            max_tokens=300,  # Reduced for faster, more concise responses
            timeout=15,
        )
        resp_text = response.choices[0].message.content
    except Exception as e:
        print(f"[database_query_node] LLM error: {e}")
        resp_text = "⚠️ I'm having trouble reaching the AI right now. Please try again in a moment."
    return {
        "final_response": resp_text,
        "messages": [{"role": "assistant", "content": resp_text}],
        "last_inventory_query": user_query,
    }

# --- TEXT-BASED ADD NODE ---
def text_add_node(state: PharmacyState):
    """Parse product details from natural language text (with memory context) and insert into Firestore."""
    user_query = state.get("user_query", "")
    full_history = state.get("messages") or []
    last_scanned = state.get("last_scanned_image") or {}
    last_added = state.get("last_added_medicine") or {}
    client = get_client()
    today = datetime.date.today()

    # Build memory context hint for the extractor
    memory_ctx = []
    if last_scanned.get("product_name"):
        memory_ctx.append(f"Recently scanned image: {last_scanned}")
    if last_added.get("name"):
        memory_ctx.append(f"Recently added: {last_added}")
    # Include last 4 messages for pronoun resolution
    recent_msgs = "\n".join(f"{m['role'].upper()}: {m['content'][:300]}" for m in full_history[-8:]) or "None"
    memory_hint = "\n".join(memory_ctx) or "None"

    try:
        response = client.chat.completions.create(
            model=TEXT_MODEL,
            messages=[{"role": "user", "content": f"""Extract product details for a pharmacy ADD request. Use conversation history to resolve 'it', 'that one', etc.

Memory context:
{memory_hint}

Recent conversation:
{recent_msgs}

Current request: "{user_query}"

Return ONLY a JSON object with:
- product_name: string (resolve from history if 'it' or 'that')
- batch_number: batch/lot if mentioned, else generate "TXT-<4 random digits>"
- expiry_date: YYYY-MM-DD format
- category: pick from [Pain & Fever | Cold & Allergy | Digestion & Nausea | Skin & Dermatology | Vitamins & Nutrition | First Aid & Wound Care | Eye & Ear Care | Oral Care | Feminine Care | Baby & Child Care | Cardiovascular & BP | Diabetes Care | Antibiotics | Medical Devices | Personal Hygiene | General/Other]
- stock: integer (0 if not stated)

JSON only."""}],
            response_format={"type": "json_object"},
            max_tokens=200,
            timeout=15,
        )
        import json as _json
        data = _json.loads(response.choices[0].message.content)

        name     = data.get("product_name", "Unknown")
        batch    = data.get("batch_number") or f"TXT-{random.randint(1000,9999)}"
        expiry   = data.get("expiry_date", "UNKNOWN")
        category = data.get("category", "Other")
        stock    = int(data.get("stock") or 0)

        # Block expired products
        try:
            exp_date = datetime.date.fromisoformat(expiry)
            if exp_date < today:
                resp_text = f"Cannot add **{name}** — expiry date {expiry} is in the past. Please check the date and try again."
                return {"final_response": resp_text, "messages": [{"role": "assistant", "content": resp_text}],
                        "pending_quarantine": None, "hitl_decision": None}
        except Exception:
            pass

        stock_note = f" | Stock: {stock}" if stock > 0 else ""
        resp_text = f"Added **{name}** ({category}) to inventory | Batch: {batch} | Exp: {expiry}{stock_note}"
        return {
            "final_response": resp_text,
            "pending_inserts": [{"batch_number": batch, "expiry_date": expiry,
                                  "product_name": name, "category": category, "stock": stock}],
            "messages": [{"role": "assistant", "content": resp_text}],
            "pending_quarantine": None,
            "hitl_decision": None,
            "last_added_medicine": {"name": name, "batch": batch, "expiry": expiry},
        }

    except Exception as e:
        resp_text = f"Could not parse product details: {e}. Please include the medicine name, batch number, expiry date, and quantity."
        return {
            "final_response": resp_text,
            "messages": [{"role": "assistant", "content": resp_text}],
            "pending_quarantine": None,
            "hitl_decision": None,
        }


# --- UPDATE NODE ---
def database_update_node(state: PharmacyState):
    user_query = state.get("user_query", "")
    full_history = state.get("messages") or []
    last_added = state.get("last_added_medicine") or {}
    client = get_client()

    # Build context so LLM can resolve 'it'/'that batch'
    recent_str = "\n".join(f"{m['role'].upper()}: {m['content'][:300]}" for m in full_history[-8:]) or "None"
    memory_hint = f"Last added medicine: {last_added}" if last_added else "None"

    try:
        response = client.chat.completions.create(
            model=TEXT_MODEL,
            messages=[{"role": "user", "content": f'Extract batch_number and new_name from the request below. Use conversation history to resolve "it", "that batch", etc.\n\nMemory: {memory_hint}\nRecent:\n{recent_str}\n\nRequest: "{user_query}"\n\nReturn ONLY JSON: {{"batch_number":"...","new_name":"..."}}'}],
            response_format={"type": "json_object"},
            max_tokens=80,
            timeout=10,
        )
        data = json.loads(response.choices[0].message.content)
        batch, new_name = data.get("batch_number"), data.get("new_name")
        if not batch or batch.strip().lower() in ("", "none", "null", "unknown", "..."):
            resp_text = "I can update a product name for you. Please provide the batch number and the new name, e.g. *'Update batch ABC123 to Paracetamol 500mg'*."
            return {"final_response": resp_text, "messages": [{"role": "assistant", "content": resp_text}]}
        if not new_name or new_name.strip().lower() in ("", "none", "null", "unknown", "..."):
            resp_text = f"Please also provide the new product name for batch **{batch}**."
            return {"final_response": resp_text, "messages": [{"role": "assistant", "content": resp_text}]}
            
        user_id = _resolve_user_id(state)
        if database.update_product_name(batch, new_name, user_id=user_id):
            resp_text = f"🔄 Updated batch **{batch}** name to **{new_name}**."
            return {"final_response": resp_text, "messages": [{"role": "assistant", "content": resp_text}]}
        resp_text = f"⚠️ Batch **{batch}** was not found in the inventory. Please check the batch number and try again."
        return {"final_response": resp_text, "messages": [{"role": "assistant", "content": resp_text}]}
    except Exception as e:
        resp_text = f"Update failed: {e}"
        return {"final_response": resp_text, "messages": [{"role": "assistant", "content": resp_text}]}


# --- DELETE NODE ---
def database_delete_node(state: PharmacyState):
    user_query = state.get("user_query", "")
    full_history = state.get("messages") or []
    last_added = state.get("last_added_medicine") or {}
    last_scanned = state.get("last_scanned_image") or {}
    user_id = _resolve_user_id(state)
    client = get_client()

    recent_str = "\n".join(f"{m['role'].upper()}: {m['content'][:300]}" for m in full_history[-8:]) or "None"
    memory_hint = f"Last added medicine: {last_added}. Last scanned: {last_scanned}."

    try:
        response = client.chat.completions.create(
            model=TEXT_MODEL,
            messages=[{"role": "user", "content": f'Extract the batch_number or product name from the request below to delete. Use conversation history to resolve "it", "that batch", etc.\n\nMemory: {memory_hint}\nRecent:\n{recent_str}\n\nRequest: "{user_query}"\n\nReturn ONLY JSON: {{"identifier":"..."}}'}],
            response_format={"type": "json_object"},
            max_tokens=80,
            timeout=10,
        )
        data = json.loads(response.choices[0].message.content)
        identifier = data.get("identifier")
        
        if not identifier and ("it" in user_query.lower() or "that" in user_query.lower() or "this" in user_query.lower()):
            if last_added and last_added.get("batch"):
                identifier = last_added["batch"]
            elif last_scanned and last_scanned.get("batch_number"):
                identifier = last_scanned["batch_number"]
                
        if not identifier or identifier.strip().lower() in ("", "none", "null", "unknown", "..."):
            resp_text = "I can delete a product for you. Please provide the batch number or exact name you'd like to remove."
            return {"final_response": resp_text, "messages": [{"role": "assistant", "content": resp_text}]}
            
        success = database.delete_batch(identifier, user_id=user_id)
        
        if not success:
            inventory = database.get_inventory_with_stock(user_id=user_id)
            for item in inventory:
                if item.get("product_name", "").lower() == identifier.lower() or item.get("batch_number", "") == identifier:
                    success = database.delete_batch(item["doc_id"], user_id=user_id)
                    if success:
                        identifier = item.get("product_name", identifier)
                        break
                        
        if success:
            resp_text = f"🗑️ Successfully deleted **{identifier}** from your inventory."
            return {"final_response": resp_text, "messages": [{"role": "assistant", "content": resp_text}]}
            
        resp_text = f"⚠️ Batch or item **{identifier}** was not found in your inventory. Please check the batch number and try again."
        return {"final_response": resp_text, "messages": [{"role": "assistant", "content": resp_text}]}
    except Exception as e:
        resp_text = f"Delete failed: {e}"
        return {"final_response": resp_text, "messages": [{"role": "assistant", "content": resp_text}]}

# --- CLINICAL NODE (DDI tool-first, ChromaDB fallback) ---
def clinical_knowledge_node(state: PharmacyState):
    user_query = state.get("user_query", "")
    full_history = state.get("messages") or []
    last_interaction = state.get("last_interaction_checked") or {}

    # ── STAGE 1: Structured DDI lookup ─────────────────────────────────────
    ddi_pattern = re.compile(
        r'(?:can\s+i\s+take|interaction|interact|combine|safe\s+with|take\s+with)'
        r'.{0,60}?'
        r'([A-Za-z][A-Za-z0-9\- ]+?)\s+(?:with|and|together\s+with)\s+([A-Za-z][A-Za-z0-9\- ]+)',
        re.IGNORECASE
    )
    match = ddi_pattern.search(user_query)

    if not match:
        plain = re.compile(
            r'^([A-Za-z][A-Za-z0-9\- ]+?)\s+(?:and|with|\+)\s+([A-Za-z][A-Za-z0-9\- ]+)\??$',
            re.IGNORECASE
        )
        match = plain.match(user_query.strip())

    # Handle follow-up: "what about with X?" — reuse last drug_a from memory
    if not match and last_interaction.get("drug_a"):
        followup = re.compile(
            r'(?:what\s+about\s+(?:with\s+)?|and\s+|with\s+)([A-Za-z][A-Za-z0-9\- ]+)',
            re.IGNORECASE
        )
        fm = followup.search(user_query)
        if fm:
            drug_a = last_interaction["drug_a"]
            drug_b = fm.group(1).strip()
            structured_result = ddi_lookup.format_interaction_result(drug_a, drug_b)
            check = ddi_lookup.check_interaction(drug_a, drug_b)
            return {
                "final_response": structured_result,
                "messages": [{"role": "assistant", "content": structured_result}],
                "last_interaction_checked": {"drug_a": drug_a, "drug_b": drug_b, "result": "found" if check["found"] else "not found"},
            }

    if match:
        drug_a = match.group(1).strip()
        drug_b = match.group(2).strip()
        structured_result = ddi_lookup.format_interaction_result(drug_a, drug_b)
        check = ddi_lookup.check_interaction(drug_a, drug_b)
        if check["found"]:
            return {
                "final_response": structured_result,
                "messages": [{"role": "assistant", "content": structured_result}],
                "last_interaction_checked": {"drug_a": drug_a, "drug_b": drug_b, "result": "found"},
            }

    # ── STAGE 2: ChromaDB vector search with conversation history ───────────
    try:
        results = vector_collection.query(query_texts=[user_query], n_results=1)
        context = results["documents"][0][0] if results["documents"] else "No clinical data found."
        client = get_client()
        llm_messages = [
            {"role": "system", "content": f"""You are a clinical pharmacy assistant.

Reference data:
{context}

Instructions:
1. Give CONCISE answers (3-4 sentences) unless user asks for details
2. For drug interactions: state if safe/unsafe, main concern, and precaution
3. Use reference data if relevant, otherwise use your medical knowledge
4. Always end with: "Consult your healthcare provider for personalized advice"
5. Use history to resolve 'it', 'same drug', 'what about with X?'

Be brief and organized. Expand only when asked."""},
        ] + full_history[-8:]
        response = client.chat.completions.create(
            model=TEXT_MODEL,
            messages=llm_messages,
            max_tokens=300,  # Reduced for faster, more concise responses
            timeout=15,
        )
        resp_text = response.choices[0].message.content
        return {
            "final_response": resp_text,
            "messages": [{"role": "assistant", "content": resp_text}],
        }
    except Exception as e:
        resp_text = f"Vector search error: {e}"
        return {"final_response": resp_text, "messages": [{"role": "assistant", "content": resp_text}]}

# --- COMPILE GRAPH WITH MEMORY CHECKPOINTER ---
memory = MemorySaver()

workflow = StateGraph(PharmacyState)

# Add Nodes
workflow.add_node("supervisor", supervisor_node)
workflow.add_node("vision_extraction_node", vision_extraction_node)
workflow.add_node("human_approval_node", human_approval_node)
workflow.add_node("text_add_node", text_add_node)
workflow.add_node("database_query_node", database_query_node)
workflow.add_node("database_update_node", database_update_node)
workflow.add_node("database_delete_node", database_delete_node)
workflow.add_node("clinical_knowledge_node", clinical_knowledge_node)

# Define Supervisor Workflow
workflow.add_edge(START, "supervisor")

workflow.add_conditional_edges("supervisor", route_from_supervisor, {
    "vision_extraction_node": "vision_extraction_node",
    "text_add_node": "text_add_node",
    "database_query_node": "database_query_node",
    "database_update_node": "database_update_node",
    "database_delete_node": "database_delete_node",
    "clinical_knowledge_node": "clinical_knowledge_node"
})

# Vision always feeds into the human approval gate
workflow.add_edge("vision_extraction_node", "human_approval_node")
workflow.add_edge("human_approval_node", END)
workflow.add_edge("text_add_node", END)
workflow.add_edge("database_query_node", END)
workflow.add_edge("database_update_node", END)
workflow.add_edge("database_delete_node", END)
workflow.add_edge("clinical_knowledge_node", END)

app = workflow.compile(checkpointer=memory)