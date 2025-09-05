from pydantic import BaseModel
from typing import List
from app.schemas.gamescore import GameScore

class Match(BaseModel):
    id: int
    court: str | None = None
    order: int | None = None
    team1_id: int
    team2_id: int
    winner_team_id: int | None = None
    score_summary: str | None = None
    games: List[GameScore] = []   # ✅ 게임별 점수 포함

    class Config:
        orm_mode = True
