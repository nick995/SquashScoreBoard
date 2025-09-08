def check_winner(match):
    team1_wins = sum(1 for g in match.games if g.team1_score >= 11 and g.team1_score - g.team2_score >= 2)
    team2_wins = sum(1 for g in match.games if g.team2_score >= 11 and g.team2_score - g.team1_score >= 2)

    if team1_wins >= 3:
        return match.team1_id
    elif team2_wins >= 3:
        return match.team2_id
    return None

def calculate_match_points(match):
    team1_games = sum(1 for g in match.games if g.team1_score > g.team2_score and abs(g.team1_score-g.team2_score) >= 2)
    team2_games = sum(1 for g in match.games if g.team2_score > g.team1_score and abs(g.team2_score-g.team1_score) >= 2)

    if team1_games == 3:
        diff = team1_games - team2_games
        return {3:(5,0), 2:(4,1), 1:(3,2)}.get(diff, (0,0))
    elif team2_games == 3:
        diff = team2_games - team1_games
        return {3:(0,5), 2:(1,4), 1:(2,3)}.get(diff, (0,0))
    return (0,0)

def apply_sub_rule(points, match):
    """
    Apply substitution and lineup-order adjustments to match points.

    Rules:
    - If a side fields a player from a different team (cross-team substitute),
      that side's points are halved.
    - Additionally, if a side's player_number is higher than the required order
      (i.e., a lower-skilled player substituted up within the same team),
      that side's points are halved.
    """
    required_order = match.order
    t1_player = getattr(match, "team1_player", None)
    t2_player = getattr(match, "team2_player", None)

    t1_num = getattr(t1_player, "player_number", None)
    t2_num = getattr(t2_player, "player_number", None)

    t1_team = getattr(t1_player, "team_id", None)
    t2_team = getattr(t2_player, "team_id", None)

    t1, t2 = points

    # Cross-team substitution halves that side's points
    if t1_player and t1_team is not None and t1_team != getattr(match, "team1_id", None):
        t1 = t1 // 2
    if t2_player and t2_team is not None and t2_team != getattr(match, "team2_id", None):
        t2 = t2 // 2

    # Same-team but out-of-order (player_number > required order)
    if t1_num and required_order and t1_num > required_order:
        t1 = t1 // 2
    if t2_num and required_order and t2_num > required_order:
        t2 = t2 // 2

    return (t1, t2)
