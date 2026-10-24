
import os
from datetime import datetime, timedelta, timezone

import jwt
from dotenv import load_dotenv
from pwdlib import PasswordHash

from fastapi import HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi import Depends

security = HTTPBearer()

load_dotenv()

password_hash = PasswordHash.recommended()

JWT_SECRET_KEY = os.getenv("JWT_SECRET_KEY")
JWT_ALGORITHM = os.getenv("JWT_ALGORITHM", "HS256")
ACCESS_TOKEN_EXPIRE_MINUTES = 30

if not JWT_SECRET_KEY or JWT_SECRET_KEY == "REPLACE_WITH_YOUR_OWN_RANDOM_SECRET":
    raise RuntimeError(
        "JWT_SECRET_KEY is missing. Configure it in your .env file."
    )


def hash_password(password: str) -> str:
    """Convert a plain password into a secure password hash."""
    return password_hash.hash(password)


def verify_password(
    plain_password: str,
    hashed_password: str,
) -> bool:
    """Check a password against its stored hash."""
    return password_hash.verify(plain_password, hashed_password)


def create_access_token(student_id: int) -> str:
    """Create a signed JWT access token for a student."""
    now = datetime.now(timezone.utc)

    payload = {
        "sub": str(student_id),
        "iat": now,
        "exp": now + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES),
    }

    return jwt.encode(
        payload,
        JWT_SECRET_KEY,
        algorithm=JWT_ALGORITHM,
    )


def verify_access_token(token: str) -> dict:
    """Verify a token and return its payload."""
    return jwt.decode(
        token,
        JWT_SECRET_KEY,
        algorithms=[JWT_ALGORITHM],
    )


def get_current_student_id(
    credentials: HTTPAuthorizationCredentials = Depends(security),
) -> int:
    try:
        payload = verify_access_token(credentials.credentials)
        student_id = int(payload["sub"])

        if student_id <= 0:
            raise ValueError("Invalid student ID")

        return student_id

    except (jwt.InvalidTokenError, KeyError, TypeError, ValueError):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired access token.",
            headers={"WWW-Authenticate": "Bearer"},
        )
