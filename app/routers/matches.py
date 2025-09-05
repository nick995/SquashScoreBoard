from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.core.db import get_db
from app.models.match import Match as MatchModel
from app.models.gamescore import GameScore as GameScoreModel
from app.schemas.match import Match as MatchSchema
from app.utils.scoring import check_winner, calculate_match_points, apply_sub_rule

router = APIRouter(prefix="/matches", tags=["matches"])

@router.post("/", response_model=MatchSchema)
def create_match(match: MatchSchema, db: Session = Depends(get_db)):
    db_match = MatchModel(
        court=match.court,
        order=match.order,
        referee_id=match.referee_id,
        team1_id=match.team1_id,
        team2_id=match.team2_id,
        team1_player_id=match.team1_player_id,
        team2_player_id=match.team2_player_id,
    )
    db.add(db_match)
    db.commit()
    db.refresh(db_match)

    # 기본 5게임 생성
    for i in range(1, 6):
        db.add(GameScoreModel(match_id=db_match.id, game_number=i))
    db.commit()
    db.refresh(db_match)

    return db_match

@router.post("/{match_id}/update/{game_number}")
def update_score(match_id: int, game_number: int, team1_score: int, team2_score: int, db: Session = Depends(get_db)):
    match = db.query(MatchModel).filter(MatchModel.id == match_id).first()
    if not match:
        raise HTTPException(status_code=404, detail="Match not found")

    game = next((g for g in match.games if g.game_number == game_number), None)
    if not game:
        raise HTTPException(status_code=404, detail="Game not found")

    game.team1_score = team1_score
    game.team2_score = team2_score
    db.commit()

    # 승자 판정
    match.winner_team_id = check_winner(match)

    # 점수 계산 + 대체출전 룰 적용
    pts = calculate_match_points(match)
    pts = apply_sub_rule(pts, match)
    match.team1_points, match.team2_points = pts
    match.score_summary = f"{match.team1_points}-{match.team2_points}"

    # 팀 누적 점수 업데이트
    if match.winner_team_id:
        from app.models.team import Team as TeamModel
        team1 = db.query(TeamModel).get(match.team1_id)
        team2 = db.query(TeamModel).get(match.team2_id)
        team1.total_points += match.team1_points
        team2.total_points += match.team2_points

    db.commit()
    db.refresh(match)
    return match

@router.get("/{match_id}", response_model=MatchSchema)
def get_match(match_id: int, db: Session = Depends(get_db)):
    match = db.query(MatchModel).filter(MatchModel.id == match_id).first()
    if not match:
        raise HTTPException(status_code=404, detail="Match not found")
    return match
