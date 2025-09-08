from pydantic import BaseModel
from typing import List, Optional
from app.schemas.gamescore import GameScore

class Match(BaseModel):
    id: int | None = None
    court: Optional[str] = None
    order: Optional[int] = None
    referee_id: Optional[int] = None
    referee_ids: Optional[List[int]] = []
    team1_id: int
    team2_id: int
    team1_player_id: Optional[int] = None
    team2_player_id: Optional[int] = None
    winner_team_id: Optional[int] = None
    score_summary: Optional[str] = None
    games: List[GameScore] = []   # 게임별 점수 포함

    class Config:
        from_attributes = True


class MatchUpdate(BaseModel):
    court: Optional[str] = None
    order: Optional[int] = None
    referee_id: Optional[int] = None
    referee_ids: Optional[List[int]] = None
    team1_id: Optional[int] = None
    team2_id: Optional[int] = None
    team1_player_id: Optional[int] = None
    team2_player_id: Optional[int] = None
