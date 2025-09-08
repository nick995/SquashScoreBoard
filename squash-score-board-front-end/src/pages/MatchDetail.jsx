import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import client from "../../api/client";
import "./match-detail.css";

export default function MatchDetail() {
  const { id } = useParams();
  const matchId = Number(id);
  const [match, setMatch] = useState(null);
  const [scores, setScores] = useState({});
  const [users, setUsers] = useState([]);
  const [teams, setTeams] = useState([]);

  const load = async () => {
    const [m, u, t] = await Promise.all([
      client.get(`/matches/${matchId}`),
      client.get(`/users`).catch(() => ({ data: [] })),
      client.get(`/teams`).catch(() => ({ data: [] })),
    ]);
    setMatch(m.data);
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

  if (!match) return <div className="card">Loading...</div>;

  return (
    <div className="grid match-detail-page">
      <div className="card">
        <h2>{teamName(match.team1_id)} vs {teamName(match.team2_id)} {match.court ? `• ${match.court}` : ''}</h2>
        <div className="muted" style={{marginBottom:8}}>
          Order: {match.order ?? '-'} • Referees: {(match.referee_ids && match.referee_ids.length)
            ? match.referee_ids.map(userName).join(', ')
            : '-'}
        </div>
        {/* Desktop/table view */}
        <div className="card md-scroll md-table-wrap">
          <table className="md-table">
            <thead>
              <tr>
                <th>Team</th>
                {[1,2,3,4,5].map(g => (
                  <th key={g}>G{g}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {[{id: match.team1_id, key:'t1', label: teamName(match.team1_id)}, {id: match.team2_id, key:'t2', label: teamName(match.team2_id)}].map(row => (
                <tr key={row.key}>
                  <td className="md-team">{row.label}</td>
                  {[1,2,3,4,5].map(g => {
                    const game = (match.games || []).find(x => x.game_number === g) || { team1_score:0, team2_score:0 };
                    const base = row.key === 't1' ? (game.team1_score ?? 0) : (game.team2_score ?? 0);
                    const current = scores[g]?.[row.key] ?? base;
                    return (
                      <td key={g}>
                        <div className="md-cell">
                          <button type="button" className="btn" onClick={()=>setScores(s=>({
                            ...s,
                            [g]: { ...(s[g]||{}), [row.key]: Number(current) - 1 < 0 ? 0 : Number(current) - 1 }
                          }))}>-</button>
                          <input
                            className="input md-input"
                            type="number"
                            value={current}
                            onChange={e=>setScores(s=>({ ...s, [g]: { ...(s[g]||{}), [row.key]: e.target.value } }))}
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
          <div className="md-actions">
            {[1,2,3,4,5].map(g => (
              <button key={g} className="btn" onClick={()=>updateGame(g)}>Save G{g}</button>
            ))}
            <button className="btn btn-primary" onClick={saveAll}>Save All</button>
          </div>
        </div>
        {/* Mobile/stacked view */}
        <div className="card md-mob">
          {[1,2,3,4,5].map(g => {
            const game = (match.games || []).find(x => x.game_number === g) || { team1_score:0, team2_score:0 };
            const t1Base = Number(game.team1_score ?? 0);
            const t2Base = Number(game.team2_score ?? 0);
            const t1Cur = Number(scores[g]?.t1 ?? t1Base);
            const t2Cur = Number(scores[g]?.t2 ?? t2Base);
            return (
              <div key={g} className="md-mob-game">
                <div className="md-mob-ghead">G{g}</div>
                <div className="md-mob-row">
                  <div className="md-mob-team">{teamName(match.team1_id)}</div>
                  <div className="md-stepper">
                    <button type="button" className="btn btn-sm" onClick={()=>setScores(s=>({ ...s, [g]: { ...(s[g]||{}), t1: Math.max(0, t1Cur-1) } }))}>-</button>
                    <input className="input md-input" type="number" value={t1Cur}
                      onChange={e=>setScores(s=>({ ...s, [g]: { ...(s[g]||{}), t1: e.target.value } }))} />
                    <button type="button" className="btn btn-sm" onClick={()=>setScores(s=>({ ...s, [g]: { ...(s[g]||{}), t1: t1Cur+1 } }))}>+</button>
                  </div>
                </div>
                <div className="md-mob-row">
                  <div className="md-mob-team">{teamName(match.team2_id)}</div>
                  <div className="md-stepper">
                    <button type="button" className="btn btn-sm" onClick={()=>setScores(s=>({ ...s, [g]: { ...(s[g]||{}), t2: Math.max(0, t2Cur-1) } }))}>-</button>
                    <input className="input md-input" type="number" value={t2Cur}
                      onChange={e=>setScores(s=>({ ...s, [g]: { ...(s[g]||{}), t2: e.target.value } }))} />
                    <button type="button" className="btn btn-sm" onClick={()=>setScores(s=>({ ...s, [g]: { ...(s[g]||{}), t2: t2Cur+1 } }))}>+</button>
                  </div>
                </div>
                <div className="md-actions">
                  <button className="btn" onClick={()=>updateGame(g)}>Save G{g}</button>
                </div>
              </div>
            );
          })}
          <div className="md-actions">
            <button className="btn btn-primary" onClick={saveAll}>Save All</button>
          </div>
        </div>
        <div style={{marginTop:12, fontWeight:700}}>Summary: {match.score_summary ?? '-'}</div>
        <div style={{marginTop:12}}>
          <a className="btn" href={`/matches/${matchId}/scoreboard`}>Open Scoreboard</a>
        </div>
      </div>

      {/* Events section removed per request */}
    </div>
  );
}
