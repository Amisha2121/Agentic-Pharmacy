import unittest
import sys
import os

# Add the parent directory to sys.path so we can import project files
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Ensure database mock mode is active
os.environ["MOCK_FIRESTORE"] = "1"
import database
database.MOCK_MODE = True
database.db = database.MockFirestore()

try:
    from fastapi.testclient import TestClient
    from api import app
    client = TestClient(app)
    HAS_TEST_CLIENT = True
except ImportError:
    HAS_TEST_CLIENT = False

class TestAPIEndpoints(unittest.TestCase):
    
    # --- INVENTORY ROUTES ---
    @unittest.skipIf(not HAS_TEST_CLIENT, "httpx not installed for TestClient")
    def test_get_inventory(self):
        res = client.get("/api/inventory")
        self.assertEqual(res.status_code, 200)
        self.assertIn("items", res.json())

    @unittest.skipIf(not HAS_TEST_CLIENT, "httpx not installed for TestClient")
    def test_add_inventory_item(self):
        payload = {
            "product_name": "Test Med",
            "batch_number": "B123",
            "expiry_date": "2030-01-01",
            "category": "Pain",
            "stock": 100
        }
        res = client.post("/api/inventory", json=payload)
        self.assertEqual(res.status_code, 200)
        self.assertTrue(res.json().get("ok"))

    @unittest.skipIf(not HAS_TEST_CLIENT, "httpx not installed for TestClient")
    def test_delete_inventory_item(self):
        res = client.delete("/api/inventory/mock_id_123")
        self.assertEqual(res.status_code, 200)
        self.assertTrue(res.json().get("ok"))

    @unittest.skipIf(not HAS_TEST_CLIENT, "httpx not installed for TestClient")
    def test_update_inventory_stock(self):
        res = client.patch("/api/inventory/mock_id_123/stock", json={"new_stock": 50})
        self.assertEqual(res.status_code, 200)
        self.assertTrue(res.json().get("ok"))

    @unittest.skipIf(not HAS_TEST_CLIENT, "httpx not installed for TestClient")
    def test_update_inventory_category(self):
        res = client.patch("/api/inventory/mock_id_123/category", json={"new_category": "Vitamins"})
        self.assertEqual(res.status_code, 200)
        self.assertTrue(res.json().get("ok"))

    # --- ALERTS & EXPIRATIONS ---
    @unittest.skipIf(not HAS_TEST_CLIENT, "httpx not installed for TestClient")
    def test_get_expired(self):
        res = client.get("/api/expired")
        self.assertEqual(res.status_code, 200)
        self.assertIn("items", res.json())

    @unittest.skipIf(not HAS_TEST_CLIENT, "httpx not installed for TestClient")
    def test_get_reorder_alerts(self):
        res = client.get("/api/reorder-alerts")
        self.assertEqual(res.status_code, 200)
        self.assertIn("alerts", res.json())

    # --- SALES ROUTES ---
    @unittest.skipIf(not HAS_TEST_CLIENT, "httpx not installed for TestClient")
    def test_get_today_sales(self):
        res = client.get("/api/sales/today")
        self.assertEqual(res.status_code, 200)
        self.assertIn("logs", res.json())

    @unittest.skipIf(not HAS_TEST_CLIENT, "httpx not installed for TestClient")
    def test_get_sales_history(self):
        res = client.get("/api/sales/history")
        self.assertEqual(res.status_code, 200)
        self.assertIn("history", res.json())

    @unittest.skipIf(not HAS_TEST_CLIENT, "httpx not installed for TestClient")
    def test_add_sale(self):
        payload = {"batch_number": "B123", "product_name": "Test Med", "qty_sold": 5}
        res = client.post("/api/sales", json=payload)
        self.assertEqual(res.status_code, 200)
        self.assertTrue(res.json().get("ok"))

    @unittest.skipIf(not HAS_TEST_CLIENT, "httpx not installed for TestClient")
    def test_update_sale(self):
        res = client.patch("/api/sales/mock_log_id", json={"new_qty": 10})
        self.assertEqual(res.status_code, 200)
        self.assertTrue(res.json().get("ok"))

    @unittest.skipIf(not HAS_TEST_CLIENT, "httpx not installed for TestClient")
    def test_delete_sale(self):
        res = client.delete("/api/sales/mock_log_id")
        self.assertEqual(res.status_code, 200)
        self.assertTrue(res.json().get("ok"))

    # --- CHAT SESSIONS ---
    @unittest.skipIf(not HAS_TEST_CLIENT, "httpx not installed for TestClient")
    def test_list_sessions(self):
        res = client.get("/api/sessions")
        self.assertEqual(res.status_code, 200)
        self.assertIn("sessions", res.json())

    @unittest.skipIf(not HAS_TEST_CLIENT, "httpx not installed for TestClient")
    def test_save_session(self):
        payload = {"messages": [{"role": "user", "content": "Hi"}], "title": "Test"}
        res = client.post("/api/sessions/sess_123", json=payload)
        self.assertEqual(res.status_code, 200)
        self.assertTrue(res.json().get("ok"))

    @unittest.skipIf(not HAS_TEST_CLIENT, "httpx not installed for TestClient")
    def test_load_session(self):
        res = client.get("/api/sessions/sess_123/messages")
        self.assertEqual(res.status_code, 200)
        self.assertIn("messages", res.json())

    @unittest.skipIf(not HAS_TEST_CLIENT, "httpx not installed for TestClient")
    def test_delete_session(self):
        res = client.delete("/api/sessions/sess_123")
        self.assertEqual(res.status_code, 200)
        self.assertTrue(res.json().get("ok"))

if __name__ == "__main__":
    unittest.main()
