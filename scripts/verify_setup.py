#!/usr/bin/env python3
"""
Quick verification script to check if user-scoped implementation is ready
Run this before starting servers to verify setup
"""

import os
import sys

def check_file_exists(filepath, description):
    """Check if a file exists"""
    if os.path.exists(filepath):
        print(f"✅ {description}: {filepath}")
        return True
    else:
        print(f"❌ {description} NOT FOUND: {filepath}")
        return False

def check_firebase_credentials():
    """Check if Firebase credentials are configured"""
    print("\n🔍 Checking Firebase Credentials...")
    
    # Check for credentials file
    possible_files = [
        "firebase_key.json",
        "agentic-pharmacy-firebase-adminsdk-fbsvc-fbe3add8aa.json"
    ]
    
    found = False
    for f in possible_files:
        if os.path.exists(f):
            print(f"✅ Firebase credentials found: {f}")
            found = True
            break
    
    if not found:
        print("❌ Firebase credentials file not found")
        print("   Expected one of:", possible_files)
        return False
    
    # Check for environment variable
    if os.getenv("FIREBASE_CREDENTIALS_JSON"):
        print("✅ FIREBASE_CREDENTIALS_JSON environment variable set")
    
    return True

def check_backend_files():
    """Check if backend files have been updated"""
    print("\n🔍 Checking Backend Files...")
    
    all_good = True
    
    # Check database.py
    if check_file_exists("database.py", "Database module"):
        with open("database.py", "r") as f:
            content = f.read()
            if "_user_collection" in content:
                print("   ✅ Contains _user_collection helper")
            else:
                print("   ❌ Missing _user_collection helper")
                all_good = False
            
            if "user_id: str = \"legacy\"" in content:
                print("   ✅ Functions accept user_id parameter")
            else:
                print("   ⚠️  May be missing user_id parameters")
    else:
        all_good = False
    
    # Check api.py
    if check_file_exists("api.py", "API module"):
        with open("api.py", "r") as f:
            content = f.read()
            if "get_user_id_from_token" in content:
                print("   ✅ Contains get_user_id_from_token function")
            else:
                print("   ❌ Missing get_user_id_from_token function")
                all_good = False
            
            if "from fastapi import FastAPI, HTTPException, Request" in content:
                print("   ✅ Imports Request from FastAPI")
            else:
                print("   ❌ Missing Request import")
                all_good = False
    else:
        all_good = False
    
    return all_good

def check_frontend_files():
    """Check if frontend files have been updated"""
    print("\n🔍 Checking Frontend Files...")
    
    all_good = True
    
    # Check api utility
    api_util = "frontend/src/app/utils/api.ts"
    if check_file_exists(api_util, "API utility"):
        with open(api_util, "r") as f:
            content = f.read()
            if "authenticatedFetch" in content:
                print("   ✅ Contains authenticatedFetch function")
            else:
                print("   ❌ Missing authenticatedFetch function")
                all_good = False
            
            if "Authorization" in content:
                print("   ✅ Adds Authorization header")
            else:
                print("   ❌ Missing Authorization header logic")
                all_good = False
    else:
        all_good = False
    
    # Check debug utility
    debug_util = "frontend/src/app/utils/debugAuth.ts"
    if check_file_exists(debug_util, "Debug utility"):
        print("   ✅ Debug utility available")
    else:
        print("   ⚠️  Debug utility not found (optional)")
    
    # Check if pages use authenticatedFetch
    pages_to_check = [
        "frontend/src/app/pages/LiveInventory.tsx",
        "frontend/src/app/pages/LogDailySales.tsx",
        "frontend/src/app/components/Sidebar.tsx"
    ]
    
    for page in pages_to_check:
        if os.path.exists(page):
            with open(page, "r") as f:
                content = f.read()
                if "authenticatedFetch" in content:
                    print(f"   ✅ {os.path.basename(page)} uses authenticatedFetch")
                else:
                    print(f"   ❌ {os.path.basename(page)} NOT using authenticatedFetch")
                    all_good = False
    
    return all_good

def check_dependencies():
    """Check if required dependencies are installed"""
    print("\n🔍 Checking Dependencies...")
    
    all_good = True
    
    # Check Python dependencies
    try:
        import firebase_admin
        print("✅ firebase-admin installed")
    except ImportError:
        print("❌ firebase-admin NOT installed")
        print("   Run: pip install firebase-admin")
        all_good = False
    
    try:
        import fastapi
        print("✅ fastapi installed")
    except ImportError:
        print("❌ fastapi NOT installed")
        all_good = False
    
    # Check if node_modules exists
    if os.path.exists("frontend/node_modules"):
        print("✅ Frontend dependencies installed")
    else:
        print("❌ Frontend dependencies NOT installed")
        print("   Run: cd frontend && npm install")
        all_good = False
    
    return all_good

def main():
    print("=" * 70)
    print("🔍 VERIFYING USER-SCOPED IMPLEMENTATION SETUP")
    print("=" * 70)
    
    results = {
        "Firebase Credentials": check_firebase_credentials(),
        "Backend Files": check_backend_files(),
        "Frontend Files": check_frontend_files(),
        "Dependencies": check_dependencies()
    }
    
    print("\n" + "=" * 70)
    print("📊 SUMMARY")
    print("=" * 70)
    
    all_passed = True
    for check, passed in results.items():
        status = "✅ PASS" if passed else "❌ FAIL"
        print(f"{status} - {check}")
        if not passed:
            all_passed = False
    
    print("\n" + "=" * 70)
    
    if all_passed:
        print("✅ ALL CHECKS PASSED!")
        print("\nYou're ready to start the servers:")
        print("  1. Backend:  python api.py")
        print("  2. Frontend: cd frontend && npm run dev")
        print("  3. Test:     Open browser console and run: window.debugAuth()")
        return 0
    else:
        print("❌ SOME CHECKS FAILED")
        print("\nPlease fix the issues above before starting servers.")
        print("See TROUBLESHOOTING.md for help.")
        return 1

if __name__ == "__main__":
    sys.exit(main())
