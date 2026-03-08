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

load_dotenv()

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
def get_client():
    return OpenAI(
        api_key=os.getenv("GROQ_API_KEY"),
        base_url="https://api.groq.com/openai/v1"
    )

VISION_MODEL = "meta-llama/llama-4-scout-17b-16e-instruct"  # Supports vision
TEXT_MODEL   = "llama-3.3-70b-versatile"                    # Fast text model

# ChromaDB Cloud for clinical knowledge
chroma_client = chromadb.CloudClient(
    api_key=os.getenv("CHROMA_API_KEY"),
    tenant=os.getenv("CHROMA_TENANT"),
    database=os.getenv("CHROMA_DATABASE")
)
vector_collection = chroma_client.get_or_create_collection(name="amisha2121_agentic_pharmacy_main")

# State definition
class PharmacyState(TypedDict):
    image_paths: list[str]
    user_query: str
    final_response: str
    # HITL fields
    pending_quarantine: Optional[dict]   # Set when expired item needs human approval
    hitl_decision: Optional[str]         # "approve" or "reject" — injected on resume

# --- ROUTER ---
def route_intent(state: PharmacyState):
    if state.get("image_paths") and len(state["image_paths"]) > 0:
        return "vision_extraction_node"

    user_query = state.get("user_query", "")
    client = get_client()

    try:
        response = client.chat.completions.create(
            model=TEXT_MODEL,
            messages=[{"role": "user", "content": f"""Classify this query into one word — INVENTORY, CLINICAL, or UPDATE.
Query: "{user_query}"
Reply with EXACTLY one word."""}],
            temperature=0.0,
            max_tokens=5
        )
        decision = response.choices[0].message.content.strip().upper()
        if "CLINICAL" in decision:
            return "clinical_knowledge_node"
        elif "UPDATE" in decision:
            return "database_update_node"
    except Exception:
        pass
    return "database_query_node"

# --- VISION NODE ---
def vision_extraction_node(state: PharmacyState):
    client = get_client()
    user_query = state.get("user_query", "")
    image_paths = state.get("image_paths", [])
    today = datetime.date.today()
    n = len(image_paths)

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

    prompt = f"""{sides_msg}

User hint (use if helpful): "{user_query}"

STEP 1 — LIST EVERY DATE you can read from ALL photos. Include the label next to each date.

STEP 2 — IDENTIFY EXPIRY DATE CORRECTLY:
⚠️ CRITICAL — Indian stamped labels print dates VERTICALLY in this exact order:
  Line 1: Batch No.
  Line 2: Mfg. Date  ← MANUFACTURING date (top)
  Line 3: Exp. Date  ← EXPIRY date (bottom, ALWAYS later than Mfg. Date)

Example: If you see "Mfg. Date: 11/2017" and "Exp. Date: 11/2020", the expiry is 2020-11-30.
The expiry date label will say "Exp." or "Exp. Date" — it is the date BELOW the manufacturing date.
NEVER return the Mfg. Date as the expiry date.

STEP 3 — EXTRACT:
- batch_number: alphanumeric code on "Batch No" line
- product_name: brand name from front of package
- category: Tablet | Liquid/Syrup | Capsule | Lozenges | Cream/Ointment | Drops | Spray | Other

STEP 4 — OUTPUT ONE JSON (no markdown, no explanation):
{{"batch_number": "...", "expiry_date": "YYYY-MM-DD", "product_name": "...", "category": "..."}}

Date conversion:
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

            # Apply user-provided expiry override if present
            override_note = ""
            if expiry_override:
                expiry = expiry_override
                override_note = " *(expiry from your hint)*"

            if not batch or batch.upper() in ("UNKNOWN", "NOT FOUND", "N/A", ""):
                batch = f"BATCH-{datetime.datetime.now().strftime('%Y%m%d-%H%M%S')}"
                batch_note = " *(batch unreadable, auto-ID assigned)*"
            else:
                batch_note = ""

            # Expiry sanity check
            try:
                import pandas as pd
                exp_date = pd.to_datetime(expiry, dayfirst=False, errors="coerce").date()
                if exp_date:
                    years_ago = (today - exp_date).days / 365

                    if years_ago > 3:
                        # Suspiciously old — model likely read Mfg. Date instead
                        database.insert_batch(batch, expiry, name, category)
                        return {
                            "final_response": (
                                f"⚠️ **Date may be incorrect** | **{name}** ({category}) "
                                f"| Batch: {batch}{batch_note} | Read expiry: {exp_date} "
                                f"| 🔍 The date seems too old — the AI may have read the "
                                f"Manufacturing Date instead of Expiry Date. "
                                f"Product logged but please verify the expiry date manually."
                            ),
                            "pending_quarantine": None,
                            "hitl_decision": None,
                        }

                    elif years_ago > 0:
                        # ✋ HITL TRIGGER: Genuinely expired — pause for human approval
                        return {
                            "final_response": "",
                            "pending_quarantine": {
                                "batch": batch,
                                "expiry": str(exp_date),
                                "name": name,
                                "category": category,
                                "batch_note": batch_note,
                            },
                            "hitl_decision": None,
                        }

            except Exception:
                pass

            # Happy path — log to main inventory
            database.insert_batch(batch, expiry, name, category)
            photo_word = f"{n} photos" if n > 1 else "photo"
            return {
                "final_response": (
                    f"✅ Logged **{name}** ({category}) from {photo_word} "
                    f"| Batch: {batch}{batch_note} | Exp: {expiry}"
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
    inventory_context = "\n".join([f"- {r[2]} ({r[3]}) | Batch: {r[0]} | Exp: {r[1]}" for r in inventory_data])

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
        if database.update_product_name(batch, new_name):
            return {"final_response": f"🔄 Updated batch **{batch}** name to **{new_name}**."}
        return {"final_response": f"⚠️ Batch {batch} not found."}
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
workflow.add_node("vision_extraction_node", vision_extraction_node)
workflow.add_node("human_approval_node", human_approval_node)
workflow.add_node("database_query_node", database_query_node)
workflow.add_node("database_update_node", database_update_node)
workflow.add_node("clinical_knowledge_node", clinical_knowledge_node)

workflow.add_conditional_edges(START, route_intent, {
    "vision_extraction_node": "vision_extraction_node",
    "database_query_node": "database_query_node",
    "database_update_node": "database_update_node",
    "clinical_knowledge_node": "clinical_knowledge_node"
})

# Vision always feeds into the human approval gate
workflow.add_edge("vision_extraction_node", "human_approval_node")
workflow.add_edge("human_approval_node", END)
workflow.add_edge("database_query_node", END)
workflow.add_edge("database_update_node", END)
workflow.add_edge("clinical_knowledge_node", END)

app = workflow.compile(checkpointer=memory)