from pydantic import BaseModel

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
