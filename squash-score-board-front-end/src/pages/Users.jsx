import { useEffect, useMemo, useState } from "react";
import client from "../../api/client";

export default function Users() {
  const [users, setUsers] = useState([]);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [playerNumber, setPlayerNumber] = useState(1);
  const [playerPhone, setPlayerPhone] = useState("");
  const [teamId, setTeamId] = useState("");
  const [q, setQ] = useState("");
  const [searching, setSearching] = useState(false);

  const loadUsers = async () => {
    const res = await client.get("/users");
    setUsers(res.data);
  };

  useEffect(() => {
    loadUsers().catch(console.error);
  }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
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
      alert("Failed to create user");
    }
  };

  const handleSearch = async (e) => {
    e.preventDefault();
    setSearching(true);
    try {
      if (!q.trim()) {
        await loadUsers();
      } else {
        const res = await client.get(`/users/search/`, { params: { name: q } });
        setUsers(res.data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSearching(false);
    }
  };

  const sorted = useMemo(
    () => [...users].sort((a, b) => a.id - b.id),
    [users]
  );

  return (
    <div className="grid">
      <div className="card">
        <h2>Create User</h2>
        <form onSubmit={handleCreate} className="form-row">
          <input className="input" placeholder="Name" value={name} onChange={(e)=>setName(e.target.value)} required />
          <input className="input" placeholder="Email (optional)" value={email} onChange={(e)=>setEmail(e.target.value)} />
          <input className="input" type="number" min={1} max={4} placeholder="Player Number (1-4)" value={playerNumber} onChange={(e)=>setPlayerNumber(e.target.value)} required />
          <input className="input" placeholder="Phone (optional)" value={playerPhone} onChange={(e)=>setPlayerPhone(e.target.value)} />
          <input className="input" type="number" placeholder="Team ID (optional)" value={teamId} onChange={(e)=>setTeamId(e.target.value)} />
          <div>
            <button className="btn btn-primary">Add User</button>
          </div>
        </form>
      </div>

      <div className="card">
        <form onSubmit={handleSearch} style={{display:'flex', gap:12, marginBottom:12}}>
          <input className="input" placeholder="Search by name" value={q} onChange={(e)=>setQ(e.target.value)} />
          <button className="btn" disabled={searching}>{searching ? "Searching..." : "Search"}</button>
        </form>
        <h2>Users</h2>
        {sorted.length === 0 ? (
          <p className="muted">No users.</p>
        ) : (
          <ul style={{margin:0, padding:0, listStyle:'none'}}>
            {sorted.map(u => (
              <li key={u.id} style={{display:'flex', alignItems:'baseline', justifyContent:'space-between', padding:'10px 0', borderBottom:'1px solid var(--border)'}}>
                <div>
                  <div style={{fontWeight:600}}>{u.name} <span className="muted">#{u.player_number}</span></div>
                  <div className="muted" style={{fontSize:13}}>id: {u.id}{u.team_id ? ` • team: ${u.team_id}` : ""}</div>
                </div>
                {u.email && <div className="muted" style={{fontSize:13}}>{u.email}</div>}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
