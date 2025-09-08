from pydantic import BaseModel
from typing import Optional

class UserCreate(BaseModel):
    name: str
    email: str | None = None         
    player_number: int
    player_phone_number: str | None = None
    team_id: int | None = None

class User(UserCreate):
    id: int

    class Config:
        from_attributes = True

class UserUpdate(BaseModel):
    name: Optional[str] = None
    email: Optional[str] = None
    player_number: Optional[int] = None
    player_phone_number: Optional[str] = None
    team_id: Optional[int] = None
