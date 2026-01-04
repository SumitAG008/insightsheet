"""
Security utilities for authentication and protection
"""
import re
import secrets
import pyotp
import qrcode
import io
from datetime import datetime, timedelta
from typing import Optional, Tuple
from passlib.context import CryptContext
from fastapi import HTTPException, status, Request
from fastapi.security import HTTPBearer
import hashlib
import hmac

# Password hashing
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# Rate limiting storage (in production, use Redis)
rate_limit_store = {}


def validate_password_strength(password: str) -> Tuple[bool, str]:
    """
    Validate password strength
    
    Returns:
        (is_valid, error_message)
    """
    if len(password) < 8:
        return False, "Password must be at least 8 characters"
    
    if not re.search(r'[A-Z]', password):
        return False, "Password must contain at least one uppercase letter"
    
    if not re.search(r'[a-z]', password):
        return False, "Password must contain at least one lowercase letter"
    
    if not re.search(r'\d', password):
        return False, "Password must contain at least one number"
    
    if not re.search(r'[!@#$%^&*(),.?":{}|<>]', password):
        return False, "Password must contain at least one special character"
    
    return True, ""


def sanitize_input(input_str: str, max_length: int = 1000) -> str:
    """Sanitize user input to prevent injection attacks"""
    if not isinstance(input_str, str):
        return ""
    
    # Remove null bytes
    input_str = input_str.replace('\x00', '')
    
    # Limit length
    if len(input_str) > max_length:
        input_str = input_str[:max_length]
    
    # Remove potentially dangerous characters
    dangerous_chars = ['<', '>', '"', "'", '&', '\x00']
    for char in dangerous_chars:
        input_str = input_str.replace(char, '')
    
    return input_str.strip()


def check_rate_limit(identifier: str, max_requests: int = 5, window_seconds: int = 60) -> bool:
    """
    Check if request is within rate limit
    
    Args:
        identifier: Unique identifier (IP, email, etc.)
        max_requests: Maximum requests allowed
        window_seconds: Time window in seconds
    
    Returns:
        True if within limit, False if exceeded
    """
    now = datetime.utcnow()
    key = f"{identifier}:{window_seconds}"
    
    if key not in rate_limit_store:
        rate_limit_store[key] = []
    
    # Remove old entries
    rate_limit_store[key] = [
        timestamp for timestamp in rate_limit_store[key]
        if (now - timestamp).total_seconds() < window_seconds
    ]
    
    # Check limit
    if len(rate_limit_store[key]) >= max_requests:
        return False
    
    # Add current request
    rate_limit_store[key].append(now)
    return True


def generate_2fa_secret() -> str:
    """Generate a new 2FA secret"""
    return pyotp.random_base32()


def generate_2fa_qr_code(secret: str, email: str, issuer: str = "Meldra") -> bytes:
    """
    Generate QR code for 2FA setup
    
    Returns:
        QR code image as bytes
    """
    totp_uri = pyotp.totp.TOTP(secret).provisioning_uri(
        name=email,
        issuer_name=issuer
    )
    
    qr = qrcode.QRCode(version=1, box_size=10, border=5)
    qr.add_data(totp_uri)
    qr.make(fit=True)
    
    img = qr.make_image(fill_color="black", back_color="white")
    
    # Convert to bytes
    img_bytes = io.BytesIO()
    img.save(img_bytes, format='PNG')
    img_bytes.seek(0)
    
    return img_bytes.getvalue()


def verify_2fa_code(secret: str, code: str) -> bool:
    """Verify 2FA TOTP code"""
    if not secret or not code:
        return False
    
    try:
        totp = pyotp.TOTP(secret)
        return totp.verify(code, valid_window=1)  # Allow 1 time step tolerance
    except Exception:
        return False


def generate_backup_codes(count: int = 10) -> list:
    """Generate backup codes for 2FA"""
    return [secrets.token_urlsafe(8).upper() for _ in range(count)]


def verify_backup_code(backup_codes: list, code: str) -> Tuple[bool, list]:
    """
    Verify backup code and remove it if valid
    
    Returns:
        (is_valid, updated_backup_codes)
    """
    if not backup_codes or not code:
        return False, backup_codes or []
    
    code_upper = code.upper().strip()
    if code_upper in backup_codes:
        # Remove used code
        updated_codes = [c for c in backup_codes if c != code_upper]
        return True, updated_codes
    
    return False, backup_codes


def hash_email(email: str) -> str:
    """Hash email for rate limiting (privacy-preserving)"""
    return hashlib.sha256(email.lower().encode()).hexdigest()


def generate_csrf_token() -> str:
    """Generate CSRF token"""
    return secrets.token_urlsafe(32)


def verify_csrf_token(token: str, stored_token: str) -> bool:
    """Verify CSRF token using constant-time comparison"""
    return hmac.compare_digest(token, stored_token)


def check_account_lockout(failed_attempts: int, locked_until: Optional[datetime]) -> Tuple[bool, Optional[str]]:
    """
    Check if account is locked
    
    Returns:
        (is_locked, error_message)
    """
    if locked_until and locked_until > datetime.utcnow():
        remaining = (locked_until - datetime.utcnow()).total_seconds()
        minutes = int(remaining / 60)
        return True, f"Account locked. Try again in {minutes} minutes."
    
    if failed_attempts >= 5:
        # Lock for 15 minutes
        lock_until = datetime.utcnow() + timedelta(minutes=15)
        return True, f"Too many failed attempts. Account locked until {lock_until.strftime('%H:%M')}."
    
    return False, None


def get_client_ip(request: Request) -> str:
    """Get client IP address from request"""
    # Check for forwarded IP (proxy/load balancer)
    forwarded = request.headers.get("X-Forwarded-For")
    if forwarded:
        return forwarded.split(",")[0].strip()
    
    real_ip = request.headers.get("X-Real-IP")
    if real_ip:
        return real_ip
    
    return request.client.host if request.client else "unknown"
