import streamlit as st
import os
import uuid
import pandas as pd
import datetime
import database
from agent import app, transcribe_audio
import login_ui
from audio_recorder_streamlit import audio_recorder
from langgraph.types import Command
from langgraph.errors import GraphInterrupt
from workflow_tracker import StreamlitNodeVisualizer, stream_agent_with_detailed_tracking
from inventory_sales_ui import render_log_daily_sales_tab, render_reorder_alerts_tab, render_expired_alerts_tab
st.set_page_config(page_title="Pharmacy AI", page_icon="🏥", layout="wide")
# ── Run on every page load: deduct + archive any past-day sales logs ──────────
_deduction_msg = database.process_midnight_deductions()
if _deduction_msg:
    st.toast(_deduction_msg, icon="✅")

# ══ PICCOLO-INSPIRED THEME — Warm cream + forest green ═══════════════════════
st.html("""
<link href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800&display=swap" rel="stylesheet">
<style>
html, body, [class*="css"] { font-family: 'Outfit', sans-serif !important; }
.stApp { background-color: #F4F3ED !important; }
.hero-banner {
    background: linear-gradient(135deg, #1A2F2B 0%, #243d39 60%, #1A2F2B 100%);
    border-radius: 28px; padding: 32px 40px; margin-bottom: 28px;
    display: flex; align-items: center; gap: 22px;
    box-shadow: 0 12px 40px rgba(26,47,43,0.22);
}
.hero-icon  { font-size: 54px; }
.hero-title { font-size: 30px; font-weight: 800; color: #F4F3ED; margin: 0; letter-spacing: -0.6px; }
.hero-sub   { font-size: 14px; color: rgba(244,243,237,.65); margin: 6px 0 0; font-weight: 400; }
.cat-card {
    background: #FFFFFF;
    border: none;
    border-radius: 24px; padding: 28px 16px;
    text-align: center; min-height: 160px;
    display: flex; flex-direction: column;
    justify-content: center; align-items: center;
    transition: transform .25s ease, box-shadow .25s ease; cursor: pointer;
    box-shadow: 0 2px 12px rgba(26,47,43,0.07);
}
.cat-card:hover { transform: translateY(-6px); box-shadow: 0 16px 40px rgba(26,47,43,0.14); }
.cat-icon  { font-size: 44px; margin-bottom: 12px; }
.cat-title { font-weight: 700; font-size: 15px; color: #1A2F2B; margin: 0; }
.cat-count { font-size: 12px; color: #6B7280; margin-top: 5px; font-weight: 400; }
[data-testid="metric-container"] {
    background: #FFFFFF !important;
    border: none !important;
    border-radius: 20px !important;
    padding: 16px 20px !important;
    box-shadow: 0 2px 12px rgba(26,47,43,0.07) !important;
}
[data-testid="metric-container"] label { color: #6B7280 !important; font-size: 12px !important; font-weight: 500 !important; }
[data-testid="metric-container"] [data-testid="stMetricValue"] { color: #1A2F2B !important; font-weight: 700 !important; font-size: 26px !important; }
.stButton > button {
    border-radius: 99px !important;
    background-color: #1A2F2B !important;
    color: #F4F3ED !important;
    border: none !important;
    font-family: 'Outfit', sans-serif !important;
    font-weight: 600 !important;
    padding: 8px 22px !important;
    transition: background .2s, transform .15s !important;
}
.stButton > button:hover { background-color: #243d39 !important; transform: translateY(-1px) !important; }
.stTextInput > div > div > input,
.stNumberInput > div > div > input {
    border-radius: 14px !important;
    border: 1.5px solid #e5e4df !important;
    background: #FFFFFF !important;
    color: #1A2F2B !important;
}
.hitl-box {
    border: 2px solid #ef4444; border-radius: 20px; padding: 20px;
    background: #fff5f5; margin: 10px 0;
}
/* keep tab-list area clean (unused but harmless) */
[data-baseweb="tab-list"] { display: none !important; }
[data-testid="stVerticalBlockBorderWrapper"] {
    border-radius: 20px !important;
    border: 1.5px solid #e5e4df !important;
    background: #FFFFFF !important;
}
/* ── Sidebar nav ─────────────────────────────────────────────────────────────── */
section[data-testid="stSidebar"] {
    background-color: #1A2F2B !important;
    min-width: 220px !important;
    max-width: 240px !important;
}
section[data-testid="stSidebar"] * { color: #F4F3ED !important; }
section[data-testid="stSidebar"] > div:first-child { padding-top: 0 !important; }
/* Kill ANY background/border/shadow on ALL div descendants inside sidebar.
   This nukes the white boxes Streamlit wraps each st.button in. */
section[data-testid="stSidebar"] div,
section[data-testid="stSidebar"] div:focus,
section[data-testid="stSidebar"] div:hover {
    background: transparent !important;
    background-color: transparent !important;
    border: none !important;
    box-shadow: none !important;
    outline: none !important;
}
/* Re-apply hover only to the actual button element */
section[data-testid="stSidebar"] button {
    background: transparent !important;
    background-color: transparent !important;
    border: none !important;
    box-shadow: none !important;
    outline: none !important;
    color: rgba(244,243,237,0.72) !important;
    border-radius: 10px !important;
    text-align: left !important;
    justify-content: flex-start !important;
    width: 100% !important;
    padding: 10px 14px !important;
    font-size: 14px !important;
    font-weight: 500 !important;
    letter-spacing: 0.01em !important;
    transition: background .18s !important;
}
section[data-testid="stSidebar"] button:hover {
    background: rgba(255,255,255,0.09) !important;
    background-color: rgba(255,255,255,0.09) !important;
    color: #F4F3ED !important;
}
section[data-testid="stSidebar"] button:focus,
section[data-testid="stSidebar"] button:active {
    background: transparent !important;
    background-color: transparent !important;
    color: rgba(244,243,237,0.72) !important;
}
/* Dataframe/table styling in main area */
[data-testid="stDataFrame"] iframe,
.stDataFrame { border-radius: 14px !important; overflow: hidden !important; }
/* Expander panels */
[data-testid="stExpander"] {
    background: #FFFFFF !important;
    border: 1.5px solid #e5e4df !important;
    border-radius: 16px !important;
    overflow: hidden !important;
    margin-bottom: 8px !important;
}
[data-testid="stExpander"] summary {
    font-weight: 600 !important;
    color: #1A2F2B !important;
    padding: 12px 16px !important;
    font-size: 14px !important;
}
.stock-pill { display: inline-block; border-radius: 99px; padding: 3px 12px; font-size: 12px; font-weight: 600; }
.pill-green  { background: #d1fae5; color: #065f46; }
.pill-yellow { background: #fef3c7; color: #78350f; }
.pill-red    { background: #fee2e2; color: #991b1b; }
/* ── Chat message alignment ─────────────────────────────────────────────── */
/* User messages → right side, forest-green bubble */
[data-testid="stChatMessage"]:has([data-testid="chatAvatarIcon-user"]) {
    flex-direction: row-reverse !important;
}
[data-testid="stChatMessage"]:has([data-testid="chatAvatarIcon-user"]) [data-testid="stMarkdownContainer"],
[data-testid="stChatMessage"]:has([data-testid="chatAvatarIcon-user"]) [data-testid="stChatMessageContent"] > div {
    background: #1A2F2B !important;
    color: #F4F3ED !important;
    border-radius: 18px 4px 18px 18px !important;
    padding: 10px 16px !important;
    margin-left: auto !important;
    display: inline-block !important;
    max-width: 85% !important;
}
/* History panel session buttons */
[data-testid="stMain"] [data-testid="stHorizontalBlock"] .hist-btn button {
    background: transparent !important;
    border: none !important;
    text-align: left !important;
    padding: 8px 10px !important;
    border-radius: 8px !important;
    box-shadow: none !important;
    color: #1A2F2B !important;
    font-size: 13px !important;
    width: 100% !important;
}
.sev-orange { border-left: 4px solid #f97316 !important; }
.sev-red    { border-left: 4px solid #ef4444 !important; }
.sev-dark   { border-left: 4px solid #9ca3af !important; }
.reorder-card { border-left: 4px solid #ef4444 !important; }
hr { border-color: #e5e4df !important; }
h1, h2, h3, h4 { color: #1A2F2B !important; }
</style>
""")

