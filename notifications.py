import os
from twilio.rest import Client
from dotenv import load_dotenv

load_dotenv()

def send_mobile_alert(product_name, batch_number, status_message):
    """
    Sends a mobile SMS alert via Twilio.
    - status_message: e.g., 'EXPIRED' or 'expiring in 5 days'
    """
    # 1. Initialize the Twilio Client
    account_sid = os.getenv('TWILIO_ACCOUNT_SID')
    auth_token = os.getenv('TWILIO_AUTH_TOKEN')
    client = Client(account_sid, auth_token)

    # 2. Format the message for a professional pharmacist view
    message_body = (
        f"🚨 PHARMACY ALERT\n\n"
        f"Product: {product_name}\n"
        f"Batch: {batch_number}\n"
        f"Status: {status_message}\n\n"
        f"Please check the live dashboard."
    )

    try:
        # 3. Send the message
        message = client.messages.create(
            from_=os.getenv('TWILIO_PHONE_NUMBER'),
            body=message_body,
            to=os.getenv('MY_PHONE_NUMBER')
        )
        return message.sid # Returns a unique ID if successful
    except Exception as e:
        print(f"Twilio Error: {e}")
        return None