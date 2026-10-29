"""
Tests for PhishGuard AI Core Security:
- Password Hashing (Argon2id)
- Password Verification
- JWT Access & Refresh Token Creation / Decoding
- Single-use Reset Token Hashing
"""

import pytest
from app.core.security import (
    hash_password,
    verify_password,
    create_access_token,
    create_refresh_token,
    decode_token,
    generate_reset_token,
    hash_token,
)


def test_argon2_password_hashing():
    raw_password = "CorrectHorseBatteryStaple#2026"
    hashed = hash_password(raw_password)

    # Must not store plain text
    assert hashed != raw_password
    # Argon2id identifier
    assert hashed.startswith("$argon2id$")
    # Correct verification
    assert verify_password(raw_password, hashed) is True
    # Incorrect password fails
    assert verify_password("WrongPassword123!", hashed) is False


def test_jwt_access_token_creation_and_decoding():
    user_id = "e4d7756f-8703-4f91-b3b4-4e2b0241031f"
    token = create_access_token(data={"sub": user_id, "role": "user"})

    assert isinstance(token, str)
    assert len(token) > 20

    payload = decode_token(token)
    assert payload["sub"] == user_id
    assert payload["role"] == "user"
    assert payload["type"] == "access"
    assert "exp" in payload


def test_jwt_refresh_token():
    user_id = "e4d7756f-8703-4f91-b3b4-4e2b0241031f"
    token = create_refresh_token(data={"sub": user_id})

    payload = decode_token(token)
    assert payload["sub"] == user_id
    assert payload["type"] == "refresh"


def test_password_reset_token_hashing():
    raw_token = generate_reset_token()
    assert len(raw_token) == 64  # 32 bytes hex

    token_hash = hash_token(raw_token)
    assert len(token_hash) == 64  # SHA-256 hex
    assert token_hash == hash_token(raw_token)
    assert token_hash != hash_token("different_token")
