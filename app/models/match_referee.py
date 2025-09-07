from sqlalchemy import Column, Integer, ForeignKey
from sqlalchemy.orm import relationship
from app.core.db import Base

class MatchReferee(Base):
    __tablename__ = "match_referees"

    id = Column(Integer, primary_key=True, index=True)
    match_id = Column(Integer, ForeignKey("matches.id"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)

    match = relationship("Match", back_populates="referees")
    user = relationship("User")

