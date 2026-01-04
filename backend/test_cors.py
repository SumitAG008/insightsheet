"""
Simple script to test CORS configuration
Run this while the backend is running
"""
import requests

BASE_URL = "http://localhost:8001"

print("🧪 Testing CORS Configuration...\n")

# Test 1: Simple GET request
print("Test 1: GET /api/cors-test")
try:
    response = requests.get(f"{BASE_URL}/api/cors-test")
    print(f"✅ Status: {response.status_code}")
    print(f"✅ Response: {response.json()}")
    print(f"✅ Headers: {dict(response.headers)}\n")
except Exception as e:
    print(f"❌ Error: {e}\n")

# Test 2: OPTIONS preflight for register
print("Test 2: OPTIONS /api/auth/register (Preflight)")
try:
    response = requests.options(
        f"{BASE_URL}/api/auth/register",
        headers={
            "Origin": "http://localhost:5173",
            "Access-Control-Request-Method": "POST",
            "Access-Control-Request-Headers": "content-type"
        }
    )
    print(f"Status: {response.status_code}")
    print(f"CORS Headers:")
    for header in ['Access-Control-Allow-Origin', 'Access-Control-Allow-Methods',
                   'Access-Control-Allow-Headers', 'Access-Control-Expose-Headers']:
        value = response.headers.get(header, 'NOT PRESENT')
        symbol = "✅" if value != 'NOT PRESENT' else "❌"
        print(f"  {symbol} {header}: {value}")
    print()
except Exception as e:
    print(f"❌ Error: {e}\n")

# Test 3: Actual POST to register
print("Test 3: POST /api/auth/register")
try:
    response = requests.post(
        f"{BASE_URL}/api/auth/register",
        json={"email": "test@example.com", "password": "test123", "full_name": "Test User"},
        headers={"Origin": "http://localhost:5173"}
    )
    print(f"Status: {response.status_code}")
    if response.status_code < 500:
        print(f"Response: {response.json()}")
    print(f"Access-Control-Allow-Origin: {response.headers.get('Access-Control-Allow-Origin', 'NOT PRESENT')}")
except Exception as e:
    print(f"❌ Error: {e}\n")

print("\n📊 Diagnostic Summary:")
print("If you see ❌ for CORS headers, the CORS middleware is not working.")
print("If you see ✅ for CORS headers but browser still blocks, try:")
print("  1. Hard refresh (Ctrl+Shift+R)")
print("  2. Clear browser cache")
print("  3. Try incognito mode")
print("  4. Check browser console for exact error")
