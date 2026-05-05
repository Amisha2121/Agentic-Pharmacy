import json

def fix_key():
    try:
        # Read the file as raw text to handle any weirdness
        with open('firebase_key.json', 'r', encoding='utf-8') as f:
            content = f.read()
        
        # Parse it into a dictionary
        data = json.loads(content)
        
        # Normalize the private_key specifically
        pk = data.get('private_key', '')
        # Ensure newlines are actual \n characters that json.dump will escape
        pk = pk.replace('\\n', '\n')
        data['private_key'] = pk
        
        # Write it back perfectly
        with open('firebase_key.json', 'w', encoding='utf-8') as f:
            json.dump(data, f, indent=2)
            
        print("firebase_key.json successfully sanitized and re-written.")
        
    except Exception as e:
        print(f"Failed to fix key: {e}")

if __name__ == "__main__":
    fix_key()
