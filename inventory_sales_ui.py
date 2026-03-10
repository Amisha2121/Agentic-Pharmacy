"""
inventory_sales_ui.py — Daily Sales Tracking UI (v3)

Tab 3: Log Daily Sales
  - Google-like autocomplete from 'batches' collection
  - Stock unset warning + inline "Set Stock" input
  - Stock validation before adding
  - Today's log with per-row ✏️ Edit qty + 🗑️ Delete buttons
  - Last 5 days history: each day in its own collapsed table
  - Archive browser for records older than 5 days

Tab 4: Reorder Alerts
  - Items with stock <= 0, dismiss button per item
"""

import streamlit as st
import pandas as pd
import datetime
import database


# ─────────────────────────────────────────────────────────────────────────────
# HELPERS
# ─────────────────────────────────────────────────────────────────────────────

def _fmt_table(entries: list[dict]) -> pd.DataFrame:
    if not entries:
        return pd.DataFrame()
    df = pd.DataFrame(entries)
    keep = [c for c in ["product_name", "batch_number", "qty_sold", "logged_at"] if c in df.columns]
    df = df[keep].copy()
    df.columns = [c.replace("_", " ").title() for c in df.columns]
    return df.reset_index(drop=True)


def _day_label(date_str: str) -> str:
    try:
        d = datetime.date.fromisoformat(date_str)
        today = datetime.date.today()
        if d == today - datetime.timedelta(days=1):
            return f"📅 Yesterday  ·  {date_str}"
        return f"📅 {d.strftime('%a, %d %b %Y')}  ·  {date_str}"
    except ValueError:
        return f"📅 {date_str}"


# ─────────────────────────────────────────────────────────────────────────────
# TAB 3 — LOG DAILY SALES
# ─────────────────────────────────────────────────────────────────────────────

