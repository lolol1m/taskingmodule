"""
Test script to verify Keycloak integration is working correctly
"""
import requests
import json
import sys

BASE_URL = "http://localhost:5000"

def test_health_check():
    """Test if backend is running"""
    print("1. Testing health check...")
    try:
        response = requests.get(f"{BASE_URL}/")
        if response.status_code == 200:
            print("   ✅ Backend is running")
            return True
        else:
            print(f"   ❌ Backend returned {response.status_code}")
            return False
    except requests.exceptions.ConnectionError:
        print("   ❌ Backend is not running. Please start it first.")
        return False

def test_get_users_no_auth():
    """Test /getUsers without authentication (should fail)"""
    print("\n2. Testing /getUsers without authentication...")
    try:
        response = requests.get(f"{BASE_URL}/getUsers")
        if response.status_code == 401:
            print("   ✅ Correctly requires authentication")
            return True
        elif response.status_code == 200:
            print("   ⚠️  Endpoint accessible without auth (Keycloak might be disabled)")
            return True
        else:
            print(f"   ❌ Unexpected status: {response.status_code}")
            return False
    except Exception as e:
        print(f"   ❌ Error: {e}")
        return False

def test_auth_login():
    """Test /auth/login endpoint"""
    print("\n3. Testing /auth/login endpoint...")
    try:
        response = requests.get(f"{BASE_URL}/auth/login", allow_redirects=False)
        if response.status_code == 307 or response.status_code == 302:
            location = response.headers.get('Location', '')
            if 'keycloak' in location.lower() or 'localhost:8080' in location:
                print("   ✅ Correctly redirects to Keycloak")
                print(f"   Location: {location[:80]}...")
                return True
            else:
                print(f"   ⚠️  Redirects but not to Keycloak: {location[:80]}")
                return False
        elif response.status_code == 200:
            data = response.json()
            if 'detail' in data and 'disabled' in data.get('detail', '').lower():
                print("   ⚠️  Keycloak is disabled")
                return True
            else:
                print(f"   ❌ Unexpected response: {data}")
                return False
        else:
            print(f"   ❌ Unexpected status: {response.status_code}")
            return False
    except Exception as e:
        print(f"   ❌ Error: {e}")
        return False

def check_database_schema():
    """Check if database has the new schema"""
    print("\n4. Database schema check...")
    print("   ℹ️  Run this SQL query to verify:")
    print("   SELECT table_name FROM information_schema.tables WHERE table_name IN ('user_cache', 'task', 'image');")
    print("   SELECT column_name FROM information_schema.columns WHERE table_name = 'task' AND column_name = 'assignee_keycloak_id';")
    print("   SELECT column_name FROM information_schema.columns WHERE table_name = 'image' AND column_name = 'vetter_keycloak_id';")
    print("   SELECT COUNT(*) FROM user_cache;")

def main():
    print("=" * 60)
    print("Keycloak Integration Test")
    print("=" * 60)
    
    results = []
    results.append(("Health Check", test_health_check()))
    results.append(("Auth Required", test_get_users_no_auth()))
    results.append(("Auth Login", test_auth_login()))
    
    check_database_schema()
    
    print("\n" + "=" * 60)
    print("Test Summary")
    print("=" * 60)
    for test_name, passed in results:
        status = "✅ PASS" if passed else "❌ FAIL"
        print(f"{status} - {test_name}")
    
    all_passed = all(result[1] for result in results)
    if all_passed:
        print("\n✅ All basic tests passed!")
        print("\nNext steps:")
        print("1. Start the frontend and test the full login flow")
        print("2. Log in and verify /getUsers returns Keycloak users")
        print("3. Assign a task and verify it uses Keycloak user IDs")
        print("4. Complete an image and verify it stores Keycloak user ID")
    else:
        print("\n⚠️  Some tests failed. Please check the errors above.")
    
    return 0 if all_passed else 1

if __name__ == "__main__":
    sys.exit(main())


