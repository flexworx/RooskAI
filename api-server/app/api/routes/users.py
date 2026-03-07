"""User management endpoints — CRUD for platform users."""

from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, EmailStr
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import get_current_user, require_role, hash_password, verify_password
from app.models.models import User
from app.services.audit import log_action

router = APIRouter(prefix="/users", tags=["Users"])


class CreateUserRequest(BaseModel):
    username: str
    email: str
    password: str
    name: str | None = None
    role: str = "viewer"


class UpdateUserRequest(BaseModel):
    username: str | None = None
    email: str | None = None
    name: str | None = None
    role: str | None = None
    is_active: bool | None = None


class ResetPasswordRequest(BaseModel):
    new_password: str


class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str


def _user_to_dict(u: User) -> dict:
    return {
        "id": str(u.id),
        "username": u.username,
        "email": u.email,
        "role": u.role,
        "mfa_enabled": u.mfa_enabled,
        "is_active": u.is_active,
        "created_at": u.created_at.isoformat() if u.created_at else None,
        "last_login": u.last_login.isoformat() if u.last_login else None,
    }


@router.get("/")
async def list_users(
    db: AsyncSession = Depends(get_db),
    user: dict = Depends(require_role("platform_admin")),
):
    """List all platform users. Admin only."""
    result = await db.execute(select(User).order_by(User.created_at))
    users = list(result.scalars().all())
    return [_user_to_dict(u) for u in users]


@router.post("/")
async def create_user(
    req: CreateUserRequest,
    db: AsyncSession = Depends(get_db),
    user: dict = Depends(require_role("platform_admin")),
):
    """Create a new platform user. Admin only."""
    # Check for duplicate email/username
    existing = await db.execute(
        select(User).where((User.email == req.email) | (User.username == req.username))
    )
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=409, detail="User with this email or username already exists")

    valid_roles = ["platform_admin", "operator", "viewer", "api_service"]
    if req.role not in valid_roles:
        raise HTTPException(status_code=400, detail=f"Invalid role. Must be one of: {valid_roles}")

    new_user = User(
        username=req.username,
        email=req.email,
        hashed_password=hash_password(req.password),
        role=req.role,
    )
    db.add(new_user)
    await db.flush()

    await log_action(
        db,
        action="user.create",
        resource_type="user",
        resource_id=str(new_user.id),
        user_id=UUID(user.get("sub")) if user.get("sub") else None,
        outcome="success",
    )
    await db.commit()

    return _user_to_dict(new_user)


@router.get("/{user_id}")
async def get_user(
    user_id: str,
    db: AsyncSession = Depends(get_db),
    user: dict = Depends(get_current_user),
):
    """Get user details. Users can view their own profile; admins can view any."""
    # Allow self-access or admin access
    is_admin = "platform_admin" in user.get("roles", [])
    is_self = user.get("sub") == user_id

    if not is_admin and not is_self:
        raise HTTPException(status_code=403, detail="Access denied")

    result = await db.execute(select(User).where(User.id == UUID(user_id)))
    target = result.scalar_one_or_none()
    if not target:
        raise HTTPException(status_code=404, detail="User not found")

    return _user_to_dict(target)


@router.patch("/{user_id}")
async def update_user(
    user_id: str,
    req: UpdateUserRequest,
    db: AsyncSession = Depends(get_db),
    user: dict = Depends(require_role("platform_admin")),
):
    """Update a user's profile. Admin only."""
    result = await db.execute(select(User).where(User.id == UUID(user_id)))
    target = result.scalar_one_or_none()
    if not target:
        raise HTTPException(status_code=404, detail="User not found")

    if req.username is not None:
        target.username = req.username
    if req.email is not None:
        target.email = req.email
    if req.role is not None:
        valid_roles = ["platform_admin", "operator", "viewer", "api_service"]
        if req.role not in valid_roles:
            raise HTTPException(status_code=400, detail=f"Invalid role. Must be one of: {valid_roles}")
        target.role = req.role
    if req.is_active is not None:
        target.is_active = req.is_active

    await log_action(
        db,
        action="user.update",
        resource_type="user",
        resource_id=user_id,
        user_id=UUID(user.get("sub")) if user.get("sub") else None,
        outcome="success",
    )
    await db.commit()

    return _user_to_dict(target)


@router.delete("/{user_id}")
async def delete_user(
    user_id: str,
    db: AsyncSession = Depends(get_db),
    user: dict = Depends(require_role("platform_admin")),
):
    """Deactivate a user. Admin only. Does not hard-delete."""
    if user.get("sub") == user_id:
        raise HTTPException(status_code=400, detail="Cannot deactivate your own account")

    result = await db.execute(select(User).where(User.id == UUID(user_id)))
    target = result.scalar_one_or_none()
    if not target:
        raise HTTPException(status_code=404, detail="User not found")

    target.is_active = False

    await log_action(
        db,
        action="user.deactivate",
        resource_type="user",
        resource_id=user_id,
        user_id=UUID(user.get("sub")) if user.get("sub") else None,
        outcome="success",
    )
    await db.commit()

    return {"status": "deactivated", "user_id": user_id}


@router.post("/{user_id}/reset-password")
async def reset_user_password(
    user_id: str,
    req: ResetPasswordRequest,
    db: AsyncSession = Depends(get_db),
    user: dict = Depends(require_role("platform_admin")),
):
    """Reset a user's password. Admin only."""
    result = await db.execute(select(User).where(User.id == UUID(user_id)))
    target = result.scalar_one_or_none()
    if not target:
        raise HTTPException(status_code=404, detail="User not found")

    target.hashed_password = hash_password(req.new_password)

    await log_action(
        db,
        action="user.reset_password",
        resource_type="user",
        resource_id=user_id,
        user_id=UUID(user.get("sub")) if user.get("sub") else None,
        outcome="success",
    )
    await db.commit()

    return {"status": "password_reset", "user_id": user_id}


@router.post("/me/password")
async def change_own_password(
    req: ChangePasswordRequest,
    db: AsyncSession = Depends(get_db),
    user: dict = Depends(get_current_user),
):
    """Change your own password. Requires current password."""
    result = await db.execute(select(User).where(User.id == UUID(user["sub"])))
    target = result.scalar_one_or_none()
    if not target:
        raise HTTPException(status_code=404, detail="User not found")

    if not verify_password(req.current_password, target.hashed_password):
        raise HTTPException(status_code=401, detail="Current password is incorrect")

    target.hashed_password = hash_password(req.new_password)
    await db.commit()

    return {"status": "password_changed"}
