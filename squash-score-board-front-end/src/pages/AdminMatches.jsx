import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import client from "../../api/client";
import MatchCreateForm from "../components/MatchCreateForm";
import "./matches.css";

export default function AdminMatches() {
  const [matches, setMatches] = useState([]);
  const [teams, setTeams] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const load = async () => {
    setLoading(true);
    try {
      const [t, u, m] = await Promise.all([
        client.get("/teams"),
        client.get("/users"),
        client.get("/matches"),
      ]);
      setTeams(Array.isArray(t.data) ? t.data : []);
      setUsers(Array.isArray(u.data) ? u.data : []);
      setMatches(Array.isArray(m.data) ? m.data : []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load().catch(console.error);
  }, []);

  const teamName = (tid) =>
    teams.find((t) => Number(t.id) === Number(tid))?.name || `Team ${tid}`;
  const userById = (uid) => users.find((u) => Number(u.id) === Number(uid));
  const userLabel = (uid, fallbackTeamId, order) => {
    const u = userById(uid);
    if (u) return `${u.name} Tier ${u.player_number}`;
    return `${teamName(fallbackTeamId)} #${order ?? "-"}`;
  };

  const handleDelete = async (id) => {
    if (!confirm(`Delete match #${id}?`)) return;
    try {
      await client.delete(`/matches/${id}`);
      setMatches((prev) => prev.filter((m) => m.id !== id));
    } catch (err) {
      console.error(err);
      alert(err?.response?.data?.detail || "Failed to delete match");
    }
  };

  const recent = useMemo(
    () => [...matches].sort((a, b) => b.id - a.id),
    [matches]
  );

  return (
    <div className="grid matches-page">
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <Link to="/admin" className="btn btn-ghost">← Admin</Link>
        <h1 className="gradient-text" style={{ margin: 0 }}>Manage Matches</h1>
      </div>

      <div className="card">
        <h2 style={{ marginTop: 0 }}>Create Match</h2>
        <MatchCreateForm
          onCreated={(m) => {
            setMatches((prev) => [m, ...prev]);
            navigate(`/matches/${m.id}/scoreboard`);
          }}
        />
      </div>

      <div className="card">
        <h2 style={{ marginTop: 0 }}>All Matches</h2>
        {loading ? (
          <p className="muted">Loading…</p>
        ) : recent.length === 0 ? (
          <p className="muted">No matches yet.</p>
        ) : (
          <ul style={{ margin: 0, padding: 0, listStyle: "none" }}>
            {recent.map((m) => (
              <li key={m.id} className="recent-row">
                <div className="recent-main">
                  <div className="recent-title" style={{ fontWeight: 600 }}>
                    #{m.order ?? "-"} {userLabel(m.team1_player_id, m.team1_id, m.order)} vs {userLabel(m.team2_player_id, m.team2_id, m.order)}
                  </div>
                  <div className="muted">
                    Match #{m.id} {m.court ? `• ${m.court}` : ""} • {teamName(m.team1_id)} vs {teamName(m.team2_id)} {m.score_summary ? `• ${m.score_summary}` : ""}
                  </div>
                </div>
                <div className="recent-actions">
                  <Link className="btn btn-primary" to={`/matches/${m.id}/scoreboard`}>
                    {m.winner_team_id ? "View Score" : "Score"}
                  </Link>
                  <button className="btn" onClick={() => handleDelete(m.id)} style={{ color: "#ff6b6b" }}>Delete</button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
