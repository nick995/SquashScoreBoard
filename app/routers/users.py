from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.core.db import get_db
from app.models.user import User as UserModel
from app.schemas.user import User, UserCreate, UserUpdate

router = APIRouter(prefix="/users", tags=["Users"])

@router.post("/", response_model=User)
@router.post("", response_model=User)
def create_user(user: UserCreate, db: Session = Depends(get_db)):
    db_user = UserModel(**user.dict())
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user

@router.get("/", response_model=list[User])
@router.get("", response_model=list[User])
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
@router.get("/search", response_model=list[User])
def search_users(name: str, db: Session = Depends(get_db)):
    users = db.query(UserModel).filter(UserModel.name.ilike(f"%{name}%")).all()
    return users


@router.put("/{user_id}", response_model=User)
def update_user(user_id: int, payload: UserUpdate, db: Session = Depends(get_db)):
    user = db.query(UserModel).filter(UserModel.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    if payload.name is not None:
        user.name = payload.name
    if payload.email is not None:
        user.email = payload.email
    if payload.player_number is not None:
        user.player_number = payload.player_number
    if payload.player_phone_number is not None:
        user.player_phone_number = payload.player_phone_number
    if payload.team_id is not None:
        # allow null to remove team assignment; if provided non-null, ensure team exists
        if payload.team_id == 0:
            user.team_id = None
        else:
            from app.models.team import Team as TeamModel
            team = db.query(TeamModel).filter(TeamModel.id == payload.team_id).first()
            if not team:
                raise HTTPException(status_code=400, detail="Target team not found")
            user.team_id = payload.team_id
    db.commit()
    db.refresh(user)
    return user


@router.delete("/{user_id}")
def delete_user(user_id: int, db: Session = Depends(get_db)):
    user = db.query(UserModel).filter(UserModel.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    try:
        db.delete(user)
        db.commit()
    except Exception:
        db.rollback()
        raise HTTPException(status_code=400, detail="Cannot delete user; they may be referenced in matches")
    return {"status": "ok"}
