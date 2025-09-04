from fastapi import APIRouter
from app.schemas.team_match import TeamMatch
from app.schemas.match import Match, GameScore
from .matches import check_winner, calculate_match_points

router = APIRouter()
team_matches = {}

@router.post("/", response_model=TeamMatch)
def create_team_match(tm: TeamMatch):
    tm.matches = [
        Match(
            id=i+1,
            team1_id=tm.team1_id,
            team2_id=tm.team2_id,
            team1_player_number=i+1,
            team2_player_number=i+1,
            games=[GameScore(game_number=g+1) for g in range(5)]
        )
        for i in range(4)
    ]
    team_matches[tm.id] = tm
    return tm

@router.post("/{tm_id}/finalize_match/{match_id}", response_model=TeamMatch)
def finalize_individual_match(tm_id: int, match_id: int):
    if tm_id not in team_matches:
        return {"error": "Team match not found"}
    tm = team_matches[tm_id]
    match = tm.matches[match_id-1]
    match = check_winner(match)
    pts1, pts2 = calculate_match_points(match, tm.team1_id, tm.team2_id)
    tm.team1_points += pts1
    tm.team2_points += pts2
    return tm

@router.get("/{tm_id}", response_model=TeamMatch)
def get_team_match(tm_id: int):
    return team_matches.get(tm_id, {"error": "Team match not found"})
