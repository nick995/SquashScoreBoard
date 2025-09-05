from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.core.db import get_db
from app.models.match_event import MatchEvent as MatchEventModel
from app.schemas.event import MatchEvent as MatchEventSchema

router = APIRouter(prefix="/events", tags=["events"])

@router.post("/", response_model=MatchEventSchema)
def create_event(event: MatchEventSchema, db: Session = Depends(get_db)):
    db_event = MatchEventModel(**event.dict())
    db.add(db_event)
    db.commit()
    db.refresh(db_event)
    return db_event

@router.get("/match/{match_id}", response_model=list[MatchEventSchema])
def get_events_for_match(match_id: int, db: Session = Depends(get_db)):
    events = db.query(MatchEventModel).filter(MatchEventModel.match_id == match_id).all()
    return events
