import unittest
import sys
import os

# Add the parent directory to sys.path so we can import project files
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from barcode_scanner import _parse_gs1_expiry, _parse_gs1_string, build_barcode_hint

class TestBarcodeScanner(unittest.TestCase):
    def test_parse_gs1_expiry_normal(self):
        """Test normal YYMMDD expiry dates."""
        self.assertEqual(_parse_gs1_expiry("261130"), "2026-11-30")
        self.assertEqual(_parse_gs1_expiry("251231"), "2025-12-31")

    def test_parse_gs1_expiry_last_day_of_month(self):
        """Test GS1 spec where DD=00 means last day of the month."""
        self.assertEqual(_parse_gs1_expiry("250200"), "2025-02-28") # Non-leap year
        self.assertEqual(_parse_gs1_expiry("240200"), "2024-02-29") # Leap year
        self.assertEqual(_parse_gs1_expiry("250400"), "2025-04-30") # 30-day month
        self.assertEqual(_parse_gs1_expiry("251200"), "2025-12-31") # 31-day month

    def test_parse_gs1_expiry_century_rule(self):
        """Test GS1 rule: YY 00-49 -> 2000s, 50-99 -> 1900s."""
        self.assertEqual(_parse_gs1_expiry("491231"), "2049-12-31")
        self.assertEqual(_parse_gs1_expiry("501231"), "1950-12-31")

    def test_parse_gs1_string_parentheses(self):
        """Test parsing of human-readable AI identifiers with parentheses."""
        raw = "(01)10310228302111(17)251231(10)X79813(37)5"
        result = _parse_gs1_string(raw)
        self.assertEqual(result.get("gtin"), "10310228302111")
        self.assertEqual(result.get("expiry_date"), "2025-12-31")
        self.assertEqual(result.get("batch_number"), "X79813")
        self.assertEqual(result.get("quantity"), 5)

    def test_parse_gs1_string_raw(self):
        """Test parsing of raw concatenated GS1 string with group separators."""
        # 01 GTIN (14), 17 Expiry (6), 10 Batch (var), \x1d separator, 37 Quantity (var)
        raw = "01103102283021111725123110X79813\x1d3710"
        result = _parse_gs1_string(raw)
        self.assertEqual(result.get("gtin"), "10310228302111")
        self.assertEqual(result.get("expiry_date"), "2025-12-31")
        self.assertEqual(result.get("batch_number"), "X79813")
        self.assertEqual(result.get("quantity"), 10)

    def test_build_barcode_hint_not_found(self):
        """Test barcode hint generation when nothing is found."""
        hint = build_barcode_hint({"found": False})
        self.assertEqual(hint, "")

    def test_build_barcode_hint_success(self):
        """Test barcode hint generation with parsed data."""
        scan_result = {
            "found": True,
            "barcode_type": "CODE_128",
            "batch_number": "A123",
            "expiry_date": "2025-12-31",
            "gtin": "00012345678905",
            "quantity": 1,
            "is_gs1": True
        }
        hint = build_barcode_hint(scan_result)
        self.assertIn("🔖 1 Barcode(s) detected", hint)
        self.assertIn("Batch/Lot: **A123**", hint)
        self.assertIn("Expiry: **2025-12-31**", hint)
        self.assertIn("GTIN: 00012345678905", hint)
        self.assertIn("Qty: 1", hint)

if __name__ == "__main__":
    unittest.main()
