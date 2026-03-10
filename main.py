import streamlit as st
import os
import uuid
import pandas as pd
import datetime
import database
from agent import app
from langgraph.types import Command
from langgraph.errors import GraphInterrupt
from workflow_tracker import StreamlitNodeVisualizer, stream_agent_with_detailed_tracking
from inventory_sales_ui import render_log_daily_sales_tab, render_reorder_alerts_tab, render_expired_alerts_tab

st.set_page_config(page_title="Pharmacy AI Agent", layout="wide")

# ── Run on every page load: deduct + archive any past-day sales logs ──────────
_deduction_msg = database.process_midnight_deductions()
if _deduction_msg:
    st.toast(_deduction_msg, icon="✅")



# --- CUSTOM CSS ---
st.markdown("""
    <style>
    .category-card {
        border: 1px solid #e6e9ef; border-radius: 10px; padding: 20px;
        text-align: center; background-color: #f8f9fa; height: 150px;
        display: flex; flex-direction: column; justify-content: center;
        align-items: center; box-shadow: 2px 2px 5px rgba(0,0,0,0.05);
    }
    .card-icon { font-size: 40px; margin-bottom: 10px; }
    .card-title { font-weight: bold; font-size: 18px; color: #31333F; }
    .stAlert { border-radius: 10px; }
    .hitl-box {
        border: 2px solid #ff4b4b; border-radius: 12px; padding: 20px;
        background: #fff5f5; margin: 10px 0;
    }
    </style>
""", unsafe_allow_html=True)

st.title("🏥 Smart Pharmacy AI & Inventory")
st.markdown("---")

# ─── MIDNIGHT DEDUCTION — Lazy Evaluation ────────────────────────────────────
# Runs silently on every page load. If a new day has started since the last
# run, it deducts yesterday's sales from inventory and clears the sales log.
# Only does real work once per day; subsequent loads return immediately.
if "_midnight_checked" not in st.session_state:
    try:
        deduction_msg = database.process_midnight_deductions()
        if deduction_msg:
            st.toast(deduction_msg, icon="✅")
    except Exception as _e:
        pass   # Don't crash the app on non-critical background task
    st.session_state._midnight_checked = True

# 1. DEFINE TABS
tab1, tab2, tab3, tab4, tab5 = st.tabs([
    "💬 Assistant Chat",
    "📋 Live Inventory Dashboard",
    "🛒 Log Daily Sales",
    "🚨 Reorder Alerts",
    "⛔ Expired Items",
])

