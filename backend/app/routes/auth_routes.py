"""
Authentication routes: Register, Login, Logout, and user profile.
Implements cloud authentication with JWT tokens and bcrypt hashing.
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.database import get_db
from app.models import User, AuditLog
from app.schemas import UserRegister, UserLogin, UserResponse, TokenResponse
from app.auth import hash_password, verify_password, create_access_token, get_current_user

router = APIRouter(prefix="/api", tags=["Authentication"])


@router.post("/register", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
async def register(user_data: UserRegister, db: AsyncSession = Depends(get_db)):
    """
    Register a new user account.
    - Validates uniqueness of username and email
    - Hashes password with bcrypt
    - Returns JWT token for immediate login
    """
    # Check for existing username
    existing = await db.execute(select(User).where(User.username == user_data.username))
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Username already registered")

    # Check for existing email
    existing_email = await db.execute(select(User).where(User.email == user_data.email))
    if existing_email.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Email already registered")

    # Create user with hashed password
    new_user = User(
        username=user_data.username,
        email=user_data.email,
        hashed_password=hash_password(user_data.password),
        full_name=user_data.full_name,
        role=user_data.role.value,
    )
    db.add(new_user)

    # Audit log
    db.add(AuditLog(
        user_id=new_user.id,
        action="register",
        resource_type="user",
        resource_id=new_user.id,
        details=f"User {user_data.username} registered as {user_data.role.value}"
    ))

    await db.commit()
    await db.refresh(new_user)

    # Generate token
    token = create_access_token(data={
        "sub": new_user.id,
        "username": new_user.username,
        "role": new_user.role
    })

    return TokenResponse(
        access_token=token,
        user=UserResponse.model_validate(new_user)
    )


@router.post("/login", response_model=TokenResponse)
async def login(credentials: UserLogin, db: AsyncSession = Depends(get_db)):
    """
    Authenticate user and return JWT token.
    - Verifies username and password
    - Returns access token with user details
    """
    result = await db.execute(select(User).where(User.username == credentials.username))
    user = result.scalar_one_or_none()

    if not user or not verify_password(credentials.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid username or password"
        )

    if not user.is_active:
        raise HTTPException(status_code=400, detail="Account is deactivated")

    # Audit log
    db.add(AuditLog(
        user_id=user.id,
        action="login",
        resource_type="user",
        resource_id=user.id,
        details=f"User {user.username} logged in"
    ))
    await db.commit()

    token = create_access_token(data={
        "sub": user.id,
        "username": user.username,
        "role": user.role
    })

    return TokenResponse(
        access_token=token,
        user=UserResponse.model_validate(user)
    )


@router.post("/logout")
async def logout(current_user: User = Depends(get_current_user)):
    """
    Logout endpoint (token invalidation is client-side for JWT).
    In production, implement a token blacklist with Redis.
    """
    return {"message": "Logged out successfully"}


@router.get("/me", response_model=UserResponse)
async def get_profile(current_user: User = Depends(get_current_user)):
    """Get the authenticated user's profile."""
    return UserResponse.model_validate(current_user)