def render_log_daily_sales_tab():
    st.header("🛒 Log Daily Sales")
    st.markdown("Record medicines dispensed today. Stock is **deducted immediately** from Firebase on each sale.")

    # ── 1. LOAD INVENTORY — always live from Firebase ─────────────────────────
    with st.spinner("Loading medicines…"):
        inventory = database.get_inventory_with_stock()

    if not inventory:
        st.warning("No items found in the `batches` collection. Add medicines using the AI assistant.")
        return

    # ── 3. AUTOCOMPLETE SEARCH ────────────────────────────────────────────────
    # All medicines shown — stock comes directly from Firebase 'Number' field
    label_map: dict[str, dict] = {}
    seen: set[str] = set()
    for item in inventory:
        if item["batch_number"] in seen:
            continue
        seen.add(item["batch_number"])
        label = f"{item['product_name']}  ·  Batch: {item['batch_number']}  ·  Stock: {item['stock']}"
        label_map[label] = item

    sorted_labels = sorted(label_map.keys())

    st.subheader("➕ Add a Sale")
    col_s, col_q, col_b = st.columns([5, 2, 1], vertical_alignment="bottom")

    with col_s:
        selected_label = st.selectbox(
            "🔍 Search Medicine",
            options=sorted_labels,
            index=None,
            placeholder="Type medicine name or batch number…",
            key="sales_selectbox",
        )
        if selected_label:
            item = label_map[selected_label]
            stock_color = "🟢" if item["stock"] > 10 else "🟡" if item["stock"] > 0 else "🔴"
            st.caption(
                f"{stock_color} **Stock: {item['stock']}**  |  "
                f"Category: {item['category']}  |  Expiry: {item['expiry_date']}"
            )

    with col_q:
        qty = st.number_input("Quantity Sold", min_value=1, max_value=99_999,
                              value=1, step=1, key="sales_qty_input")

    with col_b:
        add_clicked = st.button("➕ Add", type="primary", key="sales_add_btn")

    # ── 4. STOCK VALIDATION + ADD ─────────────────────────────────────────────
    if add_clicked:
        if not selected_label:
            st.warning("Select a medicine first.")
        else:
            chosen = label_map[selected_label]
            avail = chosen["stock"]
            if avail <= 0:
                st.error(f"❌ **{chosen['product_name']}** is out of stock (Stock: {avail}).")
            elif int(qty) > avail:
                st.error(
                    f"❌ Not enough stock for **{chosen['product_name']}**. "
                    f"Requested **{int(qty)}** but only **{avail}** available."
                )
            else:
                database.add_to_sales_log(chosen["batch_number"], chosen["product_name"], int(qty))
                st.session_state.pop("_sales_log_df", None)
                st.success(f"✅ Logged **{int(qty)}×** {chosen['product_name']}  (Remaining: {avail - int(qty)}) — stock updated in Firebase")
                st.rerun()

    # ── 5. TODAY'S LOG — with per-row Edit qty + Delete ──────────────────────
    st.divider()
    today_str = datetime.date.today().isoformat()
    hcol, rcol = st.columns([5, 1])
    with hcol:
        st.subheader(f"📋 Today's Log  ·  {today_str}")
    with rcol:
        if st.button("🔄 Refresh", key="refresh_today"):
            st.session_state.pop("_sales_log_df", None)
            st.rerun()

    if "_sales_log_df" not in st.session_state:
        raw = database.get_todays_sales_log()
        st.session_state._sales_log_df = raw  # list of dicts

    rows = st.session_state._sales_log_df

    if not rows:
        st.info("Nothing logged yet today. Use the search above to add entries.")
    else:
        # Column headers
        h0, h1, h2, h3, h4, h5 = st.columns([3, 2, 1, 2, 1, 1])
        h0.markdown("**Medicine**"); h1.markdown("**Batch #**")
        h2.markdown("**Qty**");      h3.markdown("**Logged At**")
        h4.markdown("**Edit**");     h5.markdown("**Delete**")
        st.divider()

        for row in rows:
            lid = row.get("log_id", "")
            c0, c1, c2, c3, c4, c5 = st.columns([3, 2, 1, 2, 1, 1])
            c0.write(row.get("product_name", ""))
            c1.write(row.get("batch_number", ""))
            c2.write(str(row.get("qty_sold", "")))
            c3.write(str(row.get("logged_at", ""))[:16])

            # Edit qty inline
            edit_key = f"edit_{lid}"
            save_key = f"save_{lid}"
            del_key  = f"del_{lid}"

            with c4:
                new_qty = st.number_input(
                    "qty", min_value=1, max_value=99_999,
                    value=int(row.get("qty_sold", 1)),
                    step=1, key=edit_key, label_visibility="collapsed"
                )
                if st.button("💾", key=save_key, help="Save new quantity"):
                    database.update_sales_log_entry(lid, int(new_qty))
                    st.session_state.pop("_sales_log_df", None)
                    st.toast("Quantity updated + stock adjusted.", icon="✅")
                    st.rerun()

            with c5:
                if st.button("🗑️", key=del_key, help="Delete this entry"):
                    database.delete_sales_log_entry(lid)
                    st.session_state.pop("_sales_log_df", None)
                    st.toast("Entry deleted + stock restored.", icon="🗑️")
                    st.rerun()

    # ── 6. LAST 5 DAYS HISTORY ────────────────────────────────────────────────
    st.divider()
    st.subheader("🗓️ Sales History — Last 5 Days")
    st.caption("Each day's log is saved automatically at midnight and shown below.")

    if "_history_data" not in st.session_state:
        with st.spinner("Loading history…"):
            st.session_state._history_data = database.get_sales_history(days=5)

    history = st.session_state._history_data

    any_data = any(v for v in history.values())
    if not any_data:
        st.info("No sales history for the past 5 days.")
    else:
        for date_str, entries in history.items():
            label = _day_label(date_str)
            is_yesterday = (date_str == list(history.keys())[0])
            with st.expander(label, expanded=is_yesterday):
                if not entries:
                    st.caption("No sales recorded.")
                else:
                    total = sum(e.get("qty_sold", 0) for e in entries)
                    st.caption(f"{len(entries)} product(s)  ·  {total} total units dispensed")
                    st.dataframe(_fmt_table(entries), use_container_width=True, hide_index=True)

    if st.button("🔄 Refresh History", key="refresh_hist"):
        st.session_state.pop("_history_data", None)
        st.rerun()

    # ── 7. ARCHIVE BROWSER (older than 5 days) ────────────────────────────────
    st.divider()
    with st.expander("📦 Archive — Sales Records Older Than 5 Days", expanded=False):
        st.caption("Records are automatically moved here after midnight + 5-day window.")

        if "_archive_page" not in st.session_state:
            st.session_state._archive_page = 0

        archived_data, total_days = database.get_archived_sales(
            page=st.session_state._archive_page, page_size=10
        )
        total_pages = max(1, (total_days + 9) // 10)

        if not archived_data:
            st.info("No archived records yet.")
        else:
            pc, _, nc = st.columns([1, 6, 1])
            with pc:
                if st.button("◀", disabled=st.session_state._archive_page == 0, key="arch_prev"):
                    st.session_state._archive_page -= 1
                    st.rerun()
            with nc:
                if st.button("▶", disabled=st.session_state._archive_page >= total_pages - 1, key="arch_next"):
                    st.session_state._archive_page += 1
                    st.rerun()
            st.caption(f"Page {st.session_state._archive_page + 1}/{total_pages}  ·  {total_days} day(s) total")

            for date_str, entries in archived_data.items():
                with st.expander(_day_label(date_str), expanded=False):
                    df_arc = _fmt_table(entries)
                    if not df_arc.empty:
                        total = sum(e.get("qty_sold", 0) for e in entries)
                        st.caption(f"{len(entries)} product(s)  ·  {total} units")
                        st.dataframe(df_arc, use_container_width=True, hide_index=True)


# ─────────────────────────────────────────────────────────────────────────────
# TAB 4 — REORDER ALERTS
# ─────────────────────────────────────────────────────────────────────────────

def render_reorder_alerts_tab():
    st.header("🚨 Sold Out / Reorder Alerts")
    st.markdown(
        "Items with **zero stock** listed below. "
        "Click **Dismiss** once you've placed the reorder."
    )

    col_r, _ = st.columns([1, 5])
    with col_r:
        if st.button("🔄 Refresh", key="refresh_reorders"):
            st.session_state.pop("_reorder_alerts", None)
            st.rerun()

    if "_reorder_alerts" not in st.session_state:
        with st.spinner("Checking stock levels…"):
            st.session_state._reorder_alerts = database.get_reorder_alerts()

    alerts = st.session_state._reorder_alerts
    if not alerts:
        st.success("✅ All medicines are in stock. No reorder needed.")
        return

    st.warning(f"⚠️ {len(alerts)} item(s) need reordering.")
    st.divider()
    for a in alerts:
        with st.container(border=True):
            ci, ca = st.columns([5, 1], vertical_alignment="center")
            with ci:
                st.markdown(
                    f"**💊 {a['product_name']}**  `{a['category']}`\n\n"
                    f"Batch: `{a['batch_number']}` | Expiry: `{a['expiry_date']}` | Stock: **{a['stock']}**"
                )
            with ca:
                if st.button("✅ Dismiss", key=f"dismiss_{a['doc_id']}"):
                    database.dismiss_reorder_alert(a["doc_id"])
                    st.session_state.pop("_reorder_alerts", None)
                    st.toast(f"Dismissed {a['product_name']}", icon="✅")
                    st.rerun()


# ─────────────────────────────────────────────────────────────────────────────
# TAB 5 — EXPIRED ITEMS ALERTS
# ─────────────────────────────────────────────────────────────────────────────

def render_expired_alerts_tab():
    st.header("⛔ Expired Items")
    st.markdown(
        "All medicines in the database whose **expiry date has already passed** as of today. "
        "These should be pulled from inventory immediately."
    )

    col_r, _ = st.columns([1, 5])
    with col_r:
        if st.button("🔄 Refresh", key="refresh_expired"):
            st.session_state.pop("_expired_items", None)
            st.rerun()

    if "_expired_items" not in st.session_state:
        with st.spinner("Scanning for expired medicines…"):
            st.session_state._expired_items = database.get_expired_items()

    items = st.session_state._expired_items

    if not items:
        st.success("✅ No expired medicines found in the database.")
        return

    st.error(f"🚨 {len(items)} expired medicine(s) found — immediate action required.")
    st.divider()

    for item in items:
        days = item["days_expired"]
        if days <= 30:
            badge = f"🟠 Expired **{days}** day(s) ago"
        elif days <= 365:
            badge = f"🔴 Expired **{days}** day(s) ago (~{days // 30} month(s))"
        else:
            badge = f"⚫ Expired **{days}** day(s) ago (~{days // 365} year(s))"

        with st.container(border=True):
            ci, _ = st.columns([6, 1])
            with ci:
                st.markdown(
                    f"**💊 {item['product_name']}**  `{item['category']}`\n\n"
                    f"Batch: `{item['batch_number']}` | "
                    f"Expiry: `{item['expiry_date']}` | "
                    f"Stock remaining: **{item['stock']}**\n\n"
                    f"{badge}"
                )

