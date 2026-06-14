import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import client from "../../api/client";
import "./match-detail.css";

export default function MatchDetail() {
  const { id } = useParams();
  const matchId = Number(id);
  const [match, setMatch] = useState(null);
  const [users, setUsers] = useState([]);
  const [teams, setTeams] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    Promise.all([
      client.get(`/matches/${matchId}`),
      client.get(`/users`).catch(() => ({ data: [] })),
      client.get(`/teams`).catch(() => ({ data: [] })),
    ])
      .then(([m, u, t]) => {
        if (cancelled) return;
        setMatch(m.data);
        setUsers(u.data || []);
        setTeams(t.data || []);
      })
      .catch(console.error)
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [matchId]);

  const teamName = (tid) =>
    teams.find((t) => Number(t.id) === Number(tid))?.name || `Team ${tid}`;
  const userById = (uid) => users.find((u) => Number(u.id) === Number(uid));
  const userLabel = (uid) => {
    const u = userById(uid);
    return u ? `${u.name} (Tier ${u.player_number})` : uid ? `#${uid}` : "—";
  };

  if (loading || !match) return <div className="card">Loading…</div>;

  const gamesByNumber = (g) =>
    (match.games || []).find((x) => x.game_number === g) || {
      team1_score: 0,
      team2_score: 0,
    };

  return (
    <div className="grid match-detail-page">
      <div className="card">
        <h2 style={{ marginTop: 0 }}>
          {teamName(match.team1_id)} vs {teamName(match.team2_id)}
          {match.court ? ` • ${match.court}` : ""}
        </h2>
        <div className="muted" style={{ marginBottom: 8 }}>
          Order: {match.order ?? "-"} • Players:{" "}
          {userLabel(match.team1_player_id)} vs {userLabel(match.team2_player_id)}
        </div>
        <div className="muted" style={{ marginBottom: 16 }}>
          Referees:{" "}
          {match.referee_ids && match.referee_ids.length
            ? match.referee_ids
                .map((uid) => userById(uid)?.name || `#${uid}`)
                .join(", ")
            : "-"}
        </div>

        <div className="card md-scroll md-table-wrap">
          <table className="md-table">
            <thead>
              <tr>
                <th>Team</th>
                {[1, 2, 3, 4, 5].map((g) => (
                  <th key={g}>G{g}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {[
                { id: match.team1_id, key: "t1", label: teamName(match.team1_id) },
                { id: match.team2_id, key: "t2", label: teamName(match.team2_id) },
              ].map((row) => (
                <tr key={row.key}>
                  <td className="md-team">{row.label}</td>
                  {[1, 2, 3, 4, 5].map((g) => {
                    const game = gamesByNumber(g);
                    const val =
                      row.key === "t1"
                        ? game.team1_score ?? 0
                        : game.team2_score ?? 0;
                    return (
                      <td key={g} style={{ textAlign: "center", fontVariantNumeric: "tabular-nums" }}>
                        {val}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div style={{ marginTop: 12, fontWeight: 700 }}>
          Summary: {match.score_summary ?? "-"}
          {match.winner_team_id && (
            <span className="tag" style={{ marginLeft: 8 }}>
              Winner: {teamName(match.winner_team_id)}
            </span>
          )}
        </div>
        <div style={{ marginTop: 12 }}>
          <Link className="btn btn-primary" to={`/matches/${matchId}/scoreboard`}>
            Open Scoreboard
          </Link>
        </div>
      </div>
    </div>
  );
}
