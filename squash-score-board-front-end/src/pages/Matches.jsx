import { useEffect, useMemo, useState } from "react";
import client from "../../api/client";
import { Link, useNavigate } from "react-router-dom";
import "./matches.css"; 

export default function Matches() {
  const [matches, setMatches] = useState([]);
  const [teams, setTeams] = useState([]);
  const [users, setUsers] = useState([]);
  const [form, setForm] = useState({ court: "", order: 1, referee_ids: [], team1_id: "", team2_id: "", team1_player_id: "", team2_player_id: "" });
  const [refQ, setRefQ] = useState("");
  const [refOptions, setRefOptions] = useState([]);
  const [refLoading, setRefLoading] = useState(false);
  const navigate = useNavigate();
  const [allowSub1, setAllowSub1] = useState(false);
  const [allowSub2, setAllowSub2] = useState(false);

  const load = async () => {
    // Load endpoints independently so one failure doesn't block others
    try {
      const t = await client.get("/teams");
      setTeams(Array.isArray(t.data) ? t.data : []);
    } catch (e) {
      console.error("Failed to load teams", e);
      setTeams([]);
    }
    try {
      const u = await client.get("/users");
      setUsers(Array.isArray(u.data) ? u.data : []);
    } catch (e) {
      console.error("Failed to load users", e);
      setUsers([]);
    }
    try {
      const m = await client.get("/matches");
      setMatches(Array.isArray(m.data) ? m.data : []);
    } catch (e) {
      console.warn("Matches endpoint not ready; continuing", e?.response?.status);
      setMatches([]);
    }
  };

  useEffect(() => {
    load().catch(console.error);
  }, []);

  // Pairing generator removed

  // Referee search by name
  useEffect(() => {
    if (!refQ.trim()) { setRefOptions([]); return; }
    const t = setTimeout(async () => {
      setRefLoading(true);
      try {
        const res = await client.get("/users/search/", { params: { name: refQ } });
        setRefOptions(Array.isArray(res.data) ? res.data : []);
      } catch (e) {
        console.error("Failed to search referees", e);
        setRefOptions([]);
      } finally { setRefLoading(false); }
    }, 250);
    return () => clearTimeout(t);
  }, [refQ]);

  const addRef = (uid) => {
    const id = Number(uid);
    if (!id) return;
    if ((form.referee_ids || []).some(x => Number(x) === id)) return;
    setForm(f => ({ ...f, referee_ids: [...(f.referee_ids||[]), id] }));
  };

  const removeRef = (uid) => {
    setForm(f => ({ ...f, referee_ids: (f.referee_ids||[]).filter(x => Number(x) !== Number(uid)) }));
  };

  const nameById = (uid) => {
    const u = users.find(x => Number(x.id) === Number(uid)) || refOptions.find(x => Number(x.id) === Number(uid));
    return u ? u.name : `#${uid}`;
  };

  const teamMembers = (teamId) => users.filter(u => String(u.team_id ?? "") === String(teamId ?? ""));
  const playersFor = (teamId, allowSub) => allowSub ? users : teamMembers(teamId);

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      const t1 = Number(form.team1_id);
      const t2 = Number(form.team2_id);
      if (!t1 || !t2 || t1 === t2) { alert("Pick two different teams"); return; }
      if (!allowSub1 && form.team1_player_id && !teamMembers(t1).some(u => Number(u.id) === Number(form.team1_player_id))) {
        alert("Team 1 Player must belong to Team 1");
        return;
      }
      if (!allowSub2 && form.team2_player_id && !teamMembers(t2).some(u => Number(u.id) === Number(form.team2_player_id))) {
        alert("Team 2 Player must belong to Team 2");
        return;
      }
      const payload = {
        court: form.court || null,
        order: form.order ? Number(form.order) : null,
        referee_ids: (form.referee_ids || []).map(n => Number(n)),
        team1_id: t1,
        team2_id: t2,
        team1_player_id: form.team1_player_id ? Number(form.team1_player_id) : null,
        team2_player_id: form.team2_player_id ? Number(form.team2_player_id) : null,
      };
      const res = await client.post("/matches/", payload);
      setMatches(prev => [res.data, ...prev]);
      navigate(`/matches/${res.data.id}`);
    } catch (e) {
      console.error(e);
      alert("Failed to create match");
    }
  };

  const recent = useMemo(() => [...matches].sort((a,b)=>b.id-a.id).slice(0,10), [matches]);
  const teamName = (tid) => teams.find(t => Number(t.id) === Number(tid))?.name || `Team ${tid}`;
  const userById = (uid) => users.find(u => Number(u.id) === Number(uid));
  const userLabel = (uid, fallbackTeamId, order) => {
    const u = userById(uid);
    if (u) return `${u.name} #${u.player_number}`;
    return `${teamName(fallbackTeamId)} #${order ?? '-'}`;
  };

  return (
    <div className="grid matches-page">
      {/* Pairing generator removed */}

      <div className="card">
        <h2>Create Match</h2>
        <form onSubmit={handleCreate} className="grid" style={{gap:12}}>
          <div className="form-row">
            <div>
              <label className="label">Court</label>
              <input className="input" value={form.court} onChange={e=>setForm({...form, court:e.target.value})} placeholder="e.g. Court 1" />
            </div>
            <div>
              <label className="label">Order</label>
              <input className="input" type="number" min={1} max={4} value={form.order} onChange={e=>setForm({...form, order:e.target.value})} />
            </div>
          </div>
          <div className="form-row">
            <div>
              <label className="label">Team 1</label>
              <select className="select" value={form.team1_id} onChange={e=>setForm({...form, team1_id:e.target.value, team1_player_id:""})} required>
                <option value="">Select team</option>
                {teams.map(t=> <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Team 2</label>
              <select className="select" value={form.team2_id} onChange={e=>setForm({...form, team2_id:e.target.value, team2_player_id:""})} required>
                <option value="">Select team</option>
                {teams.map(t=> <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
            </div>
          </div>
          <div className="form-row">
            <div>
              <label className="label">Team 1 Player</label>
              <select className="select" value={form.team1_player_id} onChange={e=>setForm({...form, team1_player_id:e.target.value})}>
                <option value="">Select player</option>
                {playersFor(form.team1_id, allowSub1).map(u=> <option key={u.id} value={u.id}>{u.name} #{u.player_number}{u.team_id? ` • T${u.team_id}`:''}</option>)}
              </select>
              <label style={{display:'flex', alignItems:'center', gap:6, marginTop:6}}>
                <input type="checkbox" checked={allowSub1} onChange={e=>setAllowSub1(e.target.checked)} />
                <span className="muted" style={{fontSize:12}}>Substitute (allow any player)</span>
              </label>
            </div>
            <div>
              <label className="label">Team 2 Player</label>
              <select className="select" value={form.team2_player_id} onChange={e=>setForm({...form, team2_player_id:e.target.value})}>
                <option value="">Select player</option>
                {playersFor(form.team2_id, allowSub2).map(u=> <option key={u.id} value={u.id}>{u.name} #{u.player_number}{u.team_id? ` • T${u.team_id}`:''}</option>)}
              </select>
              <label style={{display:'flex', alignItems:'center', gap:6, marginTop:6}}>
                <input type="checkbox" checked={allowSub2} onChange={e=>setAllowSub2(e.target.checked)} />
                <span className="muted" style={{fontSize:12}}>Substitute (allow any player)</span>
              </label>
            </div>
          </div>
          <div className="muted" style={{fontSize:12}}>
            Players list only shows users currently assigned to the selected team.
          </div>
          <div>
            <label className="label">Referees</label>
            <input className="input" placeholder="Search a user by name" value={refQ} onChange={e=>setRefQ(e.target.value)} />
            <div style={{display:'flex', gap:8, flexWrap:'wrap', marginTop:8}}>
              {(form.referee_ids||[]).map(uid => (
                <span key={uid} className="tag" style={{display:'inline-flex', alignItems:'center', gap:8}}>
                  {nameById(uid)}
                  <button type="button" onClick={()=>removeRef(uid)} style={{border:'none', background:'transparent', cursor:'pointer', color:'var(--muted)'}}>×</button>
                </span>
              ))}
              {(!form.referee_ids || form.referee_ids.length===0) && (
                <span className="muted" style={{fontSize:12}}>No referees yet. Search above to add.</span>
              )}
            </div>
            {refQ && (
              <div className="card" style={{marginTop:8}}>
                <div className="muted" style={{fontSize:12, marginBottom:6}}>{refLoading ? 'Searching…' : 'Results'}</div>
                {refOptions.length === 0 && !refLoading ? (
                  <div className="muted" style={{fontSize:13}}>No users found</div>
                ) : (
                  <ul className="ref-results">
                    {refOptions.map(u => (
                      <li key={u.id} className="ref-row">
                        <div className="truncate">{u.name}{u.player_number ? ` #${u.player_number}` : ''} <span className="muted" style={{fontSize:12}}>{u.team_id ? `• team ${u.team_id}` : ''}</span></div>
                        <button type="button" className="btn" onClick={()=>addRef(u.id)}>Add</button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
            <div className="muted" style={{fontSize:12, marginTop:6}}>Referees can be any user. Use search to add multiple.</div>
          </div>
          <div>
            <button className="btn btn-primary" type="submit">Create & Start</button>
          </div>
        </form>
      </div>

      <div className="card">
        <h2>Recent Matches</h2>
        {recent.length === 0 ? (
          <p className="muted">No matches yet. {teams.length === 0 ? "Create teams first on the Teams page." : "Create one above."}</p>
        ) : (
          <ul style={{margin:0, padding:0, listStyle:'none'}}>
            {recent.map(m => (
              <li key={m.id} className="recent-row">
                <div className="recent-main">
                  <div className="recent-title" style={{fontWeight:600}}>#{m.order ?? '-'} {userLabel(m.team1_player_id, m.team1_id, m.order)} vs {userLabel(m.team2_player_id, m.team2_id, m.order)}</div>
                  <div className="muted">
                    Match #{m.id} {m.court ? `• ${m.court}` : ''} • {teamName(m.team1_id)} vs {teamName(m.team2_id)} {m.score_summary ? `• ${m.score_summary}` : ''}
                  </div>
                </div>
                <div className="recent-actions">
                  <Link className="btn" to={`/matches/${m.id}`}>Details</Link>
                  <Link className="btn btn-primary" to={`/matches/${m.id}/scoreboard`}>Score</Link>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
