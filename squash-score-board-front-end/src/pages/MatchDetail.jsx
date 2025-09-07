import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import client from "../../api/client";

export default function MatchDetail() {
  const { id } = useParams();
  const matchId = Number(id);
  const [match, setMatch] = useState(null);
  const [events, setEvents] = useState([]);
  const [scores, setScores] = useState({});
  const [eventForm, setEventForm] = useState({ event_type: "note" });
  const [users, setUsers] = useState([]);
  const [teams, setTeams] = useState([]);

  const load = async () => {
    const [m, ev, u, t] = await Promise.all([
      client.get(`/matches/${matchId}`),
      client.get(`/events/match/${matchId}`),
      client.get(`/users`).catch(() => ({ data: [] })),
      client.get(`/teams`).catch(() => ({ data: [] })),
    ]);
    setMatch(m.data);
    setEvents(ev.data);
    setUsers(u.data || []);
    setTeams(t.data || []);
  };

  useEffect(() => { load().catch(console.error); }, [matchId]);

  const updateGame = async (g) => {
    try {
      const t1 = Number(scores[g]?.t1 ?? 0);
      const t2 = Number(scores[g]?.t2 ?? 0);
      await client.post(`/matches/${matchId}/update/${g}`, null, { params: { team1_score: t1, team2_score: t2 } });
      await load();
    } catch (e) {
      console.error(e);
      alert("Failed to update score");
    }
  };

  const saveAll = async () => {
    try {
      for (let g = 1; g <= 5; g++) {
        const current = (match.games || []).find(x => x.game_number === g) || { team1_score: 0, team2_score: 0 };
        const t1 = Number(scores[g]?.t1 ?? current.team1_score ?? 0);
        const t2 = Number(scores[g]?.t2 ?? current.team2_score ?? 0);
        await client.post(`/matches/${matchId}/update/${g}`, null, { params: { team1_score: t1, team2_score: t2 } });
      }
      await load();
    } catch (e) {
      console.error(e);
      alert("Failed to save all games");
    }
  };

  const teamName = (tid) => teams.find(t => Number(t.id) === Number(tid))?.name || `Team ${tid}`;
  const userName = (uid) => users.find(u => Number(u.id) === Number(uid))?.name || `#${uid}`;

  const addEvent = async (e) => {
    e.preventDefault();
    try {
      await client.post(`/events/`, { match_id: matchId, ...eventForm });
      setEventForm({ event_type: "note" });
      await load();
    } catch (err) {
      console.error(err);
    }
  };

  if (!match) return <div className="card">Loading...</div>;

  return (
    <div className="grid">
      <div className="card">
        <h2>{teamName(match.team1_id)} vs {teamName(match.team2_id)} {match.court ? `• ${match.court}` : ''}</h2>
        <div className="muted" style={{marginBottom:8}}>
          Order: {match.order ?? '-'} • Referees: {(match.referee_ids && match.referee_ids.length)
            ? match.referee_ids.map(userName).join(', ')
            : '-'}
        </div>
        <div className="card" style={{overflowX:'auto'}}>
          <table style={{width:'100%', borderCollapse:'collapse'}}>
            <thead>
              <tr>
                <th style={{textAlign:'left', padding:'8px 6px'}}>Team</th>
                {[1,2,3,4,5].map(g => (
                  <th key={g} style={{textAlign:'center', padding:'8px 6px'}}>G{g}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {[{id: match.team1_id, key:'t1', label: teamName(match.team1_id)}, {id: match.team2_id, key:'t2', label: teamName(match.team2_id)}].map(row => (
                <tr key={row.key}>
                  <td style={{padding:'8px 6px', fontWeight:600}}>{row.label}</td>
                  {[1,2,3,4,5].map(g => {
                    const game = (match.games || []).find(x => x.game_number === g) || { team1_score:0, team2_score:0 };
                    const base = row.key === 't1' ? (game.team1_score ?? 0) : (game.team2_score ?? 0);
                    const current = scores[g]?.[row.key] ?? base;
                    return (
                      <td key={g} style={{padding:'8px 6px', textAlign:'center'}}>
                        <div style={{display:'inline-flex', alignItems:'center', gap:6}}>
                          <button type="button" className="btn" onClick={()=>setScores(s=>({
                            ...s,
                            [g]: { ...(s[g]||{}), [row.key]: Number(current) - 1 < 0 ? 0 : Number(current) - 1 }
                          }))}>-</button>
                          <input
                            className="input"
                            type="number"
                            value={current}
                            onChange={e=>setScores(s=>({ ...s, [g]: { ...(s[g]||{}), [row.key]: e.target.value } }))}
                            style={{width:72, textAlign:'center'}}
                          />
                          <button type="button" className="btn" onClick={()=>setScores(s=>({
                            ...s,
                            [g]: { ...(s[g]||{}), [row.key]: Number(current) + 1 }
                          }))}>+</button>
                        </div>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
          <div style={{marginTop:10, display:'flex', gap:8}}>
            {[1,2,3,4,5].map(g => (
              <button key={g} className="btn" onClick={()=>updateGame(g)}>Save G{g}</button>
            ))}
            <button className="btn btn-primary" onClick={saveAll}>Save All</button>
          </div>
        </div>
        <div style={{marginTop:12, fontWeight:700}}>Summary: {match.score_summary ?? '-'}</div>
        <div style={{marginTop:12}}>
          <a className="btn" href={`/matches/${matchId}/scoreboard`}>Open Scoreboard</a>
        </div>
      </div>

      <div className="card">
        <h2>Events</h2>
        <form onSubmit={addEvent} className="form-row" style={{marginBottom:12}}>
          <select className="select" value={eventForm.event_type} onChange={e=>setEventForm({...eventForm, event_type:e.target.value})}>
            <option value="note">Note</option>
            <option value="point">Point</option>
            <option value="let">Let</option>
            <option value="warning">Warning</option>
          </select>
          <button className="btn">Add</button>
        </form>
        {events.length === 0 ? (
          <p className="muted">No events yet.</p>
        ) : (
          <ul style={{margin:0, padding:0, listStyle:'none'}}>
            {events.map(ev => (
              <li key={ev.id} style={{display:'flex', justifyContent:'space-between', padding:'8px 0', borderBottom:'1px solid var(--border)'}}>
                <div>
                  <div style={{fontWeight:600}}>{ev.event_type}</div>
                </div>
                <div className="muted" style={{fontSize:12}}>{ev.timestamp?.replace('T',' ').slice(0,19)}</div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
