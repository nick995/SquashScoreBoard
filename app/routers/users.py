from fastapi import APIRouter, HTTPException
from app.schemas.user import User

router = APIRouter()
users: dict[int, User] = {}

@router.post("/", response_model=User)
def create_user(user: User):
    
    if user.id in users:
        raise HTTPException(status_code=400, detail="User with this ID already exists")
    
    if any(u.email == user.email for u in users.values()):
        raise HTTPException(status_code=400, detail="User with this email already exists")
    users[user.id] = user
    return user

@router.get("/{user_id}", response_model=User)
def get_user(user_id: int):
    if user_id not in users:
        raise HTTPException(status_code=404, detail="User not found")
    return users[user_id]

@router.get("/", response_model=list[User])
def get_all_users():
    return list(users.values())
