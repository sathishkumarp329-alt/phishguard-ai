"""Authentication API Endpoints."""

from fastapi import APIRouter, Depends, HTTPException, Request, Response, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.deps import get_db
from app.core.limiter import limiter
from app.core.security import create_access_token
from app.schemas.auth import (
    AuthResponse,
    ForgotPasswordRequest,
    LoginRequest,
    MessageResponse,
    ResetPasswordRequest,
    SignupRequest,
    UserResponse,
)
from app.services import auth_service

router = APIRouter(prefix="/auth", tags=["auth"])


def _set_auth_cookie(response: Response, token: str) -> None:
    """Helper to attach secure httpOnly session cookie."""
    max_age = settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60
    response.set_cookie(
        key=settings.COOKIE_NAME,
        value=token,
        max_age=max_age,
        expires=max_age,
        httponly=True,
        secure=settings.COOKIE_SECURE,
        samesite=settings.COOKIE_SAMESITE,
    )


@router.post(
    "/signup",
    response_model=AuthResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Register a new user account",
)
async def signup(
    response: Response,
    payload: SignupRequest,
    db: AsyncSession = Depends(get_db),
) -> AuthResponse:
    """Create a new user profile, issue access token, and set httpOnly cookie."""
    user = await auth_service.register_user(db, payload)
    token = create_access_token(data={"sub": str(user.id)})
    _set_auth_cookie(response, token)

    return AuthResponse(
        user=UserResponse.model_validate(user),
        message="Account created successfully.",
    )


@router.post(
    "/login",
    response_model=AuthResponse,
    summary="Authenticate and establish session",
)
@limiter.limit(settings.RATE_LIMIT_LOGIN)
async def login(
    request: Request,
    response: Response,
    payload: LoginRequest,
    db: AsyncSession = Depends(get_db),
) -> AuthResponse:
    """Validate credentials, generate session JWT, and set secure httpOnly cookie."""
    user = await auth_service.authenticate_user(db, payload.email, payload.password)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    token = create_access_token(data={"sub": str(user.id)})
    _set_auth_cookie(response, token)

    return AuthResponse(
        user=UserResponse.model_validate(user),
        message="Authentication successful.",
    )


@router.post(
    "/logout",
    response_model=MessageResponse,
    summary="Terminate session and clear cookie",
)
async def logout(response: Response) -> MessageResponse:
    """Clear httpOnly authentication cookie."""
    response.delete_cookie(
        key=settings.COOKIE_NAME,
        httponly=True,
        secure=settings.COOKIE_SECURE,
        samesite=settings.COOKIE_SAMESITE,
    )
    return MessageResponse(message="Successfully logged out.")


@router.post(
    "/forgot-password",
    response_model=MessageResponse,
    summary="Request password reset token",
)
@limiter.limit(settings.RATE_LIMIT_FORGOT_PASSWORD)
async def forgot_password(
    request: Request,
    payload: ForgotPasswordRequest,
    db: AsyncSession = Depends(get_db),
) -> MessageResponse:
    """
    Generate a password reset token. Always returns generic success response
    to prevent user enumeration attacks.
    """
    await auth_service.create_password_reset(db, payload.email)
    return MessageResponse(
        message="If this email is registered in our system, password reset instructions have been dispatched."
    )


@router.post(
    "/reset-password",
    response_model=MessageResponse,
    summary="Reset password using secret token",
)
async def reset_password(
    payload: ResetPasswordRequest,
    db: AsyncSession = Depends(get_db),
) -> MessageResponse:
    """Verify reset token and update account password."""
    success = await auth_service.reset_password(
        db, payload.token, payload.new_password
    )
    if not success:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid, expired, or already utilized password reset token.",
        )
    return MessageResponse(message="Password successfully reset. You may now log in.")
