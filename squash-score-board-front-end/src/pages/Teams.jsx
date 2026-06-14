import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import client from "../../api/client";

export default function Teams() {
  const [teams, setTeams] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    client
      .get("/teams")
      .then((res) => {
        if (cancelled) return;
        setTeams(Array.isArray(res.data) ? res.data : []);
      })
      .catch((err) => {
        console.error(err);
        if (!cancelled) setTeams([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const rankings = [...teams].sort(
    (a, b) => (b.total_points ?? 0) - (a.total_points ?? 0)
  );
  const sortedTeams = [...teams].sort((a, b) => a.name.localeCompare(b.name));

  return (
    <div className="grid">
      <div className="card">
        <h2 style={{ marginTop: 0 }}>Team Rankings</h2>
        {loading ? (
          <p className="muted">Loading…</p>
        ) : rankings.length === 0 ? (
          <p className="muted">No teams yet.</p>
        ) : (
          <ol style={{ margin: 0, paddingLeft: 20 }}>
            {rankings.map((t, i) => (
              <li
                key={t.id}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "baseline",
                  padding: "8px 0",
                  borderBottom: "1px solid var(--border)",
                }}
              >
                <Link
                  to={`/teams/${t.id}`}
                  className="link"
                  style={{ fontWeight: i < 3 ? 700 : 500 }}
                >
                  {t.name}
                </Link>
                <span className="muted" style={{ fontSize: 14 }}>
                  {t.total_points ?? 0} pts
                </span>
              </li>
            ))}
          </ol>
        )}
      </div>

      <div className="card">
        <h2 style={{ marginTop: 0 }}>All Teams</h2>
        {loading ? (
          <p className="muted">Loading…</p>
        ) : sortedTeams.length === 0 ? (
          <p className="muted">No teams yet.</p>
        ) : (
          <ul className="grid grid-2" style={{ listStyle: "none", padding: 0 }}>
            {sortedTeams.map((team) => (
              <li
                key={team.id}
                className="card"
                style={{
                  display: "flex",
                  gap: 12,
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "14px 16px",
                }}
              >
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontWeight: 600 }}>{team.name}</div>
                  <div className="muted" style={{ fontSize: 12, marginTop: 2 }}>
                    {team.total_points ?? 0} pts
                  </div>
                </div>
                <Link
                  to={`/teams/${team.id}`}
                  className="btn btn-sm"
                  style={{ flexShrink: 0, width: "auto" }}
                  aria-label={`View ${team.name}`}
                >
                  View →
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
