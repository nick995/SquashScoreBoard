from sqlalchemy import Column, Integer, ForeignKey
from sqlalchemy.orm import relationship
from app.core.db import Base

class GameScore(Base):
    __tablename__ = "game_scores"

    id = Column(Integer, primary_key=True, index=True)
    match_id = Column(Integer, ForeignKey("matches.id"), nullable=False)
    game_number = Column(Integer, nullable=False)   # 1~5
    team1_score = Column(Integer, default=0)
    team2_score = Column(Integer, default=0)

    match = relationship("Match", back_populates="games")
