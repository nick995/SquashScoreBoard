import { useEffect, useMemo, useState } from "react";
import client from "../../api/client";

export default function AddUserToTeamForm({ teamId, onAdd }) {
  const [query, setQuery] = useState("");
  const [options, setOptions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedId, setSelectedId] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (!query.trim()) {
      setOptions([]);
      return;
    }
    const t = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await client.get(`/users/search/`, { params: { name: query } });
        setOptions(res.data);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }, 250);
    return () => clearTimeout(t);
  }, [query]);

  const handleAdd = async (e) => {
    e.preventDefault();
    setError("");
    if (!selectedId) { setError("Please select a user"); return; }
    try {
      await client.post(`/teams/${teamId}/add_user`, { user_id: Number(selectedId) });
      const user = options.find(o => o.id === Number(selectedId));
      if (user) onAdd(user);
      setSelectedId("");
      setQuery("");
      setOptions([]);
    } catch (err) {
      console.error(err);
      const msg = err?.response?.data?.detail || "Failed to add user to team";
      setError(String(msg));
    }
  };

  const optionViews = useMemo(() => options.map(o => ({
    id: o.id,
    label: `${o.name}${o.player_number ? ` #${o.player_number}` : ""}${o.team_id ? ` • team:${o.team_id}` : ""}`
  })), [options]);

  return (
    <div style={{marginTop:12}}>
      <div style={{fontWeight:600, marginBottom:8}}>Add Member</div>
      <form onSubmit={handleAdd} style={{display:'grid', gap:12, gridTemplateColumns:'1fr 1fr auto'}}>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search player by name"
          className="input"
        />
        <select
          className="select"
          value={selectedId}
          onChange={(e)=>setSelectedId(e.target.value)}
        >
          <option value="">{loading ? "Searching..." : "Select player"}</option>
          {optionViews.map(o => (
            <option key={o.id} value={o.id}>{o.label}</option>
          ))}
        </select>
        <button type="submit" className="btn btn-primary">Add to Team</button>
      </form>
      {error && <div className="muted" style={{color:'#ff6b6b', marginTop:8}}>{error}</div>}
      <div className="muted" style={{marginTop:6, fontSize:12}}>Search existing members by name, pick one, then Add to Team.</div>
    </div>
  );
}