# ── HERO BANNER ───────────────────────────────────────────────────────────────
st.markdown("""
<div class="hero-banner">
  <div class="hero-icon">+</div>
  <div>
    <div class="hero-title">Smart Pharmacy AI</div>
    <div class="hero-sub">AI-powered inventory • real-time stock • FDA drug interactions • expiry alerts</div>
  </div>
</div>
""", unsafe_allow_html=True)

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
# ── AUTHENTICATION BARRIER ───────────────────────────────────────────────────
login_ui.initialize_auth_state()

if not st.session_state.authenticated:
    login_ui.render_login_page()
    st.stop()  # Halt execution of the rest of the application

# ── SIDEBAR NAVIGATION ───────────────────────────────────────────────────────
NAV_PAGES = [
    "Assistant Chat",
    "Live Inventory Dashboard",
    "Log Daily Sales",
    "Reorder Alerts",
    "Expired Items",
]

if "page" not in st.session_state or st.session_state.page not in NAV_PAGES:
    st.session_state.page = NAV_PAGES[0]
with st.sidebar:
    st.html(f"""
    <div style="padding:28px 0 20px;border-bottom:1px solid rgba(244,243,237,0.12);margin-bottom:8px;padding-left:16px;">
      <div style="font-size:22px;font-weight:800;color:#F4F3ED;letter-spacing:-0.5px;">Rx AI</div>
      <div style="font-size:11px;color:rgba(244,243,237,0.5);margin-top:3px;">Smart Pharmacy System</div>
    </div>
    """)
    
    st.markdown("""
    <style>
    /* Styling to make sidebar buttons look like a clean menu */
    [data-testid="stSidebar"] div.stButton button {
        text-align: left;
        border: none;
        background: transparent;
        color: rgba(244,243,237,0.7);
        font-weight: 500;
        font-size: 15px;
        transition: all 0.2s;
        padding-left: 10px;
    }
    [data-testid="stSidebar"] div.stButton button:hover {
        background: rgba(255,255,255,0.1);
        color: #F4F3ED;
    }
    /* Primary buttons (Active Tab) styling */
    [data-testid="stSidebar"] div.stButton button[data-baseweb="button"]:has(p:contains('Active')) {
        background: rgba(255,255,255,0.15);
        color: #F4F3ED;
        font-weight: 700;
        border-left: 3px solid #F4F3ED;
        border-radius: 0;
    }
    </style>
    """, unsafe_allow_html=True)

    for p in NAV_PAGES:
        # Use primary style if selected, secondary otherwise
        btn_type = "primary" if st.session_state.page == p else "secondary"
        if st.button(p, type=btn_type, use_container_width=True):
            st.session_state.page = p
            st.rerun()

    st.markdown("<div style='flex-grow: 1;'></div>", unsafe_allow_html=True)
    st.html("<hr style='border-color: rgba(244,243,237,0.12);'>")
    st.markdown(f"<div style='color: rgba(244,243,237,0.8); font-size: 13px; text-align: center; margin-bottom: 12px;'>Logged in as: <b>{st.session_state.get('user_name', 'Admin')}</b></div>", unsafe_allow_html=True)
    if st.button("Logout", use_container_width=True):
        login_ui.logout()

