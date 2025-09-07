from pydantic import BaseModel
from typing import Optional

class MatchEvent(BaseModel):
    id: int | None = None
    match_id: int
    event_type: str
    team_id: Optional[int] = None
    player_id: Optional[int] = None
    timestamp: Optional[str] = None

    class Config:
        from_attributes = True
