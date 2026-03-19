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


def _render_styled_table(df: pd.DataFrame):
    """Render a premium HTML table styled with the Piccolo theme."""
    if df is None or df.empty:
        return
    header_cells = "".join(
        f'<th style="padding:10px 16px;text-align:left;font-size:12px;font-weight:700;'
        f'color:#6B7280;text-transform:uppercase;letter-spacing:0.06em;border-bottom:2px solid #e5e4df;">{col}</th>'
        for col in df.columns
    )
    rows_html = ""
    for i, (_, row) in enumerate(df.iterrows()):
        bg = "#FFFFFF" if i % 2 == 0 else "#F9F8F3"
        cells = "".join(
            f'<td style="padding:10px 16px;font-size:13px;color:#1A2F2B;border-bottom:1px solid #f0efe9;">{v}</td>'
            for v in row.values
        )
        rows_html += f'<tr style="background:{bg};">{cells}</tr>'
    html = f"""
    <div style="overflow-x:auto;border-radius:12px;border:1.5px solid #e5e4df;margin-top:8px;">
      <table style="width:100%;border-collapse:collapse;font-family:'Outfit',sans-serif;">
        <thead><tr style="background:#F4F3ED;">{header_cells}</tr></thead>
        <tbody>{rows_html}</tbody>
      </table>
    </div>
    """
    st.html(html)


def _day_label(date_str: str) -> str:
    try:
        d = datetime.date.fromisoformat(date_str)
        today = datetime.date.today()
        if d == today - datetime.timedelta(days=1):
            return f"Yesterday  ·  {date_str}"
        return f"{d.strftime('%a, %d %b %Y')}  ·  {date_str}"
    except ValueError:
        return f"{date_str}"


# ─────────────────────────────────────────────────────────────────────────────
# TAB 3 — LOG DAILY SALES
# ─────────────────────────────────────────────────────────────────────────────

