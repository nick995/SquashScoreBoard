from sqlalchemy import Column, Integer, String, ForeignKey
from sqlalchemy.orm import relationship
from app.core.db import Base

class Match(Base):
    __tablename__ = "matches"

    id = Column(Integer, primary_key=True, index=True)
    court = Column(String, nullable=True)       # 코트 번호
    order = Column(Integer, nullable=True)      # 출전 순서
    winner_team_id = Column(Integer, ForeignKey("teams.id"), nullable=True)

    # referee and players
    referee_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    team1_player_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    team2_player_id = Column(Integer, ForeignKey("users.id"), nullable=True)

    team1_id = Column(Integer, ForeignKey("teams.id"), nullable=False)
    team2_id = Column(Integer, ForeignKey("teams.id"), nullable=False)

    score_summary = Column(String, nullable=True)  # "3-1" 같은 요약 점수

    team1 = relationship("Team", foreign_keys=[team1_id])
    team2 = relationship("Team", foreign_keys=[team2_id])
    referee = relationship("User", foreign_keys=[referee_id])
    team1_player = relationship("User", foreign_keys=[team1_player_id])
    team2_player = relationship("User", foreign_keys=[team2_player_id])
    games = relationship("GameScore", back_populates="match")
    referees = relationship("MatchReferee", back_populates="match", cascade="all, delete-orphan")
