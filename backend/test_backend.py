"""
Simple test script to verify backend setup
Run with: python test_backend.py
"""
import sys
import os

# Add app to path
sys.path.insert(0, os.path.dirname(__file__))

def test_imports():
    """Test if all modules can be imported"""
    print("Testing imports...")

    try:
        from app.database import init_db, User, Subscription
        print("✓ Database models imported successfully")

        from app.utils.auth import create_access_token, verify_password, get_password_hash
        print("✓ Auth utilities imported successfully")

        from app.services.ai_service import invoke_llm, generate_formula
        print("✓ AI service imported successfully")

        from app.services.zip_processor import ZipProcessorService
        print("✓ ZIP processor imported successfully")

        from app.services.excel_to_ppt import ExcelToPPTService
        print("✓ Excel to PPT service imported successfully")

        from app.main import app
        print("✓ FastAPI app imported successfully")

        print("\n✅ All imports successful!")
        return True

    except Exception as e:
        print(f"\n❌ Import error: {str(e)}")
        return False


def test_database():
    """Test database initialization"""
    print("\nTesting database...")

    try:
        from app.database import init_db, SessionLocal, User

        # Initialize database
        init_db()
        print("✓ Database initialized successfully")

        # Test database connection
        db = SessionLocal()
        user_count = db.query(User).count()
        db.close()

        print(f"✓ Database connection successful (Users: {user_count})")
        print("\n✅ Database tests passed!")
        return True

    except Exception as e:
        print(f"\n❌ Database error: {str(e)}")
        return False


def test_auth():
    """Test authentication utilities"""
    print("\nTesting authentication...")

    try:
        from app.utils.auth import get_password_hash, verify_password, create_access_token

        # Test password hashing
        password = "test_password_123"
        hashed = get_password_hash(password)
        print(f"✓ Password hashed: {hashed[:50]}...")

        # Test password verification
        is_valid = verify_password(password, hashed)
        assert is_valid, "Password verification failed"
        print("✓ Password verification successful")

        # Test token creation
        token = create_access_token({"sub": "test@example.com"})
        print(f"✓ JWT token created: {token[:50]}...")

        print("\n✅ Authentication tests passed!")
        return True

    except Exception as e:
        print(f"\n❌ Authentication error: {str(e)}")
        return False


def test_services():
    """Test service initialization"""
    print("\nTesting services...")

    try:
        from app.services.zip_processor import ZipProcessorService
        from app.services.excel_to_ppt import ExcelToPPTService

        # Test ZIP processor
        zip_service = ZipProcessorService()
        print("✓ ZIP processor service initialized")

        # Test Excel to PPT
        ppt_service = ExcelToPPTService()
        print("✓ Excel to PPT service initialized")

        print("\n✅ Service tests passed!")
        return True

    except Exception as e:
        print(f"\n❌ Service error: {str(e)}")
        return False


def main():
    """Run all tests"""
    print("=" * 60)
    print("InsightSheet-lite Backend Test Suite")
    print("=" * 60)

    results = []

    results.append(("Imports", test_imports()))
    results.append(("Database", test_database()))
    results.append(("Authentication", test_auth()))
    results.append(("Services", test_services()))

    print("\n" + "=" * 60)
    print("Test Summary")
    print("=" * 60)

    for name, passed in results:
        status = "✅ PASSED" if passed else "❌ FAILED"
        print(f"{name:20s} {status}")

    print("=" * 60)

    all_passed = all(result[1] for result in results)

    if all_passed:
        print("\n🎉 All tests passed! Backend is ready to run.")
        print("\nStart the server with:")
        print("  uvicorn app.main:app --reload --host 0.0.0.0 --port 8000")
    else:
        print("\n⚠️  Some tests failed. Please check the errors above.")

    return all_passed


if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)
