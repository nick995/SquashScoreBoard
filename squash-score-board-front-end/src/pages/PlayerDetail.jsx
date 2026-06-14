import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import client from "../../api/client";

export default function PlayerDetail() {
  const { id } = useParams();
  const userId = Number(id);

  const [user, setUser] = useState(null);
  const [teams, setTeams] = useState([]);
  const [users, setUsers] = useState([]);
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    Promise.all([
      client.get(`/users/${userId}`),
      client.get("/teams"),
      client.get("/users"),
      client.get("/matches"),
    ])
      .then(([u, t, uAll, m]) => {
        if (cancelled) return;
        setUser(u.data);
        setTeams(Array.isArray(t.data) ? t.data : []);
        setUsers(Array.isArray(uAll.data) ? uAll.data : []);
        setMatches(Array.isArray(m.data) ? m.data : []);
      })
      .catch((err) => {
        console.error(err);
        if (!cancelled) {
          setUser(null);
          setMatches([]);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [userId]);

  const teamName = (tid) =>
    teams.find((t) => Number(t.id) === Number(tid))?.name || `Team ${tid}`;
  const userById = (uid) => users.find((u) => Number(u.id) === Number(uid));

  // Matches this player participated in (as a player, not just referee)
  const playerMatches = useMemo(
    () =>
      matches.filter(
        (m) =>
          Number(m.team1_player_id) === userId ||
          Number(m.team2_player_id) === userId
      ),
    [matches, userId]
  );

  const stats = useMemo(() => {
    let wins = 0,
      losses = 0,
      pending = 0;
    for (const m of playerMatches) {
      if (m.winner_team_id == null) {
        pending++;
        continue;
      }
      const side =
        Number(m.team1_player_id) === userId
          ? "team1"
          : Number(m.team2_player_id) === userId
          ? "team2"
          : null;
      if (!side) continue;
      const wonByTeam1 = m.winner_team_id === m.team1_id;
      const playerWon =
        (side === "team1" && wonByTeam1) || (side === "team2" && !wonByTeam1);
      if (playerWon) wins++;
      else losses++;
    }
    const total = wins + losses;
    return {
      wins,
      losses,
      pending,
      total,
      rate: total ? Math.round((wins / total) * 100) : null,
    };
  }, [playerMatches, userId]);

  const sortedMatches = useMemo(
    () => [...playerMatches].sort((a, b) => b.id - a.id),
    [playerMatches]
  );

  if (loading) {
    return <div className="card">Loading…</div>;
  }
  if (!user) {
    return (
      <div className="card">
        <p className="muted">Player not found.</p>
        <Link to="/users" className="btn">← Users</Link>
      </div>
    );
  }

  return (
    <div className="grid">
      <div className="card">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <h2 style={{ margin: 0 }}>{user.name}</h2>
            <div className="muted" style={{ marginTop: 6, fontSize: 13 }}>
              Tier {user.player_number}
              {user.team_id ? ` • ${teamName(user.team_id)}` : " • no team"}
              {user.email ? ` • ${user.email}` : ""}
            </div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: 32, fontWeight: 800 }}>
              {stats.rate == null ? "—" : `${stats.rate}%`}
            </div>
            <div className="muted" style={{ fontSize: 12 }}>
              {stats.wins}W · {stats.losses}L
              {stats.pending ? ` · ${stats.pending} pending` : ""}
            </div>
          </div>
        </div>
      </div>

      <div className="card">
        <h2 style={{ marginTop: 0 }}>Match History</h2>
        {sortedMatches.length === 0 ? (
          <p className="muted">No matches yet.</p>
        ) : (
          <ul style={{ margin: 0, padding: 0, listStyle: "none" }}>
            {sortedMatches.map((m) => {
              const playerOnTeam1 = Number(m.team1_player_id) === userId;
              const oppId = playerOnTeam1 ? m.team2_player_id : m.team1_player_id;
              const oppUser = userById(oppId);
              const myTeam = playerOnTeam1 ? m.team1_id : m.team2_id;
              const oppTeam = playerOnTeam1 ? m.team2_id : m.team1_id;

              let result = "pending";
              if (m.winner_team_id != null) {
                const won =
                  (playerOnTeam1 && m.winner_team_id === m.team1_id) ||
                  (!playerOnTeam1 && m.winner_team_id === m.team2_id);
                result = won ? "win" : "loss";
              }
              const badge = {
                win: { text: "Win", color: "#2fd7d6", bg: "rgba(47,215,214,0.18)" },
                loss: { text: "Loss", color: "#ff7a7a", bg: "rgba(255,122,122,0.16)" },
                pending: { text: "Pending", color: "var(--muted)", bg: "rgba(255,255,255,0.06)" },
              }[result];

              return (
                <li
                  key={m.id}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "12px 0",
                    gap: 12,
                    borderBottom: "1px solid var(--border)",
                  }}
                >
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontWeight: 600 }}>
                      vs{" "}
                      <Link
                        to={oppId ? `/users/${oppId}` : "#"}
                        className="link"
                      >
                        {oppUser ? oppUser.name : `Team ${oppTeam} player`}
                      </Link>
                    </div>
                    <div className="muted" style={{ fontSize: 13 }}>
                      Match #{m.id}
                      {m.court ? ` • ${m.court}` : ""}
                      {` • ${teamName(myTeam)} vs ${teamName(oppTeam)}`}
                      {m.score_summary ? ` • ${m.score_summary}` : ""}
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                    <span
                      style={{
                        padding: "3px 10px",
                        borderRadius: 999,
                        fontSize: 12,
                        fontWeight: 700,
                        color: badge.color,
                        background: badge.bg,
                        border: "1px solid var(--border)",
                      }}
                    >
                      {badge.text}
                    </span>
                    <Link className="btn btn-sm" to={`/matches/${m.id}`}>
                      Details
                    </Link>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
