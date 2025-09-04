from pydantic import BaseModel
from typing import List
from app.schemas.user import User

class Team(BaseModel):
    id: int
    name: str
    members: List[User] = []
