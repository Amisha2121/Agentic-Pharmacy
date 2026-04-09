# -*- coding: utf-8 -*-
import os
import json
import re
import time
import base64
import random
import datetime
from typing import TypedDict, Optional
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

def extract_json(text: str) -> dict:
    """Robustly extract a JSON object from LLM output, handling common quirks."""
    # Strip markdown code fences
    if "```" in text:
        parts = text.split("```")
        for part in parts:
            cleaned = part.strip().lstrip("json").strip()
            if cleaned.startswith("{"):
                text = cleaned
                break

    # Find the first {...} block
    match = re.search(r'\{[^{}]*\}', text, re.DOTALL)
    if match:
        candidate = match.group(0)
        # Fix trailing commas before } or ]
        candidate = re.sub(r',\s*([}\]])', r'\1', candidate)
        # Fix single quotes → double quotes
        candidate = candidate.replace("'", '"')
        try:
            return json.loads(candidate)
        except Exception:
            pass

    # Last resort: extract fields individually via regex
    result = {}
    for key in ["batch_number", "expiry_date", "product_name", "category"]:
        m = re.search(r'["\']?' + re.escape(key) + r'["\']?\s*:\s*["\']([^"\' ]+)["\']', text)
        if m:
            result[key] = m.group(1)
    return result


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
TEXT_MODEL   = "llama-3.3-70b-versatile"                    # Fast text model

# ChromaDB Cloud fallback
class MockCollection:
    def query(self, *args, **kwargs): return {"documents": [["No clinical data found (MOCK)."]]}

vector_collection = MockCollection()
try:
    print("ChromaDB: Initializing CloudClient...")
    chroma_client = chromadb.CloudClient(
        api_key=os.getenv("CHROMA_API_KEY"),
        tenant=os.getenv("CHROMA_TENANT"),
        database=os.getenv("CHROMA_DATABASE")
    )
    # Using a shorter timeout if possible, but CloudClient might not support it directly
    vector_collection = chroma_client.get_or_create_collection(name="amisha2121_agentic_pharmacy_main")
    print("ChromaDB: vector_collection ready")
except Exception as e:
    print(f"ChromaDB error: {e}. Using mock collection.")

# State definition
class PharmacyState(TypedDict):
    image_paths: list[str]
    user_query: str
    final_response: str
    # HITL fields
    pending_quarantine: Optional[dict]   # Set when expired item needs human approval
    hitl_decision: Optional[str]         # "approve" or "reject" — injected on resume
    next_node: str                       # The supervisor uses this to direct the graph

