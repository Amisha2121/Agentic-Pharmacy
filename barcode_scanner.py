"""
barcode_scanner.py — GS1 / Standard Barcode Decoder

Uses zxing-cpp (a fast, local decoder) to read 1D/2D barcodes from medicine
images before the LLM Vision node is invoked.

Supported barcode types:
  - GS1-128 / Code-128 (common on medicine boxes): encodes batch, expiry, GTIN
  - GS1 DataMatrix (stamped strips)
  - QR Code (modern, less common on pharma)
  - EAN-13 / EAN-8 / UPC-A (retail barcodes, product ID only)

GS1 Application Identifiers (AIs) decoded:
  AI 01  → GTIN (14 digits, product identity)
  AI 10  → Batch / Lot Number
  AI 17  → Expiry Date (YYMMDD format)
  AI 11  → Manufacture Date (YYMMDD)
  AI 37  → Quantity
"""

from __future__ import annotations
import re
import datetime
from typing import Optional

try:
    import zxingcpp
    from PIL import Image
    _ZXING_AVAILABLE = True
except ImportError:
    _ZXING_AVAILABLE = False


def _parse_gs1_expiry(yymmdd: str) -> Optional[str]:
    """Convert GS1 expiry YYMMDD → YYYY-MM-DD.
    GS1 spec: if DD == 00, use last day of the month.
    """
    try:
        yy = int(yymmdd[0:2])
        mm = int(yymmdd[2:4])
        dd = int(yymmdd[4:6])
        # GS1 rule: years 00-49 → 2000s, 50-99 → 1900s
        yyyy = 2000 + yy if yy <= 49 else 1900 + yy
        if dd == 0:
            # Last day of the specified month
            if mm == 12:
                last_day = 31
            else:
                last_day = (datetime.date(yyyy, mm + 1, 1) - datetime.timedelta(days=1)).day
            dd = last_day
        return datetime.date(yyyy, mm, dd).isoformat()
    except Exception:
        return None


def _parse_gs1_string(raw: str) -> dict:
    """Extract GS1 Application Identifiers from a decoded barcode string.
    
    Handles two common formats:
      1. Human-readable with parens: (01)12345678901234(17)261130(10)BN123
      2. Raw concatenated: FNC1 + AI data (no delimiters)
    """
    result: dict = {}

    # --- Format 1: parenthesized AIs (most scanners emit this) ---
    paren_matches = re.findall(r'\((\d{2,4})\)([^(]+)', raw)
    if paren_matches:
        for ai, value in paren_matches:
            value = value.strip()
            if ai == '01' and len(value) >= 14:
                result['gtin'] = value[:14]
            elif ai == '10':
                result['batch_number'] = value
            elif ai == '17' and len(value) >= 6:
                result['expiry_date'] = _parse_gs1_expiry(value[:6])
            elif ai == '11' and len(value) >= 6:
                result['manufacture_date'] = _parse_gs1_expiry(value[:6])
            elif ai == '37':
                try:
                    result['quantity'] = int(value)
                except ValueError:
                    pass
        return result

    # --- Format 2: raw AI stream (strip FNC1 / GS chars first) ---
    cleaned = re.sub(r'[\x1d\x1e\x04]', '|', raw)  # GS → pipe delimiter

    # AI 01: GTIN — fixed 14 digits
    m = re.search(r'(?:^|\|)01(\d{14})', cleaned)
    if m:
        result['gtin'] = m.group(1)

    # AI 17: Expiry — fixed 6 digits
    m = re.search(r'(?:^|\|)17(\d{6})', cleaned)
    if m:
        result['expiry_date'] = _parse_gs1_expiry(m.group(1))

    # AI 11: Manufacture date — fixed 6 digits
    m = re.search(r'(?:^|\|)11(\d{6})', cleaned)
    if m:
        result['manufacture_date'] = _parse_gs1_expiry(m.group(1))

    # AI 10: Batch/Lot — variable length, terminated by GS (|) or end
    m = re.search(r'(?:^|\|)10([^|]+)', cleaned)
    if m:
        result['batch_number'] = m.group(1).strip()

    # AI 37: Quantity — variable length
    m = re.search(r'(?:^|\|)37([^|]+)', cleaned)
    if m:
        try:
            result['quantity'] = int(m.group(1).strip())
        except ValueError:
            pass

    return result


def scan_image(image_path: str) -> dict:
    """
    Scan a medicine image for any barcodes and return extracted pharmacy data.

    Returns a dict:
    {
        "found":          bool,
        "barcode_type":   str,   # e.g. "DataMatrix", "QRCode", "Code128"
        "raw_text":       str,
        "gtin":           str | None,
        "batch_number":   str | None,
        "expiry_date":    str | None,   # YYYY-MM-DD
        "manufacture_date": str | None,
        "quantity":       int | None,
        "is_gs1":         bool,         # True if GS1 AIs were decoded
    }
    """
    empty = {
        "found": False,
        "barcode_type": None,
        "raw_text": None,
        "gtin": None,
        "batch_number": None,
        "expiry_date": None,
        "manufacture_date": None,
        "quantity": None,
        "is_gs1": False,
    }

    if not _ZXING_AVAILABLE:
        return empty

    try:
        img = Image.open(image_path).convert("RGB")
        results = zxingcpp.read_barcodes(img)

        if not results:
            return empty

        # Prefer GS1-containing barcodes first, then longest raw text
        results_sorted = sorted(results, key=lambda r: len(r.text), reverse=True)

        for res in results_sorted:
            raw = res.text.strip()
            if not raw:
                continue

            barcode_type = res.format.name if hasattr(res.format, 'name') else str(res.format)
            gs1_data = _parse_gs1_string(raw)

            return {
                "found": True,
                "barcode_type": barcode_type,
                "raw_text": raw,
                "gtin": gs1_data.get("gtin"),
                "batch_number": gs1_data.get("batch_number"),
                "expiry_date": gs1_data.get("expiry_date"),
                "manufacture_date": gs1_data.get("manufacture_date"),
                "quantity": gs1_data.get("quantity"),
                "is_gs1": bool(gs1_data),
            }

    except Exception as e:
        print(f"[barcode_scanner] Scan error: {e}")

    return empty


def build_barcode_hint(scan_result: dict) -> str:
    """
    Build a concise hint string to inject into the LLM vision prompt
    when a barcode has been successfully decoded.
    """
    if not scan_result.get("found"):
        return ""

    parts = [f"🔖 Barcode detected ({scan_result['barcode_type']})."]

    if scan_result.get("batch_number"):
        parts.append(f"Batch/Lot: **{scan_result['batch_number']}** (VERIFIED — do NOT re-read from label).")
    if scan_result.get("expiry_date"):
        parts.append(f"Expiry: **{scan_result['expiry_date']}** (VERIFIED — do NOT re-read from label).")
    if scan_result.get("gtin"):
        parts.append(f"GTIN: {scan_result['gtin']}.")
    if scan_result.get("quantity"):
        parts.append(f"Qty on barcode: {scan_result['quantity']}.")

    parts.append("Use ONLY these barcode values for batch/expiry. Extract the brand name and category from the image visuals.")
    return " ".join(parts)