def render_log_daily_sales_tab():
    st.header("Log Daily Sales")
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
        if item["stock"] <= 0:
            continue   # out-of-stock items go to Reorder Alerts, not here
        seen.add(item["batch_number"])
        label = f"{item['product_name']}  ·  Batch: {item['batch_number']}  ·  Stock: {item['stock']}"
        label_map[label] = item

    sorted_labels = sorted(label_map.keys())

    st.subheader("Add a Sale")
    col_s, col_q, col_b = st.columns([5, 2, 1], vertical_alignment="bottom")

    with col_s:
        selected_label = st.selectbox(
            "Search Medicine",
            options=sorted_labels,
            index=None,
            placeholder="Type medicine name or batch number…",
            key="sales_selectbox",
        )
        if selected_label:
            item = label_map[selected_label]
            stock_color = "In Stock" if item["stock"] > 10 else "Low" if item["stock"] > 0 else "Out of Stock"
            st.caption(
                f"{stock_color}  Stock: {item['stock']}  |  "
                f"Category: {item['category']}  |  Expiry: {item['expiry_date']}"
            )

    with col_q:
        qty = st.number_input("Quantity Sold", min_value=1, max_value=99_999,
                              value=1, step=1, key="sales_qty_input")

    with col_b:
        add_clicked = st.button("+ Add", type="primary", key="sales_add_btn")

    # ── 4. STOCK VALIDATION + ADD ─────────────────────────────────────────────
    if add_clicked:
        if not selected_label:
            st.warning("Select a medicine first.")
        else:
            chosen = label_map[selected_label]
            avail = chosen["stock"]
            if avail <= 0:
                st.error(f"Out of stock: {chosen['product_name']} (Stock: {avail}).")
            elif int(qty) > avail:
                st.error(
                    f"Not enough stock for **{chosen['product_name']}**. "
                    f"Requested **{int(qty)}** but only **{avail}** available."
                )
            else:
                database.add_to_sales_log(chosen["batch_number"], chosen["product_name"], int(qty))
                st.session_state.pop("_sales_log_df", None)
                st.success(f"Logged {int(qty)}x {chosen['product_name']}  (Remaining: {avail - int(qty)}) — stock updated in Firebase")
                st.rerun()

    # ── 5. TODAY'S LOG — with per-row Edit qty + Delete ──────────────────────
    st.divider()
    today_str = datetime.date.today().isoformat()
    hcol, rcol = st.columns([5, 1])
    with hcol:
        st.subheader(f"Today's Log  ·  {today_str}")
    with rcol:
        if st.button("Refresh", key="refresh_today"):
            st.session_state.pop("_sales_log_df", None)
            st.rerun()

    if "_sales_log_df" not in st.session_state:
        raw = database.get_todays_sales_log()
        st.session_state._sales_log_df = raw  # list of dicts

    rows = st.session_state._sales_log_df

    if not rows:
        st.info("Nothing logged yet today. Use the search above to add entries.")
    else:
        # ── Column headers ────────────────────────────────────────────────
        h0, h1, h2, h3, h4, h5 = st.columns([3, 2, 1, 2, 1, 1])
        h0.markdown("**Medicine**");  h1.markdown("**Batch #**")
        h2.markdown("**Qty**");       h3.markdown("**Logged At**")
        h4.markdown("**Edit**");      h5.markdown("**Delete**")
        st.divider()

        total_today = 0
        for row in rows:
            lid  = row.get("log_id", "")
            qty  = int(row.get("qty_sold", 0))
            total_today += qty
            c0, c1, c2, c3, c4, c5 = st.columns([3, 2, 1, 2, 1, 1])
            c0.markdown(f"**{row.get('product_name', '')}**")
            c1.write(row.get("batch_number", ""))
            c2.markdown(
                f'<span class="stock-pill pill-green">{qty}</span>',
                unsafe_allow_html=True,
            )
            c3.caption(str(row.get("logged_at", ""))[:16])

            edit_key = f"edit_{lid}"
            save_key = f"save_{lid}"
            del_key  = f"del_{lid}"

            with c4:
                new_qty = st.number_input(
                    "qty", min_value=1, max_value=99_999,
                    value=int(row.get("qty_sold", 1)),
                    step=1, key=edit_key, label_visibility="collapsed"
                )
                if st.button("Save", key=save_key, help="Save new quantity"):
                    database.update_sales_log_entry(lid, int(new_qty))
                    st.session_state.pop("_sales_log_df", None)
                    st.toast("Quantity updated + stock adjusted.")
                    st.rerun()

            with c5:
                if st.button("Del", key=del_key, help="Delete this entry"):
                    database.delete_sales_log_entry(lid)
                    st.session_state.pop("_sales_log_df", None)
                    st.toast("Entry deleted + stock restored.")
                    st.rerun()

        # ── Running total ─────────────────────────────────────────────────
        st.divider()
        st.markdown(
            f'<p style="text-align:right; color: #6B7280; font-size:13px;">'
            f'<b>{len(rows)}</b> line(s) &nbsp;·&nbsp; '
            f'<b>{total_today}</b> total units dispensed today</p>',
            unsafe_allow_html=True,
        )

    # ── 6. LAST 5 DAYS HISTORY ────────────────────────────────────────────────
    st.html('<div style="height:8px"></div>')
    st.markdown("### Sales History")
    st.caption("Each day's log is automatically archived at midnight.")

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
                    st.html(
                        f'<p style="font-size:12px;color:#6B7280;margin:4px 0 0;">'
                        f'<b>{len(entries)}</b> product(s) &nbsp;·&nbsp; <b>{total}</b> total units dispensed</p>'
                    )
                    _render_styled_table(_fmt_table(entries))

    if st.button("Refresh History", key="refresh_hist"):
        st.session_state.pop("_history_data", None)
        st.rerun()

    # ── 7. ARCHIVE BROWSER (older than 5 days) ────────────────────────────────
    with st.expander("Archive — Records Older Than 5 Days", expanded=False):
        st.caption("Records are automatically moved here after the 5-day window.")

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
                        st.html(
                            f'<p style="font-size:12px;color:#6B7280;margin:4px 0 0;">'
                            f'<b>{len(entries)}</b> product(s) &nbsp;·&nbsp; <b>{total}</b> units</p>'
                        )
                        _render_styled_table(df_arc)


# ─────────────────────────────────────────────────────────────────────────────
# TAB 4 — REORDER ALERTS
# ─────────────────────────────────────────────────────────────────────────────

