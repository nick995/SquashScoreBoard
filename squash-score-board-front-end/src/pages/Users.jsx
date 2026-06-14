import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import client from "../../api/client";

export default function Users() {
  const [users, setUsers] = useState([]);
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    Promise.all([client.get("/users"), client.get("/matches")])
      .then(([uRes, mRes]) => {
        if (cancelled) return;
        setUsers(Array.isArray(uRes.data) ? uRes.data : []);
        setMatches(Array.isArray(mRes.data) ? mRes.data : []);
      })
      .catch((err) => {
        console.error(err);
        if (!cancelled) {
          setUsers([]);
          setMatches([]);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // Compute win/loss stats per user from finished matches (winner_team_id set)
  const statsByUserId = useMemo(() => {
    const stats = new Map();
    const bump = (uid, key) => {
      if (uid == null) return;
      const cur = stats.get(uid) || { wins: 0, losses: 0 };
      cur[key] += 1;
      stats.set(uid, cur);
    };
    for (const m of matches) {
      if (m.winner_team_id == null) continue;
      const t1Won = m.winner_team_id === m.team1_id;
      const t2Won = m.winner_team_id === m.team2_id;
      if (t1Won) {
        bump(m.team1_player_id, "wins");
        bump(m.team2_player_id, "losses");
      } else if (t2Won) {
        bump(m.team2_player_id, "wins");
        bump(m.team1_player_id, "losses");
      }
    }
    return stats;
  }, [matches]);

  const filtered = useMemo(() => {
    const list = q.trim()
      ? users.filter((u) =>
          u.name.toLowerCase().includes(q.trim().toLowerCase())
        )
      : users;
    return [...list].sort((a, b) => {
      const sa = statsByUserId.get(a.id) || { wins: 0, losses: 0 };
      const sb = statsByUserId.get(b.id) || { wins: 0, losses: 0 };
      const ratea = sa.wins + sa.losses ? sa.wins / (sa.wins + sa.losses) : -1;
      const rateb = sb.wins + sb.losses ? sb.wins / (sb.wins + sb.losses) : -1;
      if (rateb !== ratea) return rateb - ratea;
      return a.id - b.id;
    });
  }, [users, q, statsByUserId]);

  const formatRate = (s) => {
    const total = s.wins + s.losses;
    if (total === 0) return "—";
    return `${Math.round((s.wins / total) * 100)}%`;
  };

  return (
    <div className="grid">
      <div className="card">
        <div style={{ display: "flex", gap: 12, marginBottom: 12 }}>
          <input
            className="input"
            placeholder="Search by name"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>
        <h2 style={{ marginTop: 0 }}>Players & Win Rates</h2>
        {loading ? (
          <p className="muted">Loading…</p>
        ) : filtered.length === 0 ? (
          <p className="muted">No users.</p>
        ) : (
          <ul style={{ margin: 0, padding: 0, listStyle: "none" }}>
            {filtered.map((u) => {
              const s = statsByUserId.get(u.id) || { wins: 0, losses: 0 };
              const total = s.wins + s.losses;
              return (
                <li
                  key={u.id}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: 12,
                    padding: "10px 0",
                    borderBottom: "1px solid var(--border)",
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 600 }}>
                      <Link to={`/users/${u.id}`} className="link">{u.name}</Link>{" "}
                      <span className="muted">Tier {u.player_number}</span>
                    </div>
                    <div className="muted" style={{ fontSize: 13 }}>
                      {u.team_id ? `team: ${u.team_id}` : "no team"}
                      {u.email ? ` • ${u.email}` : ""}
                    </div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontWeight: 700 }}>{formatRate(s)}</div>
                    <div className="muted" style={{ fontSize: 12 }}>
                      {s.wins}W · {s.losses}L
                      {total === 0 ? " · no matches" : ""}
                    </div>
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
