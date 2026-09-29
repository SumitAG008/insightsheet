"""
Authentication and Authorization utilities for InsightSheet-lite
"""
from datetime import datetime, timedelta
from typing import Optional
from jose import JWTError, jwt
from passlib.context import CryptContext
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
import os
import logging
from dotenv import load_dotenv

from app.database import get_db, User

load_dotenv()

logger = logging.getLogger(__name__)

# Configuration
_DEFAULT_SECRET_KEY = "your-secret-key-change-this"
SECRET_KEY = (os.getenv("JWT_SECRET_KEY") or "").strip() or _DEFAULT_SECRET_KEY


def _check_secret_key() -> None:
    """
    Login tokens are signed with JWT_SECRET_KEY. With the public default, anyone can forge a
    token for any account. Warn loudly for now; set REQUIRE_JWT_SECRET=true (once the secret is
    set on Railway) to refuse to start without a real one.
    """
    weak = SECRET_KEY == _DEFAULT_SECRET_KEY or len(SECRET_KEY) < 32
    if not weak:
        return
    message = (
        "JWT_SECRET_KEY is missing or too short (need 32+ random characters). "
        "Anyone could forge login tokens. Set it, e.g. to the output of: openssl rand -hex 32"
    )
    if (os.getenv("REQUIRE_JWT_SECRET") or "").strip().lower() in ("1", "true", "yes", "on"):
        raise RuntimeError(message)
    logger.critical(message)


_check_secret_key()
ALGORITHM = os.getenv("JWT_ALGORITHM", "HS256")
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "30"))

# Password hashing
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# HTTP Bearer token security
security = HTTPBearer()


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify password against hash"""
    return pwd_context.verify(plain_password, hashed_password)


def get_password_hash(password: str) -> str:
    """
    Hash password with bcrypt
    
    Note: bcrypt has a 72-byte limit, so we truncate if necessary
    """
    # Bcrypt has a 72-byte limit, truncate if password is too long
    # Convert to bytes to check length properly (handles unicode)
    password_bytes = password.encode('utf-8')
    
    if len(password_bytes) > 72:
        # Truncate byte-by-byte to exactly 72 bytes
        # This ensures we don't cut multi-byte characters incorrectly
        truncated_bytes = password_bytes[:72]
        # Try to decode, but if it fails (cut in middle of char), remove last byte(s)
        while True:
            try:
                truncated = truncated_bytes.decode('utf-8')
                break
            except UnicodeDecodeError:
                # Remove last byte and try again
                truncated_bytes = truncated_bytes[:-1]
                if len(truncated_bytes) == 0:
                    # Fallback: use first 72 characters of string
                    truncated = password[:72]
                    break
        
        logger.warning(f"Password truncated from {len(password_bytes)} bytes to {len(truncated_bytes)} bytes")
        # Double-check the truncated password is <= 72 bytes
        final_bytes = truncated.encode('utf-8')
        if len(final_bytes) > 72:
            # If still too long, truncate string directly
            truncated = truncated[:72]
        return pwd_context.hash(truncated)
    
    # Double-check even normal passwords
    try:
        return pwd_context.hash(password)
    except ValueError as e:
        # If bcrypt still complains, truncate and retry
        if "72 bytes" in str(e) or "longer than 72" in str(e):
            logger.warning(f"Bcrypt error, truncating password: {str(e)}")
            # Truncate to 72 characters (safe fallback)
            truncated = password[:72]
            return pwd_context.hash(truncated)
        raise


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    """
    Create JWT access token

    Args:
        data: Data to encode in token
        expires_delta: Token expiration time

    Returns:
        str: JWT token
    """
    to_encode = data.copy()

    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)

    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

    return encoded_jwt


def decode_token(token: str) -> dict:
    """
    Decode and validate JWT token

    Args:
        token: JWT token

    Returns:
        dict: Decoded token data

    Raises:
        HTTPException: If token is invalid
    """
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        return payload
    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )


# Plain (not async) so FastAPI runs the database lookup in its thread pool, not on the event loop.
def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db)
) -> dict:
    """
    Get current authenticated user from token

    Args:
        credentials: HTTP Bearer credentials
        db: Database session

    Returns:
        dict: User data

    Raises:
        HTTPException: If authentication fails
    """
    token = credentials.credentials

    # Decode token
    payload = decode_token(token)

    # Get user email from token
    email: str = payload.get("sub")
    if email is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication credentials",
        )

    # Get user from database
    user = db.query(User).filter(User.email == email).first()
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found",
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Inactive user",
        )

    # The token belongs to one signed-in device; it stops working once that device is signed out
    # (from another device, by logging out, or when the account signs in on too many devices).
    from app.services.device_sessions import session_is_active

    sid = payload.get("sid")
    if not sid or not session_is_active(db, sid, user.email):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="This device was signed out. Please sign in again.",
        )

    return {
        "session_id": sid,
        "id": user.id,
        "email": user.email,
        "full_name": user.full_name,
        "role": user.role
    }


def get_current_admin_user(
    current_user: dict = Depends(get_current_user)
) -> dict:
    """
    Get current user and verify admin role

    Args:
        current_user: Current authenticated user

    Returns:
        dict: Admin user data

    Raises:
        HTTPException: If user is not admin
    """
    if current_user.get("role") != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not enough permissions"
        )

    return current_user


def authenticate_user(db: Session, email: str, password: str) -> Optional[User]:
    """
    Authenticate user with email and password

    Args:
        db: Database session
        email: User email
        password: User password

    Returns:
        User or None: User object if authenticated, None otherwise
    """
    user = db.query(User).filter(User.email == email).first()

    if not user:
        return None

    if not verify_password(password, user.hashed_password):
        return None

    return user
