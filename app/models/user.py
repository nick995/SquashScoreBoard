from sqlalchemy import Column, Integer, String, ForeignKey, Index
from sqlalchemy.orm import relationship
from app.core.db import Base

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False, index=True)
    email = Column(String , nullable=True)
    player_number = Column(Integer, nullable=False, index=True)   # 1~4
    player_phone_number = Column(String, nullable=True)
    team_id = Column(Integer, ForeignKey("teams.id"), index=True)

    team = relationship("Team", back_populates="members")

    __table_args__ = (
        Index("ix_users_team_player", "team_id", "player_number"),
    )
