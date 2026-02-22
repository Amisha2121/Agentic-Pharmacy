import streamlit as st
import os
import pandas as pd
import datetime
import database
import notifications
from agent import app

st.set_page_config(page_title="Pharmacy AI Agent", layout="wide")

# --- CUSTOM CSS FOR ALERTS AND CARDS ---
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
    </style>
""", unsafe_allow_html=True)

st.title("🏥 Smart Pharmacy AI & Inventory")
st.markdown("---")

# 1. DEFINE THREE TABS
tab1, tab2, tab3 = st.tabs(["💬 Assistant Chat", "📋 Live Inventory Dashboard", "🔔 Alert Notifications"])

# --- TAB 1: CONVERSATIONAL AGENT ---
with tab1:
    if "messages" not in st.session_state:
        st.session_state.messages = [{"role": "assistant", "content": "Ready for updates or clinical questions."}]

    for msg in st.session_state.messages:
        with st.chat_message(msg["role"]): st.markdown(msg["content"])

    prompt = st.chat_input("Attach labels or ask a question...", accept_file="multiple", file_type=["jpg", "jpeg", "png"])

    if prompt:
        with st.chat_message("user"):
            user_text = prompt.text if prompt.text else "Processing images..."
            st.write(user_text)
            temp_paths = []
            if prompt.files:
                cols = st.columns(len(prompt.files))
                for i, file in enumerate(prompt.files):
                    path = f"temp_{i}_{file.name}"
                    with open(path, "wb") as f: f.write(file.getbuffer())
                    temp_paths.append(path)
                    cols[i].image(path, width=150)
                
        st.session_state.messages.append({"role": "user", "content": user_text})

        with st.chat_message("assistant"):
            with st.spinner("Analyzing..."):
                result = app.invoke({"image_paths": temp_paths, "user_query": user_text, "final_response": ""})
                st.markdown(result["final_response"])
                for p in temp_paths: 
                    if os.path.exists(p): os.remove(p)

        st.session_state.messages.append({"role": "assistant", "content": result["final_response"]})
        st.rerun()

# --- TAB 2: SQUARE CATEGORY DASHBOARD ---
with tab2:
    if "selected_category" not in st.session_state: st.session_state.selected_category = None
    raw_data = database.get_inventory()
    
    if not raw_data: st.info("No products uploaded yet.")
    else:
        df = pd.DataFrame(raw_data, columns=["Batch #", "Expiry Date", "Product Name", "Category", "Logged At"])
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

# --- TAB 3: ALERT NOTIFICATIONS (The New Section) ---
with tab3:
    st.header("🔔 Live Safety Alerts")
    raw_data = database.get_inventory()
    
    if not raw_data:
        st.info("Everything looks clear. No inventory found.")
    else:
        # Today's date for comparison
        today = datetime.date.today()
        soon_threshold = today + datetime.timedelta(days=30)
        
        expired_items = []
        warning_items = []

        for row in raw_data:
            batch, exp_str, name, category, _ = row
            try:
                # Standardizing date parsing to avoid grounding errors
                # Note: You may need a more complex parser if your dates aren't uniform
                # This assumes YYYY-MM-DD or simple MM/YY logic
                exp_date = pd.to_datetime(exp_str).date()
                
                if exp_date < today:
                    expired_items.append(f"**{name}** (Batch: {batch}) - Expired on {exp_date}")
                elif exp_date <= soon_threshold:
                    warning_items.append(f"**{name}** (Batch: {batch}) - Expires soon: {exp_date}")
            except:
                continue

        # Display Critical Alerts first
        if expired_items:
            st.subheader("🚨 Critical: Expired Inventory")
            for item in expired_items:
                st.error(item, icon="🔥")
        
        # Display Warning Alerts
        if warning_items:
            st.subheader("⚠️ Warning: Expiring within 30 days")
            for item in warning_items:
                st.warning(item, icon="⏳")
        
        if not expired_items and not warning_items:
            st.success("Great job! All current stock is well within its expiry window.", icon="✅")

        if expired_items:
            st.subheader("🚨 Critical: Expired Inventory")
            for idx, item in enumerate(expired_items):
                col1, col2 = st.columns([0.8, 0.2])
                with col1:
                    st.error(item)
                    with col2:
                        if st.button("📱 Notify", key=f"notify_{idx}"):
                            res = notifications.send_mobile_alert(row[2], row[0], "EXPIRED")
                            if res:
                                st.toast("Alert sent to your phone!")