import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import client from "../../api/client";

const MAX_TEAM_PLAYERS = 4;

export default function TeamDetail({ teamId }) {
  const [team, setTeam] = useState(null);

  useEffect(() => {
    let cancelled = false;
    client
      .get(`/teams/${teamId}`)
      .then((res) => {
        if (!cancelled) setTeam(res.data);
      })
      .catch((e) => console.error(e));
    return () => {
      cancelled = true;
    };
  }, [teamId]);

  if (!team) return <div className="card">Loading...</div>;

  const members = [...(team.members || [])].sort(
    (a, b) => (a.player_number ?? 99) - (b.player_number ?? 99)
  );

  return (
    <div className="grid">
      <div className="card">
        <h2 style={{ marginBottom: 6 }}>{team.name}</h2>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <span className="tag">Team #{team.id}</span>
          <span className="tag">{team.total_points ?? 0} pts</span>
          <span className="tag">
            {members.length} / {MAX_TEAM_PLAYERS} players
          </span>
        </div>
      </div>

      <div className="card">
        <h2 style={{ marginTop: 0 }}>Members</h2>
        {members.length === 0 ? (
          <p className="muted">No members yet.</p>
        ) : (
          <ul style={{ margin: 0, padding: 0, listStyle: "none" }}>
            {members.map((user) => (
              <li
                key={user.id}
                style={{
                  display: "flex",
                  alignItems: "baseline",
                  justifyContent: "space-between",
                  padding: "10px 0",
                  borderBottom: "1px solid var(--border)",
                }}
              >
                <Link
                  to={`/users/${user.id}`}
                  className="link"
                  style={{ fontWeight: 600 }}
                >
                  {user.name}
                </Link>
                <div className="muted">Tier {user.player_number}</div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
