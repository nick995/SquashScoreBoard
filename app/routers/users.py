from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.core.db import get_db
from app.models.user import User as UserModel
from app.schemas.user import User, UserCreate

router = APIRouter(prefix="/users", tags=["Users"])

@router.post("/", response_model=User)
def create_user(user: UserCreate, db: Session = Depends(get_db)):
    db_user = UserModel(**user.dict())
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user

@router.get("/", response_model=list[User])
def get_users(db: Session = Depends(get_db)):
    return db.query(UserModel).all()

@router.get("/{user_id}", response_model=User)
def get_user(user_id: int, db: Session = Depends(get_db)):
    user = db.query(UserModel).filter(UserModel.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user

# ✅ 이름 검색 API 추가
@router.get("/search/", response_model=list[User])
def search_users(name: str, db: Session = Depends(get_db)):
    users = db.query(UserModel).filter(UserModel.name.ilike(f"%{name}%")).all()
    return users