page = st.session_state.page
# ── PAGE: ASSISTANT CHAT ─────────────────────────────────────────────────────
if page == "Assistant Chat":
    # ── Init session state ────────────────────────────────────────────────────
    if "messages" not in st.session_state:
        st.session_state.messages = [{"role": "assistant", "content": "Ready for updates or clinical questions."}]
    if "thread_id" not in st.session_state:
        st.session_state.thread_id = str(uuid.uuid4())
    if "awaiting_hitl" not in st.session_state:
        st.session_state.awaiting_hitl = False
    if "hitl_product" not in st.session_state:
        st.session_state.hitl_product = None
    if "chat_sessions_cache" not in st.session_state:
        st.session_state.chat_sessions_cache = database.list_chat_sessions()
    # ── Layout: chat area (left) + history panel (right) ─────────────────────
    chat_col, hist_col = st.columns([3, 1], gap="large")
    # ════════════════════════════════════════════════════════════════════════════
    # RIGHT PANEL — Chat History
    # ════════════════════════════════════════════════════════════════════════════
    with hist_col:
        st.html("""
        <div style="font-size:12px;font-weight:700;color:#1A2F2B;
                    text-transform:uppercase;letter-spacing:0.08em;
                    margin-bottom:10px;padding-bottom:6px;
                    border-bottom:1.5px solid #e5e4df;">
          History
        </div>""")

        # ── New Chat button ───────────────────────────────────────────────────
        if st.button("+ New Chat", use_container_width=True, type="primary", key="new_chat_btn"):
            if any(m["role"] == "user" for m in st.session_state.messages):
                database.save_chat_session(st.session_state.thread_id, st.session_state.messages)
            st.session_state.messages = [{"role": "assistant", "content": "Ready for updates or clinical questions."}]
            st.session_state.thread_id = str(uuid.uuid4())
            st.session_state.awaiting_hitl = False
            st.session_state.hitl_product = None
            st.session_state.chat_sessions_cache = database.list_chat_sessions()
            st.rerun()

        st.html('<div style="height:6px"></div>')

        # ── Session list ──────────────────────────────────────────────────────
        sessions = st.session_state.chat_sessions_cache
        if not sessions:
            st.caption("No previous chats yet.")
        else:
            for s in sessions:
                sid   = s.get("thread_id", "")
                raw_title = s.get("title", "Untitled")
                title = raw_title[:35] + ("…" if len(raw_title) > 35 else "")
                ts    = s.get("updated_at", "")[:10]
                is_current = (sid == st.session_state.thread_id)
                # Single row: [session title button] [x delete]
                c1, c2 = st.columns([8, 1], vertical_alignment="center")
                with c1:
                    # Render as a styled button that acts as the click target
                    bg = "#f0efe9" if is_current else "transparent"
                    border = "border-left:3px solid #1A2F2B;" if is_current else "border-left:3px solid transparent;"
                    btn_label = f"{title}\n{ts}"
                    st.html(
                        f'<div style="border-radius:8px;{border}background:{bg};margin-bottom:2px;">'
                        f'  <div style="font-size:13px;font-weight:600;color:#1A2F2B;padding:6px 10px 2px;">{title}</div>'
                        f'  <div style="font-size:11px;color:#9ca3af;padding:0 10px 6px;">{ts}</div>'
                        f'</div>'
                    )
                    if st.button("Open", key=f"load_{sid}", help=raw_title,
                                 use_container_width=True, type="secondary"):
                        if not is_current:
                            if any(m["role"] == "user" for m in st.session_state.messages):
                                database.save_chat_session(st.session_state.thread_id, st.session_state.messages)
                            loaded = database.load_chat_session(sid)
                            if loaded:
                                st.session_state.messages  = loaded
                                st.session_state.thread_id = sid
                                st.session_state.awaiting_hitl = False
                                st.session_state.chat_sessions_cache = database.list_chat_sessions()
                                st.rerun()
                with c2:
                    if st.button("x", key=f"del_{sid}", help="Delete", type="secondary"):
                        database.delete_chat_session(sid)
                        if is_current:
                            st.session_state.messages  = [{"role": "assistant", "content": "Ready for updates or clinical questions."}]
                            st.session_state.thread_id = str(uuid.uuid4())
                        st.session_state.chat_sessions_cache = database.list_chat_sessions()
                        st.rerun()

    # ════════════════════════════════════════════════════════════════════════════
    # LEFT PANEL — Main Chat
    # ════════════════════════════════════════════════════════════════════════════
    with chat_col:
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
                    <h4>Human Approval Required</h4>
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
                    approve_clicked = st.button("Approve — Move to Quarantine", width="stretch", type="primary")
                with col_reject:
                    reject_clicked = st.button("Reject — Discard Item", width="stretch")
            if approve_clicked or reject_clicked:
                decision = "approve" if approve_clicked else "reject"
                with st.chat_message("assistant"):
                    visualizer = StreamlitNodeVisualizer()
                    visualizer.init_visualization()
                    try:
                        result = None
                        for event in app.stream(
                            Command(resume={"decision": decision}),
                            config=graph_config,
                            stream_mode="values"
                        ):
                            result = event
                        final_text = result.get("final_response", "") if result else ""
                    except GraphInterrupt:
                        final_text = "Unexpected second interrupt — please refresh."
                    except Exception as e:
                        final_text = f"Error resuming workflow: {e}"
                    st.markdown(final_text)
                st.session_state.awaiting_hitl = False
                st.session_state.hitl_product  = None
                st.session_state.thread_id     = str(uuid.uuid4())
                st.session_state.messages.append({"role": "assistant", "content": final_text})
                database.save_chat_session(st.session_state.thread_id, st.session_state.messages)
                st.session_state.chat_sessions_cache = database.list_chat_sessions()
                st.rerun()
        # ─── NORMAL CHAT INPUT ────────────────────────────────────────────────────
        if not st.session_state.awaiting_hitl:
            st.markdown("""
                <style>
                .voice-container {
                    display: flex;
                    justify-content: flex-end;
                    align-items: center;
                    padding-right: 15px;
                    margin-bottom: -15px; /* overlap seamlessly with chat_input gap */
                    position: relative;
                    z-index: 100;
                }
                .voice-container > div {
                    background-color: white;
                    border-radius: 50px;
                    box-shadow: 0 4px 12px rgba(0,0,0,0.06);
                    padding: 8px 15px 8px 8px;
                    display: flex;
                    align-items: center;
                    gap: 10px;
                    border: 1px solid #f0efeb;
                }
                iframe[title="audio_recorder_streamlit.audio_recorder"] {
                    height: 40px !important;
                    width: 40px !important;
                    filter: drop-shadow(0px 2px 4px rgba(0,0,0,0.05));
                }
                </style>
                <div class="voice-container">
                    <div>
                        <span style="color: #6B7280; font-size: 13px; font-weight: 600; padding-right: 5px;">🎙️ Speak</span>
            """, unsafe_allow_html=True)
            
            audio_bytes = audio_recorder(text="", recording_color="#ef4444", neutral_color="#1A2F2B", icon_size="2x")
            st.markdown("</div></div>", unsafe_allow_html=True)
            
            prompt = st.chat_input("+ Attach labels or ask a question...", accept_file="multiple", file_type=["jpg", "jpeg", "png"])
            
            user_text = None
            temp_paths = []
            
            # Handle audio input first
            if audio_bytes and "last_audio" not in st.session_state:
                # We use a session state flag to prevent re-transcribing the same audio block on every re-run
                st.session_state.last_audio = hash(audio_bytes)
                with st.spinner("Transcribing..."):
                    try:
                        user_text = transcribe_audio(audio_bytes)
                    except Exception as e:
                        st.error(f"Voice error: {e}")
            elif audio_bytes and st.session_state.get("last_audio") != hash(audio_bytes):
                st.session_state.last_audio = hash(audio_bytes)
                with st.spinner("Transcribing..."):
                    try:
                        user_text = transcribe_audio(audio_bytes)
                    except Exception as e:
                        st.error(f"Voice error: {e}")
            
            # Handle text/image input fallback
            if prompt and not user_text:
                st.session_state.last_audio = None # reset audio
                with st.chat_message("user"):
                    user_text = prompt.text if prompt.text else "Processing images..."
                    st.write(user_text)
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
                            
            if user_text:
                # If we came from audio, we need to manually write the user message to UI
                if audio_bytes and prompt is None:
                    with st.chat_message("user"):
                        st.write(user_text)
                        
                st.session_state.messages.append({"role": "user", "content": user_text})
                
                with st.chat_message("assistant"):
                    visualizer = StreamlitNodeVisualizer()
                    visualizer.init_visualization()
                    try:
                        result = None
                        for event in app.stream(
                            {
                                "image_paths": temp_paths,
                                "user_query":  user_text,
                                "final_response": "",
                                "pending_quarantine": None,
                                "hitl_decision": None,
                            },
                            config=graph_config,
                            stream_mode="values"
                        ):
                            result = event
                        final_text = result.get("final_response", "") if result else ""
                        for p in temp_paths:
                            if os.path.exists(p): os.remove(p)
                        st.markdown(final_text)
                        st.session_state.messages.append({"role": "assistant", "content": final_text})
                        # Auto-save to Firestore after each AI response
                        database.save_chat_session(st.session_state.thread_id, st.session_state.messages)
                        st.session_state.chat_sessions_cache = database.list_chat_sessions()
                        st.rerun() # Refresh to clear audio widget selection
                    except GraphInterrupt as gi:
                        for p in temp_paths:
                            if os.path.exists(p): os.remove(p)
                        interrupt_value = gi.args[0] if gi.args else {}
                        if hasattr(interrupt_value, '__iter__') and not isinstance(interrupt_value, dict):
                            try:
                                interrupt_value = list(interrupt_value)[0].value
                            except Exception:
                                interrupt_value = {}
                        product = interrupt_value.get("product", {}) if isinstance(interrupt_value, dict) else {}
                        st.session_state.awaiting_hitl = True
                        st.session_state.hitl_product  = product
                        notice = (
                            f"HITL Checkpoint triggered — expired medication detected: "
                            f"**{product.get('name', 'Unknown')}** (Batch: {product.get('batch', '?')}). "
                            f"Awaiting your approval above."
                        )
                        st.markdown(notice)
                        st.session_state.messages.append({"role": "assistant", "content": notice})
                    except Exception as e:
                        for p in temp_paths:
                            if os.path.exists(p): os.remove(p)
                        err_text = f"Error: {e}"
                        st.markdown(err_text)
                        st.session_state.messages.append({"role": "assistant", "content": err_text})
                st.rerun()
