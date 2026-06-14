import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import client from "../../api/client";

export default function AdminTeams() {
  const [teams, setTeams] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [teamName, setTeamName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [addTeamId, setAddTeamId] = useState("");
  const [userQ, setUserQ] = useState("");

  const load = async () => {
    setLoading(true);
    try {
      const [t, u] = await Promise.all([
        client.get("/teams"),
        client.get("/users"),
      ]);
      setTeams(Array.isArray(t.data) ? t.data : []);
      setUsers(Array.isArray(u.data) ? u.data : []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load().catch(console.error);
  }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!teamName.trim()) return;
    setSubmitting(true);
    try {
      const res = await client.post("/teams/", { name: teamName.trim() });
      setTeams((prev) => [...prev, res.data]);
      setTeamName("");
    } catch (err) {
      console.error(err);
      alert(err?.response?.data?.detail || "Failed to create team");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id, name) => {
    if (!confirm(`Delete team "${name}"? (Must have no members.)`)) return;
    try {
      await client.delete(`/teams/${id}`);
      setTeams((prev) => prev.filter((t) => t.id !== id));
    } catch (err) {
      console.error(err);
      alert(err?.response?.data?.detail || "Failed to delete team");
    }
  };

  const handleAddMember = async (userId) => {
    if (!addTeamId) {
      alert("Pick a team first");
      return;
    }
    try {
      await client.post(`/teams/${addTeamId}/add_user`, {
        user_id: Number(userId),
      });
      await load();
      setUserQ("");
    } catch (err) {
      console.error(err);
      alert(err?.response?.data?.detail || "Failed to add user to team");
    }
  };

  const sorted = useMemo(
    () => [...teams].sort((a, b) => a.name.localeCompare(b.name)),
    [teams]
  );

  const unassigned = users.filter((u) => !u.team_id);
  const matchingUsers = userQ.trim()
    ? unassigned.filter((u) =>
        u.name.toLowerCase().includes(userQ.trim().toLowerCase())
      )
    : unassigned;

  const MAX_TEAM_PLAYERS = 4;
  const countOnTeam = (tid) =>
    users.filter((u) => Number(u.team_id) === Number(tid)).length;
  const isFull = (tid) => countOnTeam(tid) >= MAX_TEAM_PLAYERS;

  return (
    <div className="grid">
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <Link to="/admin" className="btn btn-ghost">← Admin</Link>
        <h1 className="gradient-text" style={{ margin: 0 }}>Manage Teams</h1>
      </div>

      <div className="card">
        <h2 style={{ marginTop: 0 }}>Create Team</h2>
        <form onSubmit={handleCreate} className="form-row">
          <input
            className="input"
            placeholder="Team name"
            value={teamName}
            onChange={(e) => setTeamName(e.target.value)}
            required
          />
          <div>
            <button className="btn btn-primary" disabled={submitting}>
              {submitting ? "Creating…" : "Add Team"}
            </button>
          </div>
        </form>
      </div>

      <div className="card">
        <h2 style={{ marginTop: 0 }}>Add Member to Team</h2>
        <div className="form-row">
          <select
            className="select"
            value={addTeamId}
            onChange={(e) => setAddTeamId(e.target.value)}
          >
            <option value="">Select team</option>
            {teams.map((t) => (
              <option key={t.id} value={t.id} disabled={isFull(t.id)}>
                {t.name} ({countOnTeam(t.id)}/{MAX_TEAM_PLAYERS})
                {isFull(t.id) ? " — full" : ""}
              </option>
            ))}
          </select>
          <input
            className="input"
            placeholder="Search user by name"
            value={userQ}
            onChange={(e) => setUserQ(e.target.value)}
            disabled={!addTeamId}
          />
        </div>
        {!addTeamId ? (
          <p className="muted" style={{ marginTop: 8, fontSize: 13 }}>
            Pick a team first to add members.
          </p>
        ) : unassigned.length === 0 ? (
          <p className="muted" style={{ marginTop: 8, fontSize: 13 }}>
            All users are already assigned to a team.
          </p>
        ) : matchingUsers.length === 0 ? (
          <p className="muted" style={{ marginTop: 8, fontSize: 13 }}>
            No unassigned users match "{userQ}".
          </p>
        ) : (
          <ul
            style={{
              margin: "8px 0 0",
              padding: 0,
              listStyle: "none",
              maxHeight: 240,
              overflowY: "auto",
              border: "1px solid var(--border)",
              borderRadius: 6,
            }}
          >
            {matchingUsers.map((u) => (
              <li
                key={u.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "8px 12px",
                  borderBottom: "1px solid var(--border)",
                }}
              >
                <div>
                  <span style={{ fontWeight: 600 }}>{u.name}</span>{" "}
                  <span className="muted" style={{ fontSize: 13 }}>
                    Tier {u.player_number}
                  </span>
                </div>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={() => handleAddMember(u.id)}
                >
                  Add
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="card">
        <h2 style={{ marginTop: 0 }}>All Teams</h2>
        {loading ? (
          <p className="muted">Loading…</p>
        ) : sorted.length === 0 ? (
          <p className="muted">No teams.</p>
        ) : (
          <ul style={{ margin: 0, padding: 0, listStyle: "none" }}>
            {sorted.map((t) => {
              const members = users.filter(
                (u) => Number(u.team_id) === Number(t.id)
              );
              return (
                <li
                  key={t.id}
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
                      {t.name}{" "}
                      <span className="muted">id {t.id}</span>
                    </div>
                    <div className="muted" style={{ fontSize: 13 }}>
                      {members.length}/{MAX_TEAM_PLAYERS} player{members.length === 1 ? "" : "s"}
                      {" • "}
                      {t.total_points ?? 0} pts
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 8 }}>
                    <Link to={`/teams/${t.id}`} className="btn">View</Link>
                    <button
                      className="btn"
                      onClick={() => handleDelete(t.id, t.name)}
                      style={{ color: "#ff6b6b" }}
                    >
                      Delete
                    </button>
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
