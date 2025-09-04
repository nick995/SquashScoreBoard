from fastapi import APIRouter, HTTPException
from app.schemas.team import Team
from app.schemas.user import User

router = APIRouter()
teams: dict[int, Team] = {}

@router.post("/", response_model=Team)
def create_team(team: Team):
    
    if team.id in teams:
        raise HTTPException(status_code=400, detail="Team with this ID already exists")
    
    if any(t.name == team.name for t in teams.values()):
        raise HTTPException(status_code=400, detail="Team with this name already exists")
    teams[team.id] = team
    return team

@router.post("/{team_id}/add_user", response_model=Team)
def add_user_to_team(team_id: int, user: User):
    if team_id not in teams:
        raise HTTPException(status_code=404, detail="Team not found")
    team = teams[team_id]
    if any(u.id == user.id for u in team.members):
        raise HTTPException(status_code=400, detail="User already in team")
    team.members.append(user)
    return team

@router.get("/{team_id}", response_model=Team)
def get_team(team_id: int):
    if team_id not in teams:
        raise HTTPException(status_code=404, detail="Team not found")
    return teams[team_id]

@router.get("/", response_model=list[Team])
def get_all_teams():
    return list(teams.values())
