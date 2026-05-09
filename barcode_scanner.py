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

_ZXING_AVAILABLE = False
_PIL_AVAILABLE = False

try:
    import zxingcpp as _zxingcpp
    _ZXING_AVAILABLE = True
    print("[barcode_scanner] zxingcpp OK")
except ImportError as e:
    print(f"[barcode_scanner] zxingcpp not available: {e}")

try:
    from PIL import Image as _PILImage
    _PIL_AVAILABLE = True
except ImportError:
    print("[barcode_scanner] Pillow not installed — pip install Pillow")

if not _ZXING_AVAILABLE:
    print("[barcode_scanner] WARNING: No barcode decoder. Run: pip install zxingcpp")

# aliases so the rest of the file can use plain names
Image = _PILImage if _PIL_AVAILABLE else None



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
    Scan a medicine image or PDF for any barcodes and return extracted pharmacy data.

    Returns a dict:
    {
        "found":          bool,
        "barcode_type":   str,   # (From the first found barcode)
        "raw_text":       str,
        "gtin":           str | None,
        "batch_number":   str | None,
        "expiry_date":    str | None,
        "manufacture_date": str | None,
        "quantity":       int | None,
        "is_gs1":         bool,
        "barcodes":       list,  # List of all decoded barcodes
        "pdf_text":       str | None,
    }
    """
    empty = {
        "found": False, "barcode_type": None, "raw_text": None,
        "gtin": None, "batch_number": None, "expiry_date": None,
        "manufacture_date": None, "quantity": None, "is_gs1": False,
        "barcodes": [], "pdf_text": None,
    }

    if not _ZXING_AVAILABLE or not _PIL_AVAILABLE:
        print("[barcode_scanner] zxingcpp or Pillow not available — skipping scan")
        return empty

    def _decode_image(img):
        """Decode barcodes from a PIL Image using zxingcpp."""
        try:
            raw_results = _zxingcpp.read_barcodes(img)
            results = []
            for r in raw_results:
                fmt = r.format.name if hasattr(r.format, "name") else str(r.format)
                results.append({"text": r.text, "format": fmt})
            if results:
                print(f"[barcode_scanner] zxingcpp found {len(results)} barcode(s)")
            else:
                print("[barcode_scanner] zxingcpp: no barcodes in this frame")
            return results
        except Exception as e:
            print(f"[barcode_scanner] zxingcpp error: {e}")
            return []

    try:
        all_results = []
        pdf_text = None

        if image_path.lower().endswith('.pdf'):
            print(f"[barcode_scanner] Processing PDF: {image_path}")
            try:
                import fitz  # PyMuPDF
                doc = fitz.open(image_path)
                pdf_text = ""
                for page_num, page in enumerate(doc):
                    pdf_text += page.get_text() + "\n"
                    pix = page.get_pixmap(dpi=300)
                    if pix.alpha:
                        img = Image.frombytes("RGBA", [pix.width, pix.height], pix.samples).convert("RGB")
                    else:
                        img = Image.frombytes("RGB", [pix.width, pix.height], pix.samples)
                    print(f"[barcode_scanner] Scanning page {page_num+1} ({img.size[0]}x{img.size[1]}px)...")
                    page_results = _decode_image(img)
                    all_results.extend(page_results)
                print(f"[barcode_scanner] PDF done. Total barcodes found: {len(all_results)}")
            except ImportError:
                print("[barcode_scanner] PyMuPDF not installed — pip install pymupdf")
                return empty
            except Exception as pdf_err:
                print(f"[barcode_scanner] PDF processing error: {pdf_err}")
                return empty
        else:
            print(f"[barcode_scanner] Scanning image: {image_path}")
            img = Image.open(image_path).convert("RGB")
            all_results = _decode_image(img)

        if not all_results:
            print("[barcode_scanner] No barcodes found in file")
            empty["pdf_text"] = pdf_text
            return empty

        # Parse all barcodes
        parsed_barcodes = []
        for res in sorted(all_results, key=lambda r: len(r["text"]), reverse=True):
            raw = res["text"].strip()
            if not raw:
                continue
            barcode_type = res["format"]
            gs1_data = _parse_gs1_string(raw)
            parsed_barcodes.append({
                "barcode_type": barcode_type,
                "raw_text": raw,
                "gtin": gs1_data.get("gtin"),
                "batch_number": gs1_data.get("batch_number"),
                "expiry_date": gs1_data.get("expiry_date"),
                "manufacture_date": gs1_data.get("manufacture_date"),
                "quantity": gs1_data.get("quantity"),
                "is_gs1": bool(gs1_data),
            })

        if not parsed_barcodes:
            empty["pdf_text"] = pdf_text
            return empty

        first = parsed_barcodes[0]
        return {
            "found": True,
            "barcode_type": first["barcode_type"],
            "raw_text": first["raw_text"],
            "gtin": first["gtin"],
            "batch_number": first["batch_number"],
            "expiry_date": first["expiry_date"],
            "manufacture_date": first["manufacture_date"],
            "quantity": first["quantity"],
            "is_gs1": first["is_gs1"],
            "barcodes": parsed_barcodes,
            "pdf_text": pdf_text,
        }

    except Exception as e:
        print(f"[barcode_scanner] Unexpected error: {e}")
        import traceback; traceback.print_exc()

    return empty


def build_barcode_hint(scan_result: dict) -> str:
    """
    Build a concise hint string to inject into the LLM vision prompt
    when a barcode has been successfully decoded.
    """
    if not scan_result.get("found"):
        return ""

    barcodes = scan_result.get("barcodes", [])
    if not barcodes:
        # Fallback to single
        barcodes = [scan_result]

    parts = [f"🔖 {len(barcodes)} Barcode(s) detected."]
    
    for i, b in enumerate(barcodes):
        parts.append(f"\\n--- Barcode {i+1} ({b.get('barcode_type')}) ---")
        if b.get("batch_number"):
            parts.append(f"Batch/Lot: **{b['batch_number']}**")
        if b.get("expiry_date"):
            parts.append(f"Expiry: **{b['expiry_date']}**")
        if b.get("gtin"):
            parts.append(f"GTIN: {b['gtin']}")
        if b.get("quantity"):
            parts.append(f"Qty: {b['quantity']}")
        if not b.get("is_gs1"):
            parts.append(f"Raw Text: {b.get('raw_text')}")

    parts.append("\\nUse THESE barcode values for batch/expiry extraction. If multiple products are present, list them all.")
    return " ".join(parts)
