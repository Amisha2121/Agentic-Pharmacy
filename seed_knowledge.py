"""
seed_knowledge.py
Run this once to populate your ChromaDB Cloud collection with clinical pharmacy guidelines.

Usage:
    python seed_knowledge.py
"""

import chromadb
import os
from dotenv import load_dotenv

load_dotenv()

GUIDELINES = [
    {
        "id": "disposal_001",
        "text": "Expired tablets and capsules should be removed from dispensing shelves immediately and placed in a designated expired-drug bin. Do not flush tablets down the sink. Return to supplier or dispose via licensed pharmaceutical waste contractor.",
        "category": "disposal",
    },
    {
        "id": "disposal_002",
        "text": "Expired liquid syrups and oral solutions must be stored upright in leak-proof containers away from active stock. Liquids should never be poured into drains. Arrange collection by a certified pharmaceutical waste disposal service.",
        "category": "disposal",
    },
    {
        "id": "disposal_003",
        "text": "Expired creams, ointments, and topical preparations should be sealed in their original containers and segregated from active inventory. Dispose via licensed hazardous waste contractor if the formulation contains steroids or antibiotics.",
        "category": "disposal",
    },
    {
        "id": "storage_001",
        "text": "Most tablets and capsules should be stored at room temperature (15–25°C) away from humidity and direct sunlight. Refrigerated medications (2–8°C) must be clearly labeled and stored in a dedicated pharmaceutical fridge.",
        "category": "storage",
    },
    {
        "id": "storage_002",
        "text": "Liquid syrups and suspensions that require refrigeration must be maintained at 2–8°C. Once opened, many syrups have a 28-day in-use expiry regardless of the printed date. Always check the product SPC.",
        "category": "storage",
    },
    {
        "id": "interaction_001",
        "text": "Warfarin has numerous drug interactions. NSAIDs, antibiotics (especially metronidazole and fluconazole), and amiodarone can significantly potentiate its anticoagulant effect, increasing bleeding risk. Always review before dispensing.",
        "category": "interaction",
    },
    {
        "id": "interaction_002",
        "text": "Metformin should be withheld 48 hours before and after contrast media procedures due to risk of lactic acidosis. Renal function should be assessed before re-starting.",
        "category": "interaction",
    },
    {
        "id": "audit_001",
        "text": "During daily inventory audits, any batch with an expiry date earlier than today must be quarantined immediately to prevent dispensing errors. A written disposal record must be maintained for regulatory compliance.",
        "category": "audit",
    },
    {
        "id": "audit_002",
        "text": "Items expiring within 30 days should be flagged with a yellow sticker and placed at the front of the shelf (FEFO — First Expired, First Out). Notify the procurement team to avoid over-ordering.",
        "category": "audit",
    },
]

def seed():
    print("Connecting to ChromaDB Cloud...")
    chroma_client = chromadb.CloudClient(
        api_key=os.getenv("CHROMA_API_KEY"),
        tenant=os.getenv("CHROMA_TENANT"),
        database=os.getenv("CHROMA_DATABASE")
    )
    collection = chroma_client.get_or_create_collection("amisha2121_agentic_pharmacy_main")

    print(f"Seeding {len(GUIDELINES)} guidelines (ChromaDB Cloud embeds with Qwen3)...")
    for g in GUIDELINES:
        # Pass documents directly — no manual embeddings needed
        # ChromaDB Cloud handles embedding server-side with Qwen3
        collection.upsert(
            ids=[g["id"]],
            documents=[g["text"]],
            metadatas=[{"category": g["category"]}]
        )
        print(f"  ✅ Added: {g['id']} ({g['category']})")

    count = collection.count()
    print(f"\nDone! ChromaDB Cloud now has {count} document(s) in 'amisha2121_agentic_pharmacy_main'.")

if __name__ == "__main__":
    seed()