# ── PAGE: LIVE INVENTORY DASHBOARD ──────────────────────────────────────────
elif page == "Live Inventory Dashboard":
    if "selected_category" not in st.session_state:
        st.session_state.selected_category = None
    raw_data = database.get_inventory()
    if not raw_data:
        st.info("No products uploaded yet.")
    else:
        df = pd.DataFrame(raw_data, columns=["Batch #", "Expiry Date", "Product Name", "Category", "Logged At", "Stock"])
        if st.session_state.selected_category is None:
            # ── CATEGORY CARDS ────────────────────────────────────────────────
            _CAT_META = {
                "Tablet":        ("T", "#6366f1"),
                "Liquid/Syrup":  ("S", "#06b6d4"),
                "Capsule":       ("C", "#8b5cf6"),
                "Cream/Ointment":("O", "#f59e0b"),
                "Injection":     ("I", "#ec4899"),
                "Other":         ("?", "#64748b"),
            }
            cats = df["Category"].unique()
            cols = st.columns(min(4, len(cats)) or 1)
            for idx, cat in enumerate(cats):
                icon, colour = _CAT_META.get(cat, ("?", "#64748b"))
                count = int((df["Category"] == cat).sum())
                with cols[idx % len(cols)]:
                    st.markdown(
                        f'<div class="cat-card" style="border-top:3px solid {colour}">'
                        f'<div class="cat-icon">{icon}</div>'
                        f'<div class="cat-title">{cat}</div>'
                        f'<div class="cat-count">{count} item(s)</div>'
                        f'</div>',
                        unsafe_allow_html=True,
                    )
                    st.markdown("<div style='height:6px'></div>", unsafe_allow_html=True)
                    if st.button(f"Open {cat}", key=f"btn_{cat}", use_container_width=True):
                        st.session_state.selected_category = cat
                        st.rerun()
        else:
            if st.button("Back to Categories"):
                st.session_state.selected_category = None
                st.rerun()
            cat = st.session_state.selected_category
            icon, colour = _CAT_META.get(cat, ("📦", "#64748b"))
            st.markdown(
                f'<h2 style="color:{colour};">{icon} {cat}</h2>',
                unsafe_allow_html=True,
            )
            cat_df = df[df["Category"] == cat][["Product Name", "Batch #", "Expiry Date", "Stock"]].copy()
            cat_df.insert(0, "Status", cat_df["Stock"].apply(
                lambda s: "In Stock" if s > 10 else "Low" if s > 0 else "Out"
            ))
            st.dataframe(cat_df, use_container_width=True, hide_index=True)
# ── PAGE: LOG DAILY SALES ────────────────────────────────────────────────────
elif page == "Log Daily Sales":
    render_log_daily_sales_tab()
# ── PAGE: REORDER ALERTS ─────────────────────────────────────────────────────
elif page == "Reorder Alerts":
    render_reorder_alerts_tab()
# ── PAGE: EXPIRED ITEMS ───────────────────────────────────────────────────────
elif page == "Expired Items":
    render_expired_alerts_tab()
