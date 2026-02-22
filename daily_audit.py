import database
import notifications
import datetime
import pandas as pd

def run_daily_check():
    print(f"[{datetime.datetime.now()}] Starting automated inventory audit...")
    database.init_db()
    raw_data = database.get_inventory()
    
    today = datetime.date.today()
    expired_count = 0

    for row in raw_data:
        # row: batch_number, expiry_date, product_name, category, logged_at
        try:
            exp_date = pd.to_datetime(row[1]).date()
            if exp_date <= today:
                # Automatically send the mobile alert
                notifications.send_mobile_alert(
                    product_name=row[2],
                    batch_number=row[0],
                    status_message=f"CRITICAL: Expired on {exp_date}"
                )
                expired_count += 1
        except Exception as e:
            print(f"Skipping row {row[0]} due to date error: {e}")

    print(f"Audit complete. {expired_count} alerts sent to mobile.")

if __name__ == "__main__":
    run_daily_check()