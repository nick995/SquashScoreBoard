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
    required_order = match.order  # 경기 순서 (1번/2번/3번)
    team1_num = match.team1_player.player_number
    team2_num = match.team2_player.player_number

    t1, t2 = points
    if team1_num > required_order:
        t1 = t1 // 2
    if team2_num > required_order:
        t2 = t2 // 2
    return (t1, t2)
