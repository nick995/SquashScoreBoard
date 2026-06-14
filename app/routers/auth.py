import os
import secrets
from fastapi import APIRouter, Depends, Header, HTTPException
from pydantic import BaseModel

router = APIRouter(prefix="/auth", tags=["Auth"])


class LoginRequest(BaseModel):
    username: str
    password: str


class LoginResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"


def _admin_token() -> str:
    return os.getenv("ADMIN_TOKEN", "")


def _admin_username() -> str:
    return os.getenv("ADMIN_USERNAME", "admin")


def _admin_password() -> str:
    return os.getenv("ADMIN_PASSWORD", "")


@router.post("/login", response_model=LoginResponse)
def login(payload: LoginRequest):
    expected_user = _admin_username()
    expected_pw = _admin_password()
    token = _admin_token()
    if not expected_pw or not token:
        raise HTTPException(status_code=500, detail="Admin auth not configured")

    user_ok = secrets.compare_digest(payload.username, expected_user)
    pw_ok = secrets.compare_digest(payload.password, expected_pw)
    if not (user_ok and pw_ok):
        raise HTTPException(status_code=401, detail="Invalid credentials")

    return LoginResponse(access_token=token)


def require_admin(authorization: str | None = Header(default=None)):
    """Dependency that enforces a valid admin bearer token. Not yet wired up to
    existing routers — apply with `dependencies=[Depends(require_admin)]` when
    ready to lock down write endpoints."""
    token = _admin_token()
    if not token:
        raise HTTPException(status_code=500, detail="Admin auth not configured")
    if not authorization or not authorization.lower().startswith("bearer "):
        raise HTTPException(status_code=401, detail="Missing bearer token")
    provided = authorization.split(" ", 1)[1].strip()
    if not secrets.compare_digest(provided, token):
        raise HTTPException(status_code=401, detail="Invalid token")
    return True


@router.get("/me")
def me(_: bool = Depends(require_admin)):
    return {"role": "admin"}
