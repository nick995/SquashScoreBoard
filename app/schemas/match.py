# app/schemas/match.py
from pydantic import BaseModel
from typing import List, Optional

class GameScore(BaseModel):
    game_number: int
    team1_points: int = 0
    team2_points: int = 0

class Match(BaseModel):
    id: int
    team1_id: int
    team2_id: int
    team1_player_number: Optional[int] = None
    team2_player_number: Optional[int] = None
    games: List[GameScore] = []
    winner: Optional[int] = None
