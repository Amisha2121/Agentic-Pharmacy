# Mock data for Agentic Pharmacy AI

MOCK_BATCHES = [
    ("B001", "2026-12-01", "Paracetamol 500mg", "Tablet", "2024-01-01", 150),
    ("B002", "2024-02-15", "Amoxicillin 250mg", "Capsule", "2024-01-05", 80),
    ("B003", "2025-06-30", "Cough Syrup", "Liquid/Syrup", "2024-02-10", 45),
    ("B004", "2026-08-20", "Cetirizine 10mg", "Tablet", "2024-03-01", 200),
    ("B005", "2023-11-10", "Aspirin 81mg", "Tablet", "2023-01-01", 10),
]

MOCK_INVENTORY_WITH_STOCK = [
    {
        "doc_id": "mock_1",
        "batch_number": "B001",
        "product_name": "Paracetamol 500mg",
        "category": "Tablet",
        "expiry_date": "2026-12-01",
        "stock": 150,
        "reorder_dismissed": False
    },
    {
        "doc_id": "mock_2",
        "batch_number": "B002",
        "product_name": "Amoxicillin 250mg",
        "category": "Capsule",
        "expiry_date": "2024-02-15",
        "stock": 80,
        "reorder_dismissed": False
    }
]

MOCK_SALES_LOG = []
MOCK_CHAT_SESSIONS = []
