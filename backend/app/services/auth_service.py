"""Authentication and User Account Management Service."""

import uuid
from datetime import datetime, timedelta, timezone
from typing import Optional

from fastapi import HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import (
    generate_reset_token,
    hash_password,
    hash_token,
    verify_password,
)
from app.models.password_reset import PasswordReset
from app.models.user import User
from app.schemas.auth import SignupRequest


async def register_user(db: AsyncSession, signup_data: SignupRequest) -> User:
    """Register a new user account with argon2 password hashing."""
    email_clean = signup_data.email.strip().lower()

    # Check for existing account
    existing = await db.execute(select(User).where(func.lower(User.email) == email_clean))
    if existing.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="An account with this email address already exists.",
        )

    # Check if first user in database (make admin if first)
    count_res = await db.execute(select(func.count(User.id)))
    user_count = count_res.scalar() or 0
    role = "admin" if user_count == 0 else "user"

    new_user = User(
        email=email_clean,
        full_name=signup_data.full_name.strip(),
        hashed_password=hash_password(signup_data.password),
        role=role,
        is_active=True,
        email_verified=False,
    )
    db.add(new_user)
    await db.commit()
    await db.refresh(new_user)
    return new_user


async def authenticate_user(
    db: AsyncSession, email: str, password: str
) -> Optional[User]:
    """Authenticate a user by email and password."""
    email_clean = email.strip().lower()
    stmt = select(User).where(func.lower(User.email) == email_clean)
    result = await db.execute(stmt)
    user = result.scalar_one_or_none()

    if not user:
        return None
    if not verify_password(password, user.hashed_password):
        return None
    if not user.is_active:
        return None

    return user


async def create_password_reset(db: AsyncSession, email: str) -> Optional[str]:
    """
    Generate and persist a password reset token for user.
    Returns the raw secret token string for email delivery, or None if user not found.
    """
    email_clean = email.strip().lower()
    stmt = select(User).where(func.lower(User.email) == email_clean)
    result = await db.execute(stmt)
    user = result.scalar_one_or_none()

    if not user or not user.is_active:
        return None

    raw_token = generate_reset_token()
    token_hashed = hash_token(raw_token)
    expires_at = datetime.now(timezone.utc) + timedelta(hours=1)

    reset_entry = PasswordReset(
        user_id=user.id,
        token_hash=token_hashed,
        expires_at=expires_at,
        used=False,
    )
    db.add(reset_entry)
    await db.commit()
    return raw_token


async def reset_password(
    db: AsyncSession, token: str, new_password: str
) -> bool:
    """Validate reset token and update user password."""
    token_hashed = hash_token(token.strip())
    now = datetime.now(timezone.utc)

    stmt = select(PasswordReset).where(
        PasswordReset.token_hash == token_hashed,
        PasswordReset.used == False,  # noqa: E712
        PasswordReset.expires_at > now,
    )
    result = await db.execute(stmt)
    reset_entry = result.scalar_one_or_none()

    if not reset_entry:
        return False

    # Retrieve user
    user_stmt = select(User).where(User.id == reset_entry.user_id)
    user_res = await db.execute(user_stmt)
    user = user_res.scalar_one_or_none()

    if not user:
        return False

    user.hashed_password = hash_password(new_password)
    reset_entry.used = True
    await db.commit()
    return True


async def change_password(
    db: AsyncSession, user: User, old_password: str, new_password: str
) -> bool:
    """Change authenticated user password after verifying current password."""
    if not verify_password(old_password, user.hashed_password):
        return False

    user.hashed_password = hash_password(new_password)
    await db.commit()
    return True


async def update_profile(
    db: AsyncSession,
    user: User,
    full_name: Optional[str] = None,
    email: Optional[str] = None,
) -> User:
    """Update profile information for authenticated user."""
    if full_name:
        user.full_name = full_name.strip()

    if email:
        email_clean = email.strip().lower()
        if email_clean != user.email:
            # Check for conflict
            existing = await db.execute(
                select(User).where(
                    func.lower(User.email) == email_clean,
                    User.id != user.id,
                )
            )
            if existing.scalar_one_or_none():
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Email address already registered by another account.",
                )
            user.email = email_clean
            user.email_verified = False

    await db.commit()
    await db.refresh(user)
    return user


async def delete_account(db: AsyncSession, user: User) -> bool:
    """Soft-delete user account by deactivating access."""
    user.is_active = False
    await db.commit()
    return True
