from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session, selectinload
from app.core.db import get_db
from app.models.match import Match as MatchModel
from app.models.gamescore import GameScore as GameScoreModel
from app.schemas.match import Match as MatchSchema, MatchUpdate
from app.models.match_referee import MatchReferee
from app.models.user import User as UserModel
from app.utils.scoring import check_winner, calculate_match_points, apply_sub_rule

router = APIRouter(prefix="/matches", tags=["matches"])

def _heal_winner(match: MatchModel, db: Session) -> int | None:
    """If the match's games already indicate a winner but `winner_team_id`
    wasn't persisted (race condition during the last write), derive it now and
    persist on the fly so subsequent reads stay consistent."""
    if match.winner_team_id:
        return match.winner_team_id
    derived = check_winner(match)
    if derived:
        prev = match.winner_team_id
        match.winner_team_id = derived
        # Recompute the per-match team points and team totals only on the
        # first transition (mirrors the guard in update_score so we don't
        # double-count).
        pts = calculate_match_points(match)
        pts = apply_sub_rule(pts, match)
        match.team1_points, match.team2_points = pts
        match.score_summary = f"{match.team1_points}-{match.team2_points}"
        if prev is None:
            from app.models.team import Team as TeamModel
            t1 = db.query(TeamModel).filter(TeamModel.id == match.team1_id).first()
            t2 = db.query(TeamModel).filter(TeamModel.id == match.team2_id).first()
            if t1 and t2:
                t1.total_points = (t1.total_points or 0) + (match.team1_points or 0)
                t2.total_points = (t2.total_points or 0) + (match.team2_points or 0)
        db.commit()
    return match.winner_team_id


@router.get("/", response_model=list[MatchSchema])
@router.get("", response_model=list[MatchSchema])
def list_matches(db: Session = Depends(get_db)):
    items = (
        db.query(MatchModel)
        .options(
            selectinload(MatchModel.games),
            selectinload(MatchModel.referees),
        )
        .all()
    )
    results: list[MatchSchema] = []
    for m in items:
        winner_id = _heal_winner(m, db)
        results.append(MatchSchema(
            id=m.id,
            court=m.court,
            order=m.order,
            referee_id=m.referee_id,
            referee_ids=[mr.user_id for mr in (m.referees or [])],
            team1_id=m.team1_id,
            team2_id=m.team2_id,
            team1_player_id=m.team1_player_id,
            team2_player_id=m.team2_player_id,
            winner_team_id=winner_id,
            score_summary=m.score_summary,
            games=m.games,
        ))
    return results

@router.post("/", response_model=MatchSchema)
@router.post("", response_model=MatchSchema)
def create_match(match: MatchSchema, db: Session = Depends(get_db)):
    # Auto-pair players by lineup number when not explicitly provided
    team1_player_id = match.team1_player_id
    team2_player_id = match.team2_player_id

    if (team1_player_id is None or team2_player_id is None) and match.order is not None:
        # Find players whose player_number matches the match order for each team
        if team1_player_id is None:
            t1_player = (
                db.query(UserModel)
                .filter(UserModel.team_id == match.team1_id, UserModel.player_number == match.order)
                .first()
            )
            team1_player_id = t1_player.id if t1_player else None
        if team2_player_id is None:
            t2_player = (
                db.query(UserModel)
                .filter(UserModel.team_id == match.team2_id, UserModel.player_number == match.order)
                .first()
            )
            team2_player_id = t2_player.id if t2_player else None

    db_match = MatchModel(
        court=match.court,
        order=match.order,
        referee_id=match.referee_id,
        team1_id=match.team1_id,
        team2_id=match.team2_id,
        team1_player_id=team1_player_id,
        team2_player_id=team2_player_id,
    )
    db.add(db_match)
    db.commit()
    db.refresh(db_match)

    # referees (multiple)
    if match.referee_ids:
        for uid in match.referee_ids:
            db.add(MatchReferee(match_id=db_match.id, user_id=uid))
        db.commit()
        db.refresh(db_match)

    # 기본 5게임 생성
    for i in range(1, 6):
        db.add(GameScoreModel(match_id=db_match.id, game_number=i))
    db.commit()
    db.refresh(db_match)

    return db_match

