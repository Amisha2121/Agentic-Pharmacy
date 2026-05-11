import unittest
import sys
import os
import datetime

# Add the parent directory to sys.path so we can import project files
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Set MOCK_FIRESTORE so database.py runs purely in memory without Firebase
os.environ["MOCK_FIRESTORE"] = "1"

import database
database.MOCK_MODE = True
database.db = database.MockFirestore()

class TestDatabaseFeatures(unittest.TestCase):
    def setUp(self):
        # We know database.py in mock mode just pretends everything succeeds and returns dummy data.
        # This test suite verifies the abstraction layer doesn't crash and handles paths correctly.
        self.user = "testuser"
        self.doc_id = "test_doc_123"

    # --- Isolation Tests ---
    def test_user_collection_routing(self):
        """Test that data is isolated per-user."""
        self.assertEqual(database._user_collection("user123", "batches"), "users/user123/batches")
        self.assertEqual(database._user_collection("legacy", "batches"), "batches")
        self.assertEqual(database._user_collection("", "batches"), "batches")

    # --- Inventory Tests ---
    def test_get_inventory(self):
        """Test retrieving inventory items."""
        items = database.get_inventory(self.user)
        self.assertIsInstance(items, list)
    
    def test_get_inventory_with_stock(self):
        """Test retrieving stock specifically."""
        items = database.get_inventory_with_stock(self.user)
        self.assertIsInstance(items, list)

    def test_insert_and_delete_batch(self):
        """Test adding and removing inventory."""
        # Insert shouldn't crash
        doc_id = database.insert_batch("B1", "2025-12-31", "Aspirin", "Pain", 10, self.user)
        # Delete shouldn't crash
        result = database.delete_batch("mock_id", self.user)
        self.assertTrue(result)

    def test_updates(self):
        """Test stock and category updates."""
        database.update_stock(self.doc_id, 25, self.user)
        database.update_category(self.doc_id, "Cold & Allergy", self.user)
        database.update_product_name(self.doc_id, "New Name", self.user)

    # --- Sales Tests ---
    def test_sales_logging(self):
        """Test logging, updating, retrieving, and deleting sales."""
        log_id = database.add_to_sales_log("B1", "Aspirin", 2, self.user)
        
        history = database.get_sales_history(30, self.user)
        self.assertIsInstance(history, dict)

        today_sales = database.get_todays_sales_log(self.user)
        self.assertIsInstance(today_sales, list)

        database.update_sales_log_entry("mock_id", 5, self.user)
        res = database.delete_sales_log_entry("mock_id", self.user)
        self.assertIsNone(res)

    # --- Chat Session Tests ---
    def test_chat_sessions(self):
        """Test saving, loading, listing, and deleting chat histories."""
        messages = [{"role": "user", "content": "Hello"}]
        database.save_chat_session("sess_1", messages, "Test Chat", self.user)
        
        sessions = database.list_chat_sessions(user_id=self.user)
        self.assertIsInstance(sessions, list)
        
        loaded_msgs = database.load_chat_session("sess_1", self.user)
        self.assertIsInstance(loaded_msgs, list)

        res = database.delete_chat_session("sess_1", self.user)
        self.assertIsNone(res)

if __name__ == "__main__":
    unittest.main()
