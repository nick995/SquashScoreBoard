from pydantic import BaseModel
from typing import List, Optional
from app.schemas.match import Match
from app.schemas.gamescore import GameScore

class TeamMatch(BaseModel):
    id: int
    team1_id: int
    team2_id: int
    matches: List[Match] = []
    team1_points: float = 0
    team2_points: float = 0
    winner: Optional[int] = None
