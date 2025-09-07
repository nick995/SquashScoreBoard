from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.core.db import get_db
from app.models.team import Team as TeamModel
from app.models.user import User as UserModel
from app.schemas.team import Team as TeamSchema, AddUserToTeam, TeamCreate, TeamBasic

router = APIRouter(prefix="/teams", tags=["Teams"])

@router.post("/", response_model=TeamSchema)
@router.post("", response_model=TeamSchema)
def create_team(team: TeamCreate, db: Session = Depends(get_db)):
    existing = db.query(TeamModel).filter(TeamModel.name == team.name).first()
    if existing:
        raise HTTPException(status_code=400, detail="Team with this name already exists")

    db_team = TeamModel(name=team.name)
    db.add(db_team)
    db.commit()
    db.refresh(db_team)
    return db_team

@router.post("/{team_id}/add_user", response_model=TeamSchema)
def add_user_to_team(team_id: int, payload: AddUserToTeam, db: Session = Depends(get_db)):
    team = db.query(TeamModel).filter(TeamModel.id == team_id).first()
    if not team:
        raise HTTPException(status_code=404, detail="Team not found")

    db_user = db.query(UserModel).filter(UserModel.id == payload.user_id).first()
    if not db_user:
        raise HTTPException(status_code=404, detail="User not found")

    if db_user.team_id == team_id:
        raise HTTPException(status_code=400, detail="User already in this team")
    if db_user.team_id is not None and db_user.team_id != team_id:
        raise HTTPException(status_code=400, detail="User belongs to another team")

    db_user.team_id = team_id
    db.commit()
    db.refresh(team)
    return team


@router.post("/{team_id}/add_user_by_name", response_model=TeamSchema)
def add_user_to_team_by_name(team_id: int, name: str, db: Session = Depends(get_db)):
    team = db.query(TeamModel).filter(TeamModel.id == team_id).first()
    if not team:
        raise HTTPException(status_code=404, detail="Team not found")

    db_user = db.query(UserModel).filter(UserModel.name == name).first()
    if not db_user:
        raise HTTPException(status_code=404, detail="User not found")

    if db_user.team_id == team_id:
        raise HTTPException(status_code=400, detail="User already in this team")
    if db_user.team_id is not None and db_user.team_id != team_id:
        raise HTTPException(status_code=400, detail="User belongs to another team")

    db_user.team_id = team_id
    db.commit()
    db.refresh(team)
    return team


@router.get("/{team_id}", response_model=TeamSchema)
def get_team(team_id: int, db: Session = Depends(get_db)):
    team = db.query(TeamModel).filter(TeamModel.id == team_id).first()
    if not team:
        raise HTTPException(status_code=404, detail="Team not found")
    return team

@router.get("/", response_model=list[TeamBasic])
@router.get("", response_model=list[TeamBasic])
def get_teams(db: Session = Depends(get_db)):
    return db.query(TeamModel).all()
