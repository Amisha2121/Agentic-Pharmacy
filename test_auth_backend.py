"""
Test script to verify user-scoped authentication is working
Run this to check if the backend is properly configured
"""

import database

def test_user_scoping():
    print("=" * 60)
    print("Testing User-Scoped Data Implementation")
    print("=" * 60)
    
    # Test 1: Check if _user_collection helper works
    print("\n1. Testing _user_collection helper:")
    
    legacy_path = database._user_collection("legacy", "batches")
    print(f"   Legacy path: {legacy_path}")
    assert legacy_path == "batches", "Legacy should use global collection"
    
    user_path = database._user_collection("test_user_123", "batches")
    print(f"   User path: {user_path}")
    assert user_path == "users/test_user_123/batches", "User should use scoped collection"
    
    print("   ✅ _user_collection works correctly")
    
    # Test 2: Check if database functions accept user_id
    print("\n2. Testing database functions accept user_id:")
    
    functions_to_test = [
        'get_inventory',
        'get_inventory_with_stock',
        'get_todays_sales_log',
        'get_sales_history',
        'get_reorder_alerts',
        'get_expired_items',
        'get_quarantine',
        'list_chat_sessions',
    ]
    
    for func_name in functions_to_test:
        func = getattr(database, func_name)
        # Check if function signature includes user_id
        import inspect
        sig = inspect.signature(func)
        params = list(sig.parameters.keys())
        
        if 'user_id' in params:
            print(f"   ✅ {func_name} accepts user_id")
        else:
            print(f"   ❌ {func_name} MISSING user_id parameter!")
    
    # Test 3: Try calling a function with user_id
    print("\n3. Testing function calls with user_id:")
    
    try:
        result = database.get_inventory_with_stock(user_id="test_user_123")
        print(f"   ✅ get_inventory_with_stock(user_id='test_user_123') returned: {type(result)}")
    except Exception as e:
        print(f"   ❌ Error calling function: {e}")
    
    try:
        result = database.get_inventory_with_stock(user_id="legacy")
        print(f"   ✅ get_inventory_with_stock(user_id='legacy') returned: {type(result)}")
    except Exception as e:
        print(f"   ❌ Error calling function: {e}")
    
    # Test 4: Check Firebase initialization
    print("\n4. Checking Firebase status:")
    print(f"   Mock Mode: {database.MOCK_MODE}")
    if database.MOCK_MODE:
        print("   ⚠️  Running in MOCK mode - Firebase not connected")
        print("   This is OK for testing, but production needs real Firebase")
    else:
        print("   ✅ Firebase is connected (LIVE mode)")
    
    print("\n" + "=" * 60)
    print("Backend Test Complete!")
    print("=" * 60)
    
    print("\nNext steps:")
    print("1. Restart your backend server: python api.py")
    print("2. Restart your frontend: cd frontend && npm run dev")
    print("3. Open browser console and run: window.debugAuth()")
    print("4. Check if Authorization header is being sent")

if __name__ == "__main__":
    test_user_scoping()
