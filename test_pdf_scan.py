"""
Run this to diagnose PDF scanning dependencies.
  python test_pdf_scan.py medicine_barcodes.pdf
"""
import sys, os

pdf_path = sys.argv[1] if len(sys.argv) > 1 else None
print("=" * 60)
print("PDF BARCODE SCANNER DIAGNOSTIC")
print("=" * 60)

# 1. zxingcpp
try:
    import zxingcpp
    print("[OK] zxingcpp is installed")
    HAS_ZXING = True
except ImportError as e:
    print(f"[MISSING] zxingcpp: {e}")
    print("  → Install: pip install zxingcpp")
    HAS_ZXING = False

# 2. Pillow
try:
    from PIL import Image
    print("[OK] Pillow (PIL) is installed")
    HAS_PIL = True
except ImportError as e:
    print(f"[MISSING] Pillow: {e}")
    print("  → Install: pip install Pillow")
    HAS_PIL = False

# 3. PyMuPDF
try:
    import fitz
    print(f"[OK] PyMuPDF (fitz) installed — version {fitz.version}")
    HAS_FITZ = True
except ImportError as e:
    print(f"[MISSING] PyMuPDF: {e}")
    print("  → Install: pip install pymupdf")
    HAS_FITZ = False

# 4. pyzbar (alternative barcode decoder)
try:
    from pyzbar import pyzbar
    print("[OK] pyzbar is installed (alternative decoder)")
    HAS_PYZBAR = True
except ImportError:
    print("[ ] pyzbar not installed (optional)")
    HAS_PYZBAR = False

print()

if pdf_path and os.path.exists(pdf_path):
    print(f"Testing with: {pdf_path}")
    print("-" * 40)

    if HAS_FITZ and HAS_PIL:
        doc = fitz.open(pdf_path)
        print(f"PDF has {len(doc)} page(s)")
        for i, page in enumerate(doc):
            pix = page.get_pixmap(dpi=300)
            img_arr = None
            if pix.alpha:
                from PIL import Image
                img = Image.frombytes("RGBA", [pix.width, pix.height], pix.samples).convert("RGB")
            else:
                from PIL import Image
                img = Image.frombytes("RGB", [pix.width, pix.height], pix.samples)
            print(f"  Page {i+1}: {img.size[0]}x{img.size[1]} px")

            if HAS_ZXING:
                results = zxingcpp.read_barcodes(img)
                print(f"    zxingcpp found {len(results)} barcode(s)")
                for r in results:
                    print(f"      → [{r.format.name}] {r.text[:80]}")
            if HAS_PYZBAR:
                results2 = pyzbar.decode(img)
                print(f"    pyzbar found {len(results2)} barcode(s)")
                for r in results2:
                    print(f"      → [{r.type}] {r.data.decode()[:80]}")
            if i >= 4:
                break
    else:
        print("Cannot test — missing fitz or Pillow. Install them first.")
else:
    if pdf_path:
        print(f"File not found: {pdf_path}")
    else:
        print("No PDF path given. Usage: python test_pdf_scan.py path/to/file.pdf")

print()
print("SUMMARY:")
print(f"  zxingcpp : {'YES' if HAS_ZXING else 'NO  ← install: pip install zxingcpp'}")
print(f"  Pillow   : {'YES' if HAS_PIL   else 'NO  ← install: pip install Pillow'}")
print(f"  PyMuPDF  : {'YES' if HAS_FITZ  else 'NO  ← install: pip install pymupdf'}")
print(f"  pyzbar   : {'YES' if HAS_PYZBAR else 'optional'}")
