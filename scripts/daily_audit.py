import database
import notifications
import datetime
import pandas as pd
import chromadb
import os
from dotenv import load_dotenv

load_dotenv()

def run_daily_check():
    print(f"[{datetime.datetime.now()}] Starting automated inventory audit...")
    database.init_db()
    raw_data = database.get_inventory()

    today = datetime.date.today()
    expired_count = 0

    # --- Connect to ChromaDB Cloud ---
    chroma_client = chromadb.CloudClient(
        api_key=os.getenv("CHROMA_API_KEY"),
        tenant=os.getenv("CHROMA_TENANT"),
        database=os.getenv("CHROMA_DATABASE")
    )
    collection = chroma_client.get_or_create_collection("amisha2121_agentic_pharmacy_main")

    for row in raw_data:
        # row order: batch_number, expiry_date, product_name, category, logged_at
        batch_number, expiry_date, product_name, category, _ = row
        try:
            exp_date = pd.to_datetime(expiry_date).date()
            if exp_date < today:

                # --- Query ChromaDB Cloud for a relevant disposal guideline ---
                # Cloud handles embedding with Qwen3 natively via query_texts
                guideline_snippet = ""
                try:
                    results = collection.query(
                        query_texts=[f"disposal or handling guideline for expired {product_name}"],
                        n_results=1
                    )
                    if results["documents"] and results["documents"][0]:
                        guideline_snippet = results["documents"][0][0][:120]
                except Exception as ve:
                    print(f"  ChromaDB lookup skipped for {product_name}: {ve}")

                # --- Build a richer alert message ---
                status_msg = f"CRITICAL: Expired on {exp_date}"
                if guideline_snippet:
                    status_msg += f"\nGuideline: {guideline_snippet}..."

                notifications.send_mobile_alert(
                    product_name=product_name,
                    batch_number=batch_number,
                    status_message=status_msg
                )
                expired_count += 1
                print(f"  ✅ Alert sent for {product_name} (Batch: {batch_number})")

        except Exception as e:
            print(f"  Skipping row {batch_number} due to error: {e}")

    print(f"Audit complete. {expired_count} alert(s) sent to mobile.")

if __name__ == "__main__":
    run_daily_check()