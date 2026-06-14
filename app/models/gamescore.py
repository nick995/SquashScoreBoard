from sqlalchemy import Column, Integer, ForeignKey, Index, Text
from sqlalchemy.orm import relationship
from app.core.db import Base

class GameScore(Base):
    __tablename__ = "game_scores"

    id = Column(Integer, primary_key=True, index=True)
    match_id = Column(Integer, ForeignKey("matches.id"), nullable=False, index=True)
    game_number = Column(Integer, nullable=False, index=True)   # 1~5
    team1_score = Column(Integer, default=0)
    team2_score = Column(Integer, default=0)
    # Serialized rally timeline (seq + serve state) — JSON string, optional.
    # Lets the scoreboard restore the full timeline across devices/browsers.
    rally_data = Column(Text, nullable=True)

    match = relationship("Match", back_populates="games")

    __table_args__ = (
        Index("ix_game_scores_match_game", "match_id", "game_number"),
    )
