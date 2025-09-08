from fastapi import APIRouter
from app.schemas.team_match import TeamMatch
from app.utils.scoring import check_winner, calculate_match_points

router = APIRouter(prefix="/team_matches", tags=["team_matches"])
TEAM_MATCHES_STORE = {}

@router.post("/", response_model=TeamMatch)
def create_team_match(tm: TeamMatch):
    # Keep simple in-memory structure without auto-generation
    tm.matches = []
    TEAM_MATCHES_STORE[tm.id] = tm
    return tm

@router.post("/{tm_id}/finalize_match/{match_id}", response_model=TeamMatch)
def finalize_individual_match(tm_id: int, match_id: int):
    if tm_id not in TEAM_MATCHES_STORE:
        return {"error": "Team match not found"}
    tm = TEAM_MATCHES_STORE[tm_id]
    match = tm.matches[match_id-1]
    match = check_winner(match)
    pts1, pts2 = calculate_match_points(match, tm.team1_id, tm.team2_id)
    tm.team1_points += pts1
    tm.team2_points += pts2
    return tm

@router.get("/{tm_id}", response_model=TeamMatch)
def get_team_match(tm_id: int):
    return TEAM_MATCHES_STORE.get(tm_id, {"error": "Team match not found"})