# --- TAB 1: CONVERSATIONAL AGENT ---
with tab1:
    # Initialise session state
    if "messages" not in st.session_state:
        st.session_state.messages = [{"role": "assistant", "content": "Ready for updates or clinical questions."}]
    if "thread_id" not in st.session_state:
        st.session_state.thread_id = str(uuid.uuid4())
    if "awaiting_hitl" not in st.session_state:
        st.session_state.awaiting_hitl = False
    if "hitl_product" not in st.session_state:
        st.session_state.hitl_product = None

    # LangGraph config — always use the same thread so MemorySaver can resume
    graph_config = {"configurable": {"thread_id": st.session_state.thread_id}}

    # Render chat history
    for msg in st.session_state.messages:
        with st.chat_message(msg["role"]):
            st.markdown(msg["content"])

    # ─── HITL APPROVAL WIDGET ─────────────────────────────────────────────────
    if st.session_state.awaiting_hitl and st.session_state.hitl_product:
        p = st.session_state.hitl_product
        with st.chat_message("assistant"):
            st.markdown(
                f"""<div class="hitl-box">
                <h4>⚠️ Human Approval Required</h4>
                <p><b>Critical:</b> The Vision Agent detected an <b>expired medication</b>.</p>
                <table>
                    <tr><td><b>Product</b></td><td>{p['name']} ({p['category']})</td></tr>
                    <tr><td><b>Batch</b></td><td>{p['batch']}</td></tr>
                    <tr><td><b>Expired On</b></td><td>{p['expiry']}</td></tr>
                </table>
                <br>
                <p><i>Approve moving this item to the <b>Quarantine DB</b>, or Reject to discard it entirely.</i></p>
                </div>""",
                unsafe_allow_html=True,
            )
            col_approve, col_reject = st.columns(2)
            with col_approve:
                approve_clicked = st.button("✅ Approve — Move to Quarantine", width="stretch", type="primary")
            with col_reject:
                reject_clicked = st.button("❌ Reject — Discard Item", width="stretch")

        if approve_clicked or reject_clicked:
            decision = "approve" if approve_clicked else "reject"
            with st.chat_message("assistant"):
                # Initialize visualizer for HITL decision processing
                visualizer = StreamlitNodeVisualizer()
                visualizer.init_visualization()
                
                try:
                    # Stream the result of HITL decision
                    result = None
                    for event in app.stream(
                        Command(resume={"decision": decision}),
                        config=graph_config,
                        stream_mode="values"
                    ):
                        result = event
                    
                    final_text = result.get("final_response", "") if result else ""
                except GraphInterrupt:
                    final_text = "⚠️ Unexpected second interrupt — please refresh."
                except Exception as e:
                    final_text = f"⚠️ Error resuming workflow: {e}"

                st.markdown(final_text)

            st.session_state.awaiting_hitl = False
            st.session_state.hitl_product = None
            # Fresh thread for next scan
            st.session_state.thread_id = str(uuid.uuid4())
            st.session_state.messages.append({"role": "assistant", "content": final_text})
            st.rerun()

    # ─── NORMAL CHAT INPUT ────────────────────────────────────────────────────
    if not st.session_state.awaiting_hitl:
        prompt = st.chat_input("+ Attach labels or ask a question...", accept_file="multiple", file_type=["jpg", "jpeg", "png"])

        if prompt:
            with st.chat_message("user"):
                user_text = prompt.text if prompt.text else "Processing images..."
                st.write(user_text)
                temp_paths = []
                if prompt.files:
                    files = prompt.files[:6]
                    if len(prompt.files) > 6:
                        st.warning(f"Maximum 6 images allowed. Only the first 6 of {len(prompt.files)} will be processed.")
                    cols_per_row = min(3, len(files))
                    cols = st.columns(cols_per_row)
                    for i, file in enumerate(files):
                        path = f"temp_{i}_{file.name}"
                        with open(path, "wb") as f: f.write(file.getbuffer())
                        temp_paths.append(path)
                        cols[i % cols_per_row].image(path, width=150)

            st.session_state.messages.append({"role": "user", "content": user_text})

            with st.chat_message("assistant"):
                # Initialize workflow visualizer
                visualizer = StreamlitNodeVisualizer()
                visualizer.init_visualization()
                
                try:
                    # Stream agent execution with real-time visualization
                    result = None
                    for event in app.stream(
                        {
                            "image_paths": temp_paths,
                            "user_query": user_text,
                            "final_response": "",
                            "pending_quarantine": None,
                            "hitl_decision": None,
                        },
                        config=graph_config,
                        stream_mode="values"
                    ):
                        result = event
                    
                    final_text = result.get("final_response", "") if result else ""
                    # Clean up temp files
                    for p in temp_paths:
                        if os.path.exists(p): os.remove(p)

                    st.markdown(final_text)
                    st.session_state.messages.append({"role": "assistant", "content": final_text})

                except GraphInterrupt as gi:
                    # Clean up temp files even on interrupt
                    for p in temp_paths:
                        if os.path.exists(p): os.remove(p)

                    # Extract product info from interrupt payload
                    interrupt_value = gi.args[0] if gi.args else {}
                    # GraphInterrupt wraps as list of Interrupt objects
                    if hasattr(interrupt_value, '__iter__') and not isinstance(interrupt_value, dict):
                        try:
                            interrupt_value = list(interrupt_value)[0].value
                        except Exception:
                            interrupt_value = {}

                    product = interrupt_value.get("product", {}) if isinstance(interrupt_value, dict) else {}
                    st.session_state.awaiting_hitl = True
                    st.session_state.hitl_product = product

                    notice = (
                        f"🛑 **HITL Checkpoint triggered** — expired medication detected: "
                        f"**{product.get('name', 'Unknown')}** (Batch: {product.get('batch', '?')}). "
                        f"Awaiting your approval above."
                    )
                    st.markdown(notice)
                    st.session_state.messages.append({"role": "assistant", "content": notice})

                except Exception as e:
                    for p in temp_paths:
                        if os.path.exists(p): os.remove(p)
                    err_text = f"⚠️ Error: {e}"
                    st.markdown(err_text)
                    st.session_state.messages.append({"role": "assistant", "content": err_text})

            st.rerun()

# --- TAB 2: SQUARE CATEGORY DASHBOARD ---
with tab2:
    if "selected_category" not in st.session_state: st.session_state.selected_category = None
    raw_data = database.get_inventory()

    if not raw_data: st.info("No products uploaded yet.")
    else:
        df = pd.DataFrame(raw_data, columns=["Batch #", "Expiry Date", "Product Name", "Category", "Logged At", "Stock"])

        if st.session_state.selected_category is None:
            st.header("📦 Inventory Categories")
            icons = {"Tablet": "💊", "Liquid/Syrup": "🧪", "Capsule": "💊", "Other": "📦", "Cream/Ointment": "🧴"}
            cols = st.columns(3)
            for idx, cat in enumerate(df["Category"].unique()):
                with cols[idx % 3]:
                    st.markdown(f'<div class="category-card"><div class="card-icon">{icons.get(cat, "📦")}</div><div class="card-title">{cat}</div></div>', unsafe_allow_html=True)
                    if st.button(f"Open {cat}", key=f"btn_{cat}", use_container_width=True):
                        st.session_state.selected_category = cat
                        st.rerun()
        else:
            if st.button("⬅️ Back to Categories"):
                st.session_state.selected_category = None
                st.rerun()
            st.header(f"📁 {st.session_state.selected_category} Details")
            st.dataframe(df[df["Category"] == st.session_state.selected_category][["Product Name", "Batch #", "Expiry Date"]], use_container_width=True, hide_index=True)

# --- TAB 3: LOG DAILY SALES ---
with tab3:
    render_log_daily_sales_tab()

# --- TAB 4: REORDER ALERTS ---
with tab4:
    render_reorder_alerts_tab()

# --- TAB 5: EXPIRED ITEMS ---
with tab5:
    render_expired_alerts_tab()
