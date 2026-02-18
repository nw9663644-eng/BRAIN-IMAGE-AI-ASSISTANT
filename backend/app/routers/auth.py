"""Authentication router: Register, Login, and Profile endpoints."""

from fastapi import APIRouter, HTTPException, Depends, status
from app.models import (
    RegisterRequest,
    LoginRequest,
    TokenResponse,
    UserProfileResponse,
)
from app.database import get_supabase
from app.services.auth_service import (
    hash_password,
    verify_password,
    create_access_token,
    get_current_user,
)

router = APIRouter(prefix="/api/auth", tags=["Authentication"])


@router.post("/register", response_model=UserProfileResponse, status_code=201)
async def register(req: RegisterRequest):
    """Register a new user (patient or doctor)."""
    db = get_supabase()

    # Check if user already exists
    existing = db.table("profiles").select("id").eq("id", req.id).execute()
    if existing.data:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT, detail="该 ID 已被注册"
        )

    # Create user profile
    profile_data = {
        "id": req.id,
        "role": req.role.value,
        "name": req.name,
        "password_hash": hash_password(req.password),
        "gender": req.gender.value if req.gender else None,
        "age": req.age,
        "phone": req.phone,
        "department": req.department,
        "title": req.title,
        "hospital": req.hospital,
        "specialties": req.specialties,
        "registration_date": __import__("datetime").date.today().isoformat(),
    }

    result = db.table("profiles").insert(profile_data).execute()

    if not result.data:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="注册失败，请重试",
        )

    user = result.data[0]
    return _to_profile_response(user)


@router.post("/login", response_model=TokenResponse)
async def login(req: LoginRequest):
    """Authenticate user and return a JWT token."""
    db = get_supabase()

    result = db.table("profiles").select("*").eq("id", req.id).execute()

    if not result.data:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="账号或密码错误 (未注册请先注册)",
        )

    user = result.data[0]

    # Verify password
    if not verify_password(req.password, user["password_hash"]):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="账号或密码错误 (未注册请先注册)",
        )

    # Verify role matches
    if user["role"] != req.role.value:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"该账号不是{'医生' if req.role.value == 'DOCTOR' else '患者'}账号",
        )

    # Create JWT token
    token = create_access_token(user["id"], user["role"])

    return TokenResponse(
        access_token=token,
        user=_to_profile_response(user),
    )


@router.get("/me", response_model=UserProfileResponse)
async def get_me(current_user: dict = Depends(get_current_user)):
    """Get the current user's profile."""
    return _to_profile_response(current_user)


def _to_profile_response(user: dict) -> UserProfileResponse:
    """Convert a database profile row to the API response model."""
    return UserProfileResponse(
        id=user["id"],
        role=user["role"],
        name=user["name"],
        gender=user.get("gender"),
        age=user.get("age"),
        phone=user.get("phone"),
        department=user.get("department"),
        title=user.get("title"),
        hospital=user.get("hospital"),
        specialties=user.get("specialties"),
        registrationDate=user.get("registration_date", ""),
    )