def render_reorder_alerts_tab():
    st.header("Reorder Alerts")
    st.markdown(
        "Items with **zero stock** listed below. "
        "Click **Dismiss** once you've placed the reorder."
    )

    col_r, _ = st.columns([1, 5])
    with col_r:
        if st.button("Refresh", key="refresh_reorders"):
            st.session_state.pop("_reorder_alerts", None)
            st.rerun()

    if "_reorder_alerts" not in st.session_state:
        with st.spinner("Checking stock levels…"):
            st.session_state._reorder_alerts = database.get_reorder_alerts()

    alerts = st.session_state._reorder_alerts
    if not alerts:
        st.success("All medicines are in stock. No reorder needed.")
        return

    # ── Count banner ──────────────────────────────────────────────────────────
    st.markdown(
        f'<div style="background:rgba(239,68,68,.12); border:1px solid rgba(239,68,68,.3);'
        f' border-radius:10px; padding:12px 18px; margin-bottom:16px;">'
        f'{len(alerts)} medicine(s) need restocking</div>',
        unsafe_allow_html=True,
    )

    for a in alerts:
        with st.container(border=True):
            # Red left-border accent via CSS class injected by main.py
            st.markdown('<style>[data-testid="stVerticalBlockBorderWrapper"]:has(.reorder-inner){border-left:4px solid #ef4444!important;border-radius:10px;}</style>', unsafe_allow_html=True)
            ci, ca = st.columns([5, 1], vertical_alignment="center")
            with ci:
                stock_val = a['stock']
                pill_cls  = "pill-red" if stock_val <= 0 else "pill-yellow"
                st.markdown(
                    f"**{a['product_name']}**  "
                    f'<span class="stock-pill {pill_cls}">Stock: {stock_val}</span>',
                    unsafe_allow_html=True,
                )
                st.caption(f"Batch: {a['batch_number']} · Category: {a['category']} · Expiry: {a['expiry_date']}")
            with ca:
                if st.button("Dismiss", key=f"dismiss_{a['doc_id']}"):
                    database.dismiss_reorder_alert(a["doc_id"])
                    st.session_state.pop("_reorder_alerts", None)
                    st.toast(f"Dismissed {a['product_name']}")
                    st.rerun()


# ─────────────────────────────────────────────────────────────────────────────
# TAB 5 — EXPIRED ITEMS ALERTS
# ─────────────────────────────────────────────────────────────────────────────

def render_expired_alerts_tab():
    st.header("Expired Items")
    st.markdown(
        "All medicines whose **expiry date has already passed** as of today. "
        "Pull these from inventory immediately."
    )

    col_r, _ = st.columns([1, 5])
    with col_r:
        if st.button("Refresh", key="refresh_expired"):
            st.session_state.pop("_expired_items", None)
            st.rerun()

    if "_expired_items" not in st.session_state:
        with st.spinner("Scanning for expired medicines…"):
            st.session_state._expired_items = database.get_expired_items()

    items = st.session_state._expired_items

    if not items:
        st.success("No expired medicines found in the database.")
        return

    # ── Severity count banner ─────────────────────────────────────────────────
    critical = sum(1 for i in items if i["days_expired"] > 365)
    moderate = sum(1 for i in items if 30 < i["days_expired"] <= 365)
    recent   = sum(1 for i in items if i["days_expired"] <= 30)
    st.markdown(
        f'<div style="background:rgba(239,68,68,.1); border:1px solid rgba(239,68,68,.3);'
        f' border-radius:10px; padding:12px 18px; margin-bottom:16px;">'
        f'<b>{len(items)} expired</b> &nbsp;—&nbsp; '
        f'<span style="color:#f97316">🟠 {recent} recent</span> &nbsp;·&nbsp; '
        f'<span style="color:#ef4444">🔴 {moderate} months-old</span> &nbsp;·&nbsp; '
        f'<span style="color:#6b7280">⚫ {critical} year(s)+</span></div>',
        unsafe_allow_html=True,
    )

    for item in items:
        days = item["days_expired"]
        if days <= 30:
            sev_class = "sev-orange"
            badge     = f"Expired {days} day(s) ago"
        elif days <= 365:
            sev_class = "sev-red"
            badge     = f"Expired {days} day(s) ago (~{days // 30} month(s))"
        else:
            sev_class = "sev-dark"
            badge     = f"Expired {days} day(s) ago (~{days // 365} year(s))"

        with st.container(border=True):
            st.markdown(
                f'<style>.sev-target-{item["batch_number"].replace(" ","-")}'
                f'{{border-left:4px solid {"#f97316" if days<=30 else "#ef4444" if days<=365 else "#6b7280"}!important}}</style>',
                unsafe_allow_html=True,
            )
            ci, _ = st.columns([6, 1])
            with ci:
                stock_val = item['stock']
                pill_cls  = "pill-yellow" if stock_val > 0 else "pill-red"
                st.markdown(
                    f"**{item['product_name']}** "
                    f'<span class="stock-pill {pill_cls}">{stock_val} remaining</span>',
                    unsafe_allow_html=True,
                )
                st.caption(
                    f"Batch: {item['batch_number']} · "
                    f"Category: {item['category']} · "
                    f"Expiry: {item['expiry_date']}"
                )
                st.markdown(badge)
