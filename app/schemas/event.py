from pydantic import BaseModel
from typing import Optional
from datetime import datetime

class MatchEvent(BaseModel):
    id: int | None = None
    match_id: int
    event_type: str
    team_id: Optional[int] = None
    player_id: Optional[int] = None
    game_number: Optional[int] = None
    timestamp: Optional[datetime] = None

    class Config:
        from_attributes = True
