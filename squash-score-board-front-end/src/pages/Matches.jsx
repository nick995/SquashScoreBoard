import { useEffect, useMemo, useState } from "react";
import client from "../../api/client";
import { Link, useNavigate } from "react-router-dom";
import MatchCreateForm from "../components/MatchCreateForm";
import "./matches.css";

export default function Matches() {
  const [matches, setMatches] = useState([]);
  const [teams, setTeams] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all"); // all | live | completed
  const [showCreate, setShowCreate] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    Promise.all([
      client.get("/teams"),
      client.get("/users"),
      client.get("/matches"),
    ])
      .then(([t, u, m]) => {
        if (cancelled) return;
        setTeams(Array.isArray(t.data) ? t.data : []);
        setUsers(Array.isArray(u.data) ? u.data : []);
        setMatches(Array.isArray(m.data) ? m.data : []);
      })
      .catch((err) => {
        console.error(err);
        if (!cancelled) {
          setTeams([]);
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

  const teamName = (tid) =>
    teams.find((t) => Number(t.id) === Number(tid))?.name || `Team ${tid}`;
  const userById = (uid) => users.find((u) => Number(u.id) === Number(uid));

  const hasScore = (m) =>
    m.games && m.games.some((g) => (g.team1_score ?? 0) > 0 || (g.team2_score ?? 0) > 0);

  const getStatus = (m) => {
    if (m.winner_team_id) return "completed";
    if (hasScore(m)) return "live";
    return "pending";
  };

  const gameWins = (m) => {
    if (!m.games) return [0, 0];
    let w1 = 0, w2 = 0;
    for (const g of m.games) {
      if ((g.team1_score ?? 0) > (g.team2_score ?? 0) && (g.team1_score ?? 0) >= 11) w1++;
      else if ((g.team2_score ?? 0) > (g.team1_score ?? 0) && (g.team2_score ?? 0) >= 11) w2++;
    }
    return [w1, w2];
  };

  const filtered = useMemo(() => {
    const sorted = [...matches].sort((a, b) => b.id - a.id);
    if (filter === "all") return sorted;
    return sorted.filter((m) => getStatus(m) === filter);
  }, [matches, filter]);

  const counts = useMemo(() => {
    let live = 0, completed = 0, pending = 0;
    for (const m of matches) {
      const s = getStatus(m);
      if (s === "live") live++;
      else if (s === "completed") completed++;
      else pending++;
    }
    return { total: matches.length, live, completed, pending };
  }, [matches]);

  return (
    <div className="matches-page">
      <div className="matches-header">
        <div>
          <div className="kicker">Matches</div>
          <h1 className="gradient-text" style={{ margin: "8px 0 0" }}>All Matches</h1>
        </div>
        <div className="matches-stats">
          <span className="stat-pill"><strong>{counts.total}</strong> total</span>
          <span className="stat-pill"><strong>{counts.live}</strong> live</span>
          <span className="stat-pill"><strong>{counts.completed}</strong> completed</span>
          <span className="stat-pill"><strong>{counts.pending}</strong> pending</span>
        </div>
      </div>

      <div style={{ display: "flex", justifyContent: "flex-end" }}>
        <button
          type="button"
          className={`btn ${showCreate ? "" : "btn-primary"}`}
          style={{ width: "auto" }}
          onClick={() => setShowCreate((v) => !v)}
        >
          {showCreate ? "Cancel" : "+ New Match"}
        </button>
      </div>

      {showCreate && (
        <div className="card">
          <h2 style={{ marginTop: 0 }}>Create Match</h2>
          <MatchCreateForm
            onCreated={(m) => navigate(`/matches/${m.id}/scoreboard`)}
          />
        </div>
      )}

      <div className="matches-filter">
        <div className="seg-group" role="tablist">
          {["all", "live", "completed", "pending"].map((k) => (
            <button
              key={k}
              type="button"
              className={`seg ${filter === k ? "active" : ""}`}
              onClick={() => setFilter(k)}
            >
              {k[0].toUpperCase() + k.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="empty-state"><h3>Loading…</h3></div>
      ) : filtered.length === 0 ? (
        <div className="empty-state">
          <h3>No matches</h3>
          <p>{filter === "all" ? "No matches yet." : `No ${filter} matches.`}</p>
        </div>
      ) : (
        <div className="match-grid">
          {filtered.map((m) => {
            const status = getStatus(m);
            const u1 = userById(m.team1_player_id);
            const u2 = userById(m.team2_player_id);
            const [w1, w2] = gameWins(m);
            const winner1 = m.winner_team_id && m.winner_team_id === m.team1_id;
            const winner2 = m.winner_team_id && m.winner_team_id === m.team2_id;
            const cardCls = `match-card ${status === "completed" ? "is-completed" : ""} ${status === "live" ? "is-live" : ""}`;

            return (
              <article key={m.id} className={cardCls}>
                <div className="match-meta">
                  <div className="match-meta-left">
                    <span className="badge badge-pending">
                      {m.order ? `#${m.order}` : `#${m.id}`}
                    </span>
                    {m.court && (
                      <span className="badge badge-pending">{m.court}</span>
                    )}
                  </div>
                  {status === "live" && (
                    <span className="badge badge-live">
                      <span className="dot"></span> Live
                    </span>
                  )}
                  {status === "completed" && (
                    <span className="badge badge-done">Final</span>
                  )}
                  {status === "pending" && (
                    <span className="badge badge-pending">Scheduled</span>
                  )}
                </div>

                <div className="match-body">
                  <div className={`team-side left ${winner1 ? "is-winner" : ""} ${winner2 ? "is-loser" : ""}`}>
                    <div className="team-label">{teamName(m.team1_id)}</div>
                    <div className="player-name">
                      {u1 ? u1.name : `Team ${m.team1_id} #${m.order ?? "-"}`}
                    </div>
                    <div className="player-tier">
                      {u1 ? `Tier ${u1.player_number}` : "—"}
                    </div>
                  </div>

                  <div className="match-score">
                    {status === "pending" ? (
                      <span className="pending">vs</span>
                    ) : (
                      <>
                        <span className="vs">SCORE</span>
                        <span className="score">
                          <span className={`s1 ${winner1 ? "win" : winner2 ? "lose" : ""}`}>
                            {w1}
                          </span>
                          <span className="sep">–</span>
                          <span className={`s2 ${winner2 ? "win" : winner1 ? "lose" : ""}`}>
                            {w2}
                          </span>
                        </span>
                      </>
                    )}
                  </div>

                  <div className={`team-side right ${winner2 ? "is-winner" : ""} ${winner1 ? "is-loser" : ""}`}>
                    <div className="team-label">{teamName(m.team2_id)}</div>
                    <div className="player-name">
                      {u2 ? u2.name : `Team ${m.team2_id} #${m.order ?? "-"}`}
                    </div>
                    <div className="player-tier">
                      {u2 ? `Tier ${u2.player_number}` : "—"}
                    </div>
                  </div>
                </div>

                <div className="match-actions">
                  <Link
                    className="btn btn-primary btn-sm"
                    to={`/matches/${m.id}/scoreboard`}
                  >
                    {status === "completed" ? "View Score" : "Score"}
                  </Link>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
