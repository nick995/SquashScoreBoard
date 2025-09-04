from fastapi import APIRouter
from app.schemas.match import Match, GameScore

router = APIRouter()
matches = {}

def check_winner(match: Match) -> Match:
    team1_wins = 0
    team2_wins = 0
    for g in match.games:
        if (g.team1_points >= 11 or g.team2_points >= 11) and abs(g.team1_points - g.team2_points) >= 2:
            if g.team1_points > g.team2_points:
                team1_wins += 1
            else:
                team2_wins += 1
    if team1_wins >= 3:
        match.winner = match.team1_id
    elif team2_wins >= 3:
        match.winner = match.team2_id
    return match

def calculate_match_points(match: Match, team1_id: int, team2_id: int):
    team1_games = sum(1 for g in match.games if g.team1_points > g.team2_points and abs(g.team1_points-g.team2_points) >= 2)
    team2_games = sum(1 for g in match.games if g.team2_points > g.team1_points and abs(g.team1_points-g.team2_points) >= 2)

    if team1_games == 3:
        diff = team1_games - team2_games
        if diff == 3: return (5,0)
        if diff == 2: return (4,1)
        if diff == 1: return (3,2)
    elif team2_games == 3:
        diff = team2_games - team1_games
        if diff == 3: return (0,5)
        if diff == 2: return (1,4)
        if diff == 1: return (2,3)

    return (0,0)

@router.post("/", response_model=Match)
def create_match(match: Match):
    match.games = [GameScore(game_number=i+1) for i in range(5)]
    matches[match.id] = match
    return match

@router.get("/{match_id}", response_model=Match)
def get_match(match_id: int):
    return matches.get(match_id, {"error": "Match not found"})
