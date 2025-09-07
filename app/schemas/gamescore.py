from pydantic import BaseModel

class GameScore(BaseModel):
    id: int
    match_id: int
    game_number: int
    team1_score: int
    team2_score: int

    class Config:
        from_attributes = True