# --- SUPERVISOR NODE ---
def supervisor_node(state: PharmacyState):
    """The LangGraph Supervisor orchestrates which specialized Worker Agent handles the query."""
    if state.get("image_paths") and len(state["image_paths"]) > 0:
        return {"next_node": "vision_extraction_node"}

    user_query = state.get("user_query", "")
    client = get_client()

    try:
        response = client.chat.completions.create(
            model=TEXT_MODEL,
            messages=[{"role": "system", "content": "You are a routing supervisor for a pharmacy AI. Route the user's query to the proper system."},
                      {"role": "user", "content": f"""Classify this query into exactly one word.

Categories:
- ADD: requests to add, log, insert, or register a new product/batch/medicine to inventory (no image)
- INVENTORY: questions about stock, expiry dates, batches, what's in stock, product counts
- CLINICAL: drug interactions, side effects, dosage, medical/pharmacological questions
- UPDATE: requests to rename or update a product/batch name in the database
- GENERAL: greetings, general questions, anything that does not fit the above

Query: "{user_query}"

Reply with EXACTLY one word (ADD, INVENTORY, CLINICAL, UPDATE, or GENERAL)."""}],
            temperature=0.0,
            max_tokens=5
        )
        decision = response.choices[0].message.content.strip().upper()
        if "ADD" in decision:
            return {"next_node": "text_add_node"}
        elif "CLINICAL" in decision:
            return {"next_node": "clinical_knowledge_node"}
        elif "UPDATE" in decision:
            return {"next_node": "database_update_node"}
    except Exception:
        pass
    return {"next_node": "database_query_node"}

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
    # Results are injected as verified ground-truth into the vision prompt.
    barcode_result = {"found": False}
    barcode_batch_override: str | None = None
    barcode_expiry_override: str | None = None
    barcode_qty_override: int = 0
    barcode_hint_text = ""

    for img_path in image_paths:
        scan = barcode_scanner.scan_image(img_path)
        if scan["found"]:
            barcode_result = scan
            barcode_hint_text = barcode_scanner.build_barcode_hint(scan)
            if scan.get("batch_number"):
                barcode_batch_override = scan["batch_number"]
            if scan.get("expiry_date"):
                barcode_expiry_override = scan["expiry_date"]
            if scan.get("quantity"):
                barcode_qty_override = int(scan["quantity"])
            break  # First barcode found wins

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
    # Matches: "qty: 100", "stock 200", "quantity as 30", "have 60", "30 tablets"
    stock_hint = 0
    stock_match = re.search(
        r'(?:qty|quantity|stock|number|count|units?|tablets?|capsules?|pieces?|pcs|have|nos?)'
        r'(?:\s+(?:as|of|is|=|to))?\s*[:\-]?\s*([0-9]+)',
        user_query, re.IGNORECASE
    )
    if not stock_match:
        # Catch plain trailing number after "as": "name as X and quantity as 30"
        stock_match = re.search(r'\bquantity\b.{0,20}?\b([0-9]+)\b', user_query, re.IGNORECASE)
    if not stock_match:
        # Catch plain leading number: "100 Dolo650"
        stock_match = re.search(r'^\s*([0-9]+)\s+[A-Za-z]', user_query)
    if stock_match:
        try:
            stock_hint = int(stock_match.group(1))
        except (ValueError, IndexError):
            stock_hint = 0

    # --- Build the image content blocks ---
    image_blocks = []
    for img_path in image_paths:
        with open(img_path, "rb") as f:
            b64 = base64.b64encode(f.read()).decode("utf-8")
        ext = img_path.rsplit(".", 1)[-1].lower()
        mime = "image/png" if ext == "png" else "image/jpeg"
        image_blocks.append({"type": "image_url", "image_url": {"url": f"data:{mime};base64,{b64}"}})

    sides_msg = (
        f"You are looking at {n} photos of DIFFERENT SIDES of THE SAME medication package. "
        f"Combine information from ALL {n} photos to fill in the details below."
        if n > 1 else
        "You are looking at a photo of a medication package."
    )

    # Build barcode context block for the prompt
    barcode_context = ""
    if barcode_hint_text:
        barcode_context = f"""

⚡ BARCODE PRE-SCAN RESULTS (use these as EXACT ground truth):
{barcode_hint_text}
"""

    # Whether barcode gave us batch/expiry determines what the LLM still needs to do
    needs_batch  = not barcode_batch_override
    needs_expiry = not barcode_expiry_override

    batch_instruction = (
        f'- batch_number: USE EXACTLY "{barcode_batch_override}" (from barcode — do NOT change)'
        if barcode_batch_override
        else '- batch_number: alphanumeric code on "Batch No" line'
    )
    expiry_instruction = (
        f'- expiry_date: USE EXACTLY "{barcode_expiry_override}" (from barcode — do NOT change)'
        if barcode_expiry_override
        else (
            '- expiry_date: in YYYY-MM-DD format\n'
            '⚠️ CRITICAL — Indian stamped labels print dates VERTICALLY in this exact order:\n'
            '  Line 1: Batch No.\n'
            '  Line 2: Mfg. Date  ← MANUFACTURING date (top)\n'
            '  Line 3: Exp. Date  ← EXPIRY date (bottom, ALWAYS later than Mfg. Date)\n'
            'NEVER return the Mfg. Date as the expiry date.'
        )
    )

    prompt = f"""{sides_msg}{barcode_context}

User hint (use if helpful): "{user_query}"

{"" if barcode_hint_text else "STEP 1 — LIST EVERY DATE visible on ALL photos. Include the label next to each date.\n\n"}\
STEP {"1" if barcode_hint_text else "2"} — EXTRACT these fields:
{batch_instruction}
{expiry_instruction}
- product_name: brand name from the front of the package
- category: Tablet | Liquid/Syrup | Capsule | Lozenges | Cream/Ointment | Drops | Spray | Other
- stock_quantity: number of units/tablets/bottles visible on the label or stated by user (0 if not found)

STEP {"2" if barcode_hint_text else "3"} — OUTPUT ONE JSON (no markdown, no explanation):
{{"batch_number": "...", "expiry_date": "YYYY-MM-DD", "product_name": "...", "category": "...", "stock_quantity": 0}}

Date conversion (only if reading from image):
- MM/YYYY → last day of month: 11/2026 → "2026-11-30"
- MM/YY   → assume 20YY:    11/27  → "2027-11-30"
- DD/MM/YYYY → convert directly"""

    max_retries = 5
    for attempt in range(max_retries):
        try:
            response = client.chat.completions.create(
                model=VISION_MODEL,
                messages=[{"role": "user", "content": image_blocks + [{"type": "text", "text": prompt}]}],
                temperature=0.0,
                max_tokens=400
            )

            raw = response.choices[0].message.content.strip()
            data = extract_json(raw)
            batch    = data.get("batch_number", "UNKNOWN")
            expiry   = data.get("expiry_date", "UNKNOWN")
            name     = data.get("product_name", "Unknown")
            category = data.get("category", "Unknown")
            # Stock priority: barcode qty → user hint → image extraction → 0
            try:
                img_stock = int(data.get("stock_quantity", 0) or 0)
            except (ValueError, TypeError):
                img_stock = 0
            stock = barcode_qty_override if barcode_qty_override > 0 else (
                stock_hint if stock_hint > 0 else img_stock
            )

            # Apply barcode overrides as highest-priority ground truth
            override_note = ""
            if barcode_expiry_override:
                expiry = barcode_expiry_override
                override_note = " *(expiry from barcode ✅)*"
            elif expiry_override:
                expiry = expiry_override
                override_note = " *(expiry from your hint)*"

            if barcode_batch_override:
                batch = barcode_batch_override

            if not batch or batch.upper() in ("UNKNOWN", "NOT FOUND", "N/A", ""):
                batch = f"BATCH-{datetime.datetime.now().strftime('%Y%m%d-%H%M%S')}"
                batch_note = " *(batch unreadable, auto-ID assigned)*"
            else:
                batch_note = ""

            # Expiry sanity check — block ALL expired products, no exceptions
            try:
                import pandas as pd
                exp_date = pd.to_datetime(expiry, dayfirst=False, errors="coerce").date()
                if exp_date and exp_date < today:
                    # Product is expired — do NOT log to any collection
                    years_ago = (today - exp_date).days / 365
                    if years_ago > 3:
                        reason = (
                            f"The read expiry ({exp_date}) is over 3 years ago — "
                            f"the AI may have read the Manufacturing Date instead. "
                            f"Please check the label and re-scan with the correct expiry date in your hint."
                        )
                    else:
                        reason = f"This product expired on **{exp_date}**."
                    return {
                        "final_response": (
                            f"❌ **Not Logged — Expired Product** | **{name}** ({category}) "
                            f"| Batch: {batch}{batch_note} | Expiry: {exp_date}\n\n"
                            f"⚠️ {reason}"
                        ),
                        "pending_quarantine": None,
                        "hitl_decision": None,
                    }

            except Exception:
                pass


            # Happy path — log to main inventory
            database.insert_batch(batch, expiry, name, category, stock)
            photo_word = f"{n} photos" if n > 1 else "photo"
            stock_note = f" | Stock: {stock}" if stock > 0 else ""
            barcode_tag = " | 🔖 Barcode verified" if barcode_result["found"] else ""
            return {
                "final_response": (
                    f"✅ Logged **{name}** ({category}) from {photo_word}"
                    f"{barcode_tag} | Batch: {batch}{batch_note} | Exp: {expiry}{override_note}{stock_note}"
                ),
                "pending_quarantine": None,
                "hitl_decision": None,
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
    inventory_data = database.get_inventory()
    inventory_context = "\n".join([f"- {r[2]} ({r[3]}) | Batch: {r[0]} | Exp: {r[1]} | Stock: {r[5]}" for r in inventory_data])

    client = get_client()
    response = client.chat.completions.create(
        model=TEXT_MODEL,
        messages=[
            {"role": "system", "content": f"""You are a pharmacy inventory auditor.
TODAY: {today}
INVENTORY:
{inventory_context}
Rules: Only reference listed products. Mark as EXPIRED if today > expiry date."""},
            {"role": "user", "content": user_query}
        ],
        max_tokens=1024
    )
    return {"final_response": response.choices[0].message.content}

# --- TEXT-BASED ADD NODE ---
def text_add_node(state: PharmacyState):
    """Parse product details from natural language text and insert into Firestore."""
    user_query = state.get("user_query", "")
    client = get_client()
    today = datetime.date.today()

    try:
        response = client.chat.completions.create(
            model=TEXT_MODEL,
            messages=[{"role": "user", "content": f"""Extract product details from this pharmacy request and return ONLY a JSON object.

Request: "{user_query}"

Return JSON with these exact keys:
- product_name: the medicine/product name (string)
- batch_number: batch/lot number if mentioned, else generate "TXT-<4 random digits>" (string)
- expiry_date: in YYYY-MM-DD format, convert "7th April 2026" → "2026-04-07" (string)
- category: Analyze the brand or generic name of the product implicitly and pick the BEST matching category exactly from this list:
    * Pain & Fever       → Dolo650, Paracetamol, Aspirin, Ibuprofen, Crocin, Combiflam, Volini, Moov
    * Cold & Allergy     → Cough syrups, Benadryl, Cetirizine, Otrivin, Nasivion, Vicks, Allegra
    * Digestion & Nausea → Antacids, Digene, Gelusil, ORS, Laxatives, Pantoprazole, Omeprazole
    * Skin & Dermatology → Betadine, Neosporin, Boro Plus, Lacto Calamine, antifungal creams
    * Vitamins & Nutrition → Vitamin C, Zincovit, Calcium, Ensure, Horlicks, Fish Oil
    * First Aid & Wound Care → Band-aids, Savlon, Dettol, Cotton rolls, Syringes, Gauze
    * Eye & Ear Care     → Optive, Murine, ear drops, contact lens solution
    * Oral Care          → Mouthwash, Sensodyne, Listerine, dental floss
    * Feminine Care      → Sofy, Stayfree, Whisper, intimate wash
    * Baby & Child Care  → Pampers, Gripe water, baby powder, diaper rash cream
    * Cardiovascular & BP→ Amlodipine, Atorvastatin, Losartan, Rosuvastatin
    * Diabetes Care      → Metformin, Insulin, Glucometer strips, Lancets
    * Antibiotics        → Amoxicillin, Azithromycin, Ciprofloxacin, Doxycycline
    * Medical Devices    → Thermometer, BP Monitor, Oximeter, Inhalers
    * Personal Hygiene   → Soaps, sanitizers, wet wipes, face wash
    * General/Other      → Anything that fundamentally does not fit above
- stock: quantity as integer (0 if not mentioned)

JSON only, no explanation."""}],
            response_format={"type": "json_object"},
            max_tokens=250
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
                return {"final_response": (
                    f"Cannot add **{name}** — expiry date {expiry} is in the past. "
                    "Please check the date and try again."
                ), "pending_quarantine": None, "hitl_decision": None}
        except Exception:
            pass

        database.insert_batch(batch, expiry, name, category, stock)
        stock_note = f" | Stock: {stock}" if stock > 0 else ""
        return {
            "final_response": (
                f"Added **{name}** ({category}) to inventory | "
                f"Batch: {batch} | Exp: {expiry}{stock_note}"
            ),
            "pending_quarantine": None,
            "hitl_decision": None,
        }

    except Exception as e:
        return {
            "final_response": f"Could not parse product details: {e}. Please include product name, batch number, expiry date, and quantity.",
            "pending_quarantine": None,
            "hitl_decision": None,
        }


# --- UPDATE NODE ---
def database_update_node(state: PharmacyState):
    user_query = state.get("user_query", "")
    client = get_client()
    try:
        response = client.chat.completions.create(
            model=TEXT_MODEL,
            messages=[{"role": "user", "content": f'Extract batch_number and new_name from: "{user_query}". Return ONLY JSON: {{"batch_number":"...","new_name":"..."}}'}],
            response_format={"type": "json_object"},
            max_tokens=100
        )
        data = json.loads(response.choices[0].message.content)
        batch, new_name = data.get("batch_number"), data.get("new_name")
        # Guard against null/empty values — LLM couldn't extract a real batch
        if not batch or batch.strip().lower() in ("", "none", "null", "unknown", "..."):
            return {"final_response": "I can update a product name for you. Please provide the batch number and the new name, e.g. *'Update batch ABC123 to Paracetamol 500mg'*."}
        if not new_name or new_name.strip().lower() in ("", "none", "null", "unknown", "..."):
            return {"final_response": f"Please also provide the new product name for batch **{batch}**."}
        if database.update_product_name(batch, new_name):
            return {"final_response": f"🔄 Updated batch **{batch}** name to **{new_name}**."}
        return {"final_response": f"⚠️ Batch **{batch}** was not found in the inventory. Please check the batch number and try again."}
    except Exception as e:
        return {"final_response": f"Update failed: {e}"}

# --- CLINICAL NODE (DDI tool-first, ChromaDB fallback) ---
def clinical_knowledge_node(state: PharmacyState):
    user_query = state.get("user_query", "")

    # ── STAGE 1: Structured DDI lookup ─────────────────────────────────────
    # Detect drug-interaction intent: "X with Y", "X and Y", "X interact Y" etc.
    ddi_pattern = re.compile(
        r'(?:can\s+i\s+take|interaction|interact|combine|safe\s+with|take\s+with)'
        r'.{0,60}?'
        r'([A-Za-z][A-Za-z0-9\- ]+?)\s+(?:with|and|together\s+with)\s+([A-Za-z][A-Za-z0-9\- ]+)',
        re.IGNORECASE
    )
    match = ddi_pattern.search(user_query)

    # Also handle plain "Drug A and Drug B" without trigger words
    if not match:
        plain = re.compile(
            r'^([A-Za-z][A-Za-z0-9\- ]+?)\s+(?:and|with|\+)\s+([A-Za-z][A-Za-z0-9\- ]+)\??$',
            re.IGNORECASE
        )
        match = plain.match(user_query.strip())

    if match:
        drug_a = match.group(1).strip()
        drug_b = match.group(2).strip()
        structured_result = ddi_lookup.format_interaction_result(drug_a, drug_b)

        # If at least one drug was found in the FDA dataset, return structured result directly
        check = ddi_lookup.check_interaction(drug_a, drug_b)
        if check["found"]:
            return {"final_response": structured_result}

    # ── STAGE 2: ChromaDB vector search fallback ────────────────────────────
    try:
        results = vector_collection.query(query_texts=[user_query], n_results=1)
        context = results["documents"][0][0] if results["documents"] else "No clinical data found."
        client = get_client()
        response = client.chat.completions.create(
            model=TEXT_MODEL,
            messages=[
                {"role": "system", "content": f"Use this reference:\n\n{context}"},
                {"role": "user", "content": user_query}
            ],
            max_tokens=1024
        )
        return {"final_response": f"📚 **Clinical Knowledge (Vector DB):** {response.choices[0].message.content}"}
    except Exception as e:
        return {"final_response": f"Vector search error: {e}"}

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
workflow.add_node("clinical_knowledge_node", clinical_knowledge_node)

# Define Supervisor Workflow
workflow.add_edge(START, "supervisor")

workflow.add_conditional_edges("supervisor", route_from_supervisor, {
    "vision_extraction_node": "vision_extraction_node",
    "text_add_node": "text_add_node",
    "database_query_node": "database_query_node",
    "database_update_node": "database_update_node",
    "clinical_knowledge_node": "clinical_knowledge_node"
})

# Vision always feeds into the human approval gate
workflow.add_edge("vision_extraction_node", "human_approval_node")
workflow.add_edge("human_approval_node", END)
workflow.add_edge("text_add_node", END)
workflow.add_edge("database_query_node", END)
workflow.add_edge("database_update_node", END)
workflow.add_edge("clinical_knowledge_node", END)

app = workflow.compile(checkpointer=memory)