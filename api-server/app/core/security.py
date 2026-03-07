"""Security utilities — JWT, password hashing, HMAC verification."""

import hashlib
import hmac
import time
from datetime import datetime, timedelta, timezone

from jose import JWTError, jwt
from passlib.context import CryptContext
from fastapi import HTTPException, Security, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from app.core.config import get_settings

settings = get_settings()
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
bearer_scheme = HTTPBearer()


def hash_password(password: str) -> str:
    return pwd_context.hash(password)


def verify_password(plain: str, hashed: str) -> bool:
    return pwd_context.verify(plain, hashed)


def create_access_token(data: dict, expires_delta: timedelta | None = None) -> str:
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + (
        expires_delta or timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    )
    to_encode.update({"exp": expire, "iat": datetime.now(timezone.utc)})
    return jwt.encode(to_encode, settings.JWT_SECRET_KEY, algorithm=settings.JWT_ALGORITHM)


def decode_token(token: str) -> dict:
    try:
        payload = jwt.decode(
            token, settings.JWT_SECRET_KEY, algorithms=[settings.JWT_ALGORITHM]
        )
        return payload
    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
        )


def verify_hmac_signature(payload: bytes, signature: str, secret: str | None = None) -> bool:
    """Verify HMAC-SHA256 signature for Murph.ai API requests."""
    secret = secret or settings.MURPH_HMAC_SECRET
    if not secret:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="HMAC secret not configured",
        )
    expected = hmac.new(
        secret.encode(), payload, hashlib.sha256
    ).hexdigest()
    return hmac.compare_digest(expected, signature)


def generate_hmac_signature(payload: bytes, secret: str | None = None) -> str:
    secret = secret or settings.MURPH_HMAC_SECRET
    return hmac.new(secret.encode(), payload, hashlib.sha256).hexdigest()


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Security(bearer_scheme),
) -> dict:
    """Extract and validate current user from Bearer token."""
    return decode_token(credentials.credentials)


def require_role(required_role: str):
    """Dependency that checks user has required RBAC role."""
    async def role_checker(user: dict = Security(get_current_user)):
        user_roles = user.get("roles", [])
        if required_role not in user_roles and "platform_admin" not in user_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Role '{required_role}' required",
            )
        return user
    return role_checker
