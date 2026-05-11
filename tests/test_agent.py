import unittest
import sys
import os
import re

# Add the parent directory to sys.path so we can import project files
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import agent

class TestAgentLogic(unittest.TestCase):
    
    def test_resolve_user_id_fallback(self):
        """Test that user_id resolves to legacy if not provided."""
        # Using empty state
        uid = agent._resolve_user_id({}, "invalid_thread")
        self.assertEqual(uid, "legacy")

        uid2 = agent._resolve_user_id({"user_id": "test_user_abc"}, "invalid_thread")
        self.assertEqual(uid2, "test_user_abc")

    def test_ddi_regex_extraction(self):
        """Test the clinical logic regex used to detect 'Drug A with Drug B' patterns."""
        ddi_pattern = re.compile(
            r'(?:can\s+i\s+take|interaction|interact|combine|safe\s+with|take\s+with)'
            r'.{0,60}?'
            r'([A-Za-z][A-Za-z0-9\- ]+?)\s+(?:with|and|together\s+with)\s+([A-Za-z][A-Za-z0-9\- ]+)',
            re.IGNORECASE
        )
        plain = re.compile(
            r'^([A-Za-z][A-Za-z0-9\- ]+?)\s+(?:and|with|\+)\s+([A-Za-z][A-Za-z0-9\- ]+)\??$',
            re.IGNORECASE
        )

        # Test complex natural sentence
        match = ddi_pattern.search("Can I take Aspirin with Ibuprofen?")
        self.assertIsNotNone(match)
        self.assertEqual(match.group(1).strip(), "Aspirin")
        self.assertEqual(match.group(2).strip(), "Ibuprofen")

        # Test simple "A and B"
        match2 = plain.match("Tylenol and Advil")
        self.assertIsNotNone(match2)
        self.assertEqual(match2.group(1).strip(), "Tylenol")
        self.assertEqual(match2.group(2).strip(), "Advil")

    def test_stock_regex_extraction(self):
        """Test the stock quantity extraction regex from the vision node."""
        def extract_stock(user_query):
            stock_match = re.search(
                r'(?:qty|quantity|stock|number|count|units?|tablets?|capsules?|pieces?|pcs|have|nos?)'
                r'(?:\s+(?:as|of|is|=|to))?\s*[:\-]?\s*([0-9]+)',
                user_query, re.IGNORECASE
            )
            if not stock_match:
                stock_match = re.search(r'\bquantity\b.{0,20}?\b([0-9]+)\b', user_query, re.IGNORECASE)
            if not stock_match:
                stock_match = re.search(r'^\s*([0-9]+)\s+[A-Za-z]', user_query)
            
            return int(stock_match.group(1)) if stock_match else 0

        self.assertEqual(extract_stock("Please add this. I have 50 tablets."), 50)
        self.assertEqual(extract_stock("qty: 12"), 12)
        self.assertEqual(extract_stock("quantity is 5"), 5)
        self.assertEqual(extract_stock("stock: 100"), 100)
        self.assertEqual(extract_stock("random text without number"), 0)

if __name__ == "__main__":
    unittest.main()
