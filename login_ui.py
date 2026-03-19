import streamlit as st

def initialize_auth_state():
    if "authenticated" not in st.session_state:
        st.session_state.authenticated = False
    if "user_role" not in st.session_state:
        st.session_state.user_role = None  # 'cashier' or 'pharmacist'

def render_login_page():
    # Single unified login identity as requested
    CREDENTIALS = {
        "admin": {"password": "admin", "role": "admin", "name": "Pharmacy Staff"}
    }

    st.markdown("""
        <style>
        .login-box {
            background: white;
            padding: 40px;
            border-radius: 20px;
            border: 1.5px solid #e5e4df;
            text-align: center;
            max-width: 400px;
            margin: 100px auto;
            box-shadow: 0 4px 20px rgba(0,0,0,0.05);
        }
        </style>
    """, unsafe_allow_html=True)
    
    st.markdown('<div class="login-box">', unsafe_allow_html=True)
    st.markdown('<h1 style="color:#1A2F2B; margin-bottom: 20px;">Agentic Pharmacy</h1>', unsafe_allow_html=True)
    st.markdown('<p style="color:#666; margin-bottom: 30px;">Please login to continue.</p>', unsafe_allow_html=True)
    
    username = st.text_input("Username", key="login_username")
    password = st.text_input("Password", type="password", key="login_pass")
    
    if st.button("Login", type="primary", use_container_width=True):
        if username in CREDENTIALS and CREDENTIALS[username]["password"] == password:
            st.session_state.authenticated = True
            st.session_state.user_role = CREDENTIALS[username]["role"]
            st.session_state.user_name = CREDENTIALS[username]["name"]
            st.success(f"Welcome, {CREDENTIALS[username]['name']}!")
            st.rerun()
        else:
            st.error("Invalid username or password.")
            
    st.markdown("""
        <div style="margin-top: 20px; font-size: 13px; color: #888; text-align: left;">
            <b>Test Account:</b><br>
            • Admin: <code>admin</code> / <code>admin</code> (Full Access)
        </div>
    """, unsafe_allow_html=True)
    
    st.markdown('</div>', unsafe_allow_html=True)

def logout():
    st.session_state.authenticated = False
    st.session_state.user_role = None
    st.session_state.user_name = None
    st.query_params.clear()
    st.rerun()
