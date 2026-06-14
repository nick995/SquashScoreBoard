from typing import Optional
from pydantic import BaseModel

class GameScore(BaseModel):
    id: int
    match_id: int
    game_number: int
    team1_score: int
    team2_score: int
    rally_data: Optional[str] = None

    class Config:
        from_attributes = True
