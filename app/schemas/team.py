from pydantic import BaseModel
from typing import List
from app.schemas.user import User

class Team(BaseModel):
    id: int
    name: str
    members: List[User] = []
    total_points: int = 0

    class Config:
        from_attributes = True

# ✅ 여기에 추가
class AddUserToTeam(BaseModel):
    user_id: int