@router.post("/{match_id}/update/{game_number}")
def update_score(
    match_id: int,
    game_number: int,
    team1_score: int,
    team2_score: int,
    rally_data: str | None = None,
    db: Session = Depends(get_db),
):
    match = db.query(MatchModel).filter(MatchModel.id == match_id).first()
    if not match:
        raise HTTPException(status_code=404, detail="Match not found")

    game = next((g for g in match.games if g.game_number == game_number), None)
    if not game:
        raise HTTPException(status_code=404, detail="Game not found")

    game.team1_score = team1_score
    game.team2_score = team2_score
    if rally_data is not None:
        game.rally_data = rally_data
    db.commit()

    # Remember whether the match already had a winner BEFORE we recalc
    prev_winner_id = match.winner_team_id

    # 승자 판정
    match.winner_team_id = check_winner(match)

    # 점수 계산 + 대체출전 룰 적용
    pts = calculate_match_points(match)
    pts = apply_sub_rule(pts, match)
    match.team1_points, match.team2_points = pts
    match.score_summary = f"{match.team1_points}-{match.team2_points}"

    # 팀 누적 점수 업데이트 — only on the first transition to "has winner".
    # Without this guard, posting scores after match-end (or simply persisting
    # every point) would re-add this match's points each call.
    if match.winner_team_id and prev_winner_id is None:
        from app.models.team import Team as TeamModel
        team1 = db.query(TeamModel).filter(TeamModel.id == match.team1_id).first()
        team2 = db.query(TeamModel).filter(TeamModel.id == match.team2_id).first()
        if team1 and team2:
            team1.total_points = (team1.total_points or 0) + (match.team1_points or 0)
            team2.total_points = (team2.total_points or 0) + (match.team2_points or 0)

        # Referee bonus: each unique referee contributes +1 to their team's total.
        # Cap of "1 per referee per match" is enforced by deduplicating user_ids
        # across both the legacy single referee_id and the referees relation.
        ref_user_ids = set()
        if match.referee_id:
            ref_user_ids.add(match.referee_id)
        for mr in db.query(MatchReferee).filter(MatchReferee.match_id == match.id).all():
            if mr.user_id:
                ref_user_ids.add(mr.user_id)

        if ref_user_ids:
            ref_users = db.query(UserModel).filter(UserModel.id.in_(ref_user_ids)).all()
            bonus_by_team: dict[int, int] = {}
            for ru in ref_users:
                if ru.team_id is not None:
                    bonus_by_team[ru.team_id] = bonus_by_team.get(ru.team_id, 0) + 1
            for tid, bonus in bonus_by_team.items():
                t = db.query(TeamModel).filter(TeamModel.id == tid).first()
                if t:
                    t.total_points = (t.total_points or 0) + bonus

    db.commit()
    db.refresh(match)
    return match

@router.get("/{match_id}", response_model=MatchSchema)
def get_match(match_id: int, db: Session = Depends(get_db)):
    m = (
        db.query(MatchModel)
        .options(
            selectinload(MatchModel.games),
            selectinload(MatchModel.referees),
        )
        .filter(MatchModel.id == match_id)
        .first()
    )
    if not m:
        raise HTTPException(status_code=404, detail="Match not found")
    winner_id = _heal_winner(m, db)
    return MatchSchema(
        id=m.id,
        court=m.court,
        order=m.order,
        referee_id=m.referee_id,
        referee_ids=[mr.user_id for mr in (m.referees or [])],
        team1_id=m.team1_id,
        team2_id=m.team2_id,
        team1_player_id=m.team1_player_id,
        team2_player_id=m.team2_player_id,
        winner_team_id=winner_id,
        score_summary=m.score_summary,
        games=m.games,
    )


@router.put("/{match_id}", response_model=MatchSchema)
def update_match(match_id: int, payload: MatchUpdate, db: Session = Depends(get_db)):
    m = db.query(MatchModel).filter(MatchModel.id == match_id).first()
    if not m:
        raise HTTPException(status_code=404, detail="Match not found")

    # simple field updates
    for field in ["court", "order", "referee_id", "team1_id", "team2_id", "team1_player_id", "team2_player_id"]:
        val = getattr(payload, field, None)
        if val is not None:
            setattr(m, field, val)

    db.commit()
    db.refresh(m)

    # update multiple referees if provided
    if payload.referee_ids is not None:
        # clear current
        db.query(MatchReferee).filter(MatchReferee.match_id == m.id).delete()
        db.commit()
        for uid in payload.referee_ids:
            db.add(MatchReferee(match_id=m.id, user_id=uid))
        db.commit()
        db.refresh(m)

    return MatchSchema(
        id=m.id,
        court=m.court,
        order=m.order,
        referee_id=m.referee_id,
        referee_ids=[mr.user_id for mr in (m.referees or [])],
        team1_id=m.team1_id,
        team2_id=m.team2_id,
        team1_player_id=m.team1_player_id,
        team2_player_id=m.team2_player_id,
        winner_team_id=m.winner_team_id,
        score_summary=m.score_summary,
        games=m.games,
    )


@router.delete("/{match_id}")
def delete_match(match_id: int, db: Session = Depends(get_db)):
    m = db.query(MatchModel).filter(MatchModel.id == match_id).first()
    if not m:
        raise HTTPException(status_code=404, detail="Match not found")
    # delete associated game scores and referees first
    db.query(GameScoreModel).filter(GameScoreModel.match_id == match_id).delete()
    db.query(MatchReferee).filter(MatchReferee.match_id == match_id).delete()
    db.delete(m)
    db.commit()
    return {"status": "ok"}
