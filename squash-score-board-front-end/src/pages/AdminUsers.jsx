import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import client from "../../api/client";

export default function AdminUsers() {
  const [users, setUsers] = useState([]);
  const [teams, setTeams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [playerNumber, setPlayerNumber] = useState(1);
  const [playerPhone, setPlayerPhone] = useState("");
  const [teamId, setTeamId] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const [u, t] = await Promise.all([
        client.get("/users"),
        client.get("/teams"),
      ]);
      setUsers(Array.isArray(u.data) ? u.data : []);
      setTeams(Array.isArray(t.data) ? t.data : []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load().catch(console.error);
  }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const payload = {
        name: name.trim(),
        email: email || null,
        player_number: Number(playerNumber),
        player_phone_number: playerPhone || null,
        team_id: teamId ? Number(teamId) : null,
      };
      const res = await client.post("/users/", payload);
      setUsers((prev) => [...prev, res.data]);
      setName("");
      setEmail("");
      setPlayerNumber(1);
      setPlayerPhone("");
      setTeamId("");
    } catch (err) {
      console.error(err);
      alert(err?.response?.data?.detail || "Failed to create user");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id, name) => {
    if (!confirm(`Delete user "${name}"?`)) return;
    try {
      await client.delete(`/users/${id}`);
      setUsers((prev) => prev.filter((u) => u.id !== id));
    } catch (err) {
      console.error(err);
      alert(err?.response?.data?.detail || "Failed to delete user");
    }
  };

  const handleReassign = async (user, newTeamId) => {
    try {
      const team_id = newTeamId === "" ? 0 : Number(newTeamId); // 0 clears assignment per API
      const res = await client.put(`/users/${user.id}`, { team_id });
      setUsers((prev) => prev.map((u) => (u.id === user.id ? res.data : u)));
    } catch (err) {
      console.error(err);
      alert(err?.response?.data?.detail || "Failed to update team");
    }
  };

  const sorted = useMemo(
    () =>
      [...users].sort((a, b) => {
        // Show unassigned users first so they're easy to fix
        const aUn = a.team_id ? 1 : 0;
        const bUn = b.team_id ? 1 : 0;
        if (aUn !== bUn) return aUn - bUn;
        return a.id - b.id;
      }),
    [users]
  );

  const unassignedCount = users.filter((u) => !u.team_id).length;
  const MAX_TEAM_PLAYERS = 4;
  const countOnTeam = (tid) =>
    users.filter((u) => Number(u.team_id) === Number(tid)).length;

  return (
    <div className="grid">
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <Link to="/admin" className="btn btn-ghost">← Admin</Link>
        <h1 className="gradient-text" style={{ margin: 0 }}>Manage Users</h1>
      </div>

      <div className="card">
        <h2 style={{ marginTop: 0 }}>Create User</h2>
        <form onSubmit={handleCreate} className="form-row">
          <input className="input" placeholder="Name" value={name} onChange={(e) => setName(e.target.value)} required />
          <input className="input" placeholder="Email (optional)" value={email} onChange={(e) => setEmail(e.target.value)} />
          <select className="select" value={playerNumber} onChange={(e) => setPlayerNumber(e.target.value)} required>
            <option value={1}>Tier 1</option>
            <option value={2}>Tier 2</option>
            <option value={3}>Tier 3</option>
            <option value={4}>Tier 4</option>
          </select>
          <input className="input" placeholder="Phone (optional)" value={playerPhone} onChange={(e) => setPlayerPhone(e.target.value)} />
          <select className="select" value={teamId} onChange={(e) => setTeamId(e.target.value)}>
            <option value="">No team</option>
            {teams.map((t) => {
              const full = countOnTeam(t.id) >= MAX_TEAM_PLAYERS;
              return (
                <option key={t.id} value={t.id} disabled={full}>
                  {t.name} ({countOnTeam(t.id)}/{MAX_TEAM_PLAYERS}){full ? " — full" : ""}
                </option>
              );
            })}
          </select>
          <div>
            <button className="btn btn-primary" disabled={submitting}>
              {submitting ? "Creating…" : "Add User"}
            </button>
          </div>
        </form>
      </div>

      <div className="card">
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "baseline",
          }}
        >
          <h2 style={{ marginTop: 0 }}>All Users</h2>
          {unassignedCount > 0 && (
            <span className="muted" style={{ fontSize: 13, color: "#e0a020" }}>
              {unassignedCount} unassigned
            </span>
          )}
        </div>
        {loading ? (
          <p className="muted">Loading…</p>
        ) : sorted.length === 0 ? (
          <p className="muted">No users.</p>
        ) : (
          <ul style={{ margin: 0, padding: 0, listStyle: "none" }}>
            {sorted.map((u) => {
              const unassigned = !u.team_id;
              return (
                <li
                  key={u.id}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "10px 0",
                    gap: 12,
                    borderBottom: "1px solid var(--border)",
                    background: unassigned ? "rgba(224,160,32,0.06)" : undefined,
                  }}
                >
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontWeight: 600 }}>
                      {u.name}{" "}
                      <span className="muted">Tier {u.player_number}</span>
                      {unassigned && (
                        <span
                          style={{
                            marginLeft: 8,
                            fontSize: 11,
                            padding: "2px 6px",
                            borderRadius: 4,
                            background: "rgba(224,160,32,0.2)",
                            color: "#e0a020",
                          }}
                        >
                          no team
                        </span>
                      )}
                    </div>
                    <div className="muted" style={{ fontSize: 13 }}>
                      id: {u.id}
                      {u.email ? ` • ${u.email}` : ""}
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                    <select
                      className="select"
                      value={u.team_id ?? ""}
                      onChange={(e) => handleReassign(u, e.target.value)}
                      title="Change team"
                    >
                      <option value="">— no team —</option>
                      {teams.map((t) => {
                        const isCurrent = Number(u.team_id) === Number(t.id);
                        const full = !isCurrent && countOnTeam(t.id) >= MAX_TEAM_PLAYERS;
                        return (
                          <option key={t.id} value={t.id} disabled={full}>
                            {t.name} ({countOnTeam(t.id)}/{MAX_TEAM_PLAYERS}){full ? " — full" : ""}
                          </option>
                        );
                      })}
                    </select>
                    <button
                      className="btn"
                      onClick={() => handleDelete(u.id, u.name)}
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
