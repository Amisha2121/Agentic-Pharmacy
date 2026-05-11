import unittest
import sys
import os
import pandas as pd
from unittest.mock import patch

# Add the parent directory to sys.path so we can import project files
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import ddi_lookup

class TestDDILookup(unittest.TestCase):
    def setUp(self):
        # Create a mock DataFrame for testing so we don't rely on the real CSV
        mock_data = {
            "drug_name": ["Aspirin", "Ibuprofen", "Acetaminophen"],
            "brand_name": ["Bayer", "Advil", "Tylenol"],
            "generic_name": ["Acetylsalicylic Acid", "Ibuprofen", "Paracetamol"],
            "interacts_with_list": ["IBUPROFEN", "ASPIRIN", ""],
            "description": ["May interact with Ibuprofen.", "Interacts with Aspirin.", "Safe to use."],
            "source": ["FDA", "FDA", "FDA"]
        }
        self.mock_df = pd.DataFrame(mock_data)
        self.mock_df["_name_upper"] = self.mock_df["drug_name"].str.upper()
        self.mock_df["_brand_upper"] = self.mock_df["brand_name"].str.upper()
        self.mock_df["_generic_upper"] = self.mock_df["generic_name"].str.upper()

        # Clear LRU caches
        ddi_lookup._load_df.cache_clear()
        ddi_lookup._get_all_drug_names.cache_clear()

    @patch('ddi_lookup._load_df')
    def test_lookup_drug_exact(self, mock_load_df):
        """Test exact matching by drug and brand names."""
        mock_load_df.return_value = self.mock_df
        
        res = ddi_lookup.lookup_drug("Aspirin")
        self.assertIsNotNone(res)
        self.assertEqual(res["drug_name"], "Aspirin")

        res2 = ddi_lookup.lookup_drug("Advil")
        self.assertIsNotNone(res2)
        self.assertEqual(res2["drug_name"], "Ibuprofen")

    @patch('ddi_lookup._load_df')
    def test_lookup_drug_synonym(self, mock_load_df):
        """Test INN synonym translation (e.g., Paracetamol -> Acetaminophen)."""
        mock_load_df.return_value = self.mock_df
        
        # Acetaminophen is the exact drug name, so PARACETAMOL should map to it
        res = ddi_lookup.lookup_drug("Paracetamol")
        self.assertIsNotNone(res)
        self.assertEqual(res["drug_name"], "Acetaminophen")

    @patch('ddi_lookup._load_df')
    def test_lookup_drug_fuzzy(self, mock_load_df):
        """Test typo tolerance (fuzzy matching)."""
        mock_load_df.return_value = self.mock_df

        # Intentionally misspell Ibuprofen
        res = ddi_lookup.lookup_drug("Ibuprofn")
        self.assertIsNotNone(res)
        self.assertEqual(res["drug_name"], "Ibuprofen")

    @patch('ddi_lookup._load_df')
    def test_check_interaction_detected(self, mock_load_df):
        """Test successful detection of an interaction between two drugs."""
        mock_load_df.return_value = self.mock_df

        res = ddi_lookup.check_interaction("Aspirin", "Ibuprofen")
        self.assertTrue(res["interaction_detected"])
        self.assertTrue(res["a_mentions_b"])
        self.assertTrue(res["b_mentions_a"])

    @patch('ddi_lookup._load_df')
    def test_check_interaction_safe(self, mock_load_df):
        """Test when two drugs are checked and no interaction is found."""
        mock_load_df.return_value = self.mock_df

        res = ddi_lookup.check_interaction("Aspirin", "Acetaminophen")
        self.assertFalse(res["interaction_detected"])

if __name__ == "__main__":
    unittest.main()
