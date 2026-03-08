def send_mobile_alert(product_name: str, batch_number: str, status_message: str) -> str:
    """
    Returns a formatted alert string for in-app display.
    Twilio SMS has been removed. Alerts are shown directly in the Streamlit UI.
    """
    return (
        f"🚨 **PHARMACY ALERT**\n\n"
        f"**Product:** {product_name}\n"
        f"**Batch:** {batch_number}\n"
        f"**Status:** {status_message}\n\n"
        f"Please check the live dashboard."
    )