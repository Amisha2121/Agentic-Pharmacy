"""
Mock data for offline/development mode when Firebase is unavailable.
Used by database.py when MOCK_MODE is True.
"""

# Tuple format: (batch_number, expiry_date, product_name, category, logged_at, stock)
MOCK_BATCHES = [
    ("8901030858006", "2026-12-31", "Paracetamol 500mg", "Tablet", "2025-01-01 00:00:00", 150),
    ("8901030812345", "2025-06-30", "Amoxicillin 250mg", "Capsule", "2025-01-01 00:00:00", 80),
    ("8903622005198", "2027-03-31", "Cough Syrup 100ml", "Liquid/Syrup", "2025-01-01 00:00:00", 45),
    ("8901030867890", "2026-09-15", "Ibuprofen 400mg", "Tablet", "2025-01-01 00:00:00", 0),
    ("8901030811111", "2024-01-01", "Expired Cream", "Cream/Ointment", "2025-01-01 00:00:00", 5),
    ("8901030899999", "2027-12-31", "Vitamin C 500mg", "Tablet", "2025-01-01 00:00:00", 200),
]

MOCK_CHAT_SESSIONS = [
    {
        "thread_id": "mock-session-1",
        "title": "Drug interaction check for aspirin",
        "messages": [
            {"role": "user", "content": "Check aspirin interaction", "type": "user", "id": "m1", "icon": "🎯", "iconColor": "#1E4A4C"},
            {"role": "assistant", "content": "Aspirin may interact with warfarin — consult your pharmacist.", "type": "system", "id": "m2", "icon": "🤖", "iconColor": "#2B5B5C"},
        ],
        "updated_at": "2026-03-26 10:00:00",
        "created_at": "2026-03-26 10:00:00",
    },
]
