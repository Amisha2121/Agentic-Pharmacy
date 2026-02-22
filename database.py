import psycopg2
import datetime
import os
from dotenv import load_dotenv

load_dotenv()
DATABASE_URL = os.getenv("DATABASE_URL")

def get_connection():
    return psycopg2.connect(DATABASE_URL)

def init_db():
    with get_connection() as conn:
        with conn.cursor() as cursor:
            # 1. Create table with the new category column
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS batches (
                    id SERIAL PRIMARY KEY,
                    batch_number TEXT NOT NULL,
                    expiry_date TEXT NOT NULL,
                    logged_at TEXT NOT NULL,
                    product_name TEXT DEFAULT 'Unknown',
                    category TEXT DEFAULT 'Unknown'
                )
            ''')
            
            # 2. Safely add the column to your existing Supabase table if missing
            cursor.execute("SELECT column_name FROM information_schema.columns WHERE table_name='batches' AND column_name='category';")
            if not cursor.fetchone():
                cursor.execute("ALTER TABLE batches ADD COLUMN category TEXT DEFAULT 'Unknown';")
                
            conn.commit()

def insert_batch(batch_number: str, expiry_date: str, product_name: str = "Unknown", category: str = "Unknown"):
    with get_connection() as conn:
        with conn.cursor() as cursor:
            current_time = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
            cursor.execute(
                "INSERT INTO batches (batch_number, expiry_date, logged_at, product_name, category) VALUES (%s, %s, %s, %s, %s)",
                (batch_number, expiry_date, current_time, product_name, category)
            )
            conn.commit()

def update_product_name(batch_number: str, new_name: str):
    with get_connection() as conn:
        with conn.cursor() as cursor:
            cursor.execute(
                "UPDATE batches SET product_name = %s WHERE batch_number = %s",
                (new_name, batch_number)
            )
            updated = cursor.rowcount > 0 
            conn.commit()
            return updated

def get_inventory():
    with get_connection() as conn:
        with conn.cursor() as cursor:
            cursor.execute("SELECT batch_number, expiry_date, product_name, category, logged_at FROM batches")
            return cursor.fetchall()