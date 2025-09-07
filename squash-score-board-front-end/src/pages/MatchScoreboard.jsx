import { useEffect, useMemo, useRef, useState } from "react";
import { useParams, Link } from "react-router-dom";
import client from "../../api/client";

export default function MatchScoreboard() {
  const { id } = useParams();
  const matchId = Number(id);
  const [match, setMatch] = useState(null);
  const [users, setUsers] = useState([]);
  const [teams, setTeams] = useState([]);
  const [currentGame, setCurrentGame] = useState(1);
  const [local, setLocal] = useState({ t1: 0, t2: 0 });
  const [stack, setStack] = useState([]); // history for undo
  const [serverTeam, setServerTeam] = useState('t1');
  const [serveBox, setServeBox] = useState({ t1: 'R', t2: 'R' });
  const [showWinModal, setShowWinModal] = useState(false);
  const [winSide, setWinSide] = useState(null);
  const [timer, setTimer] = useState(0); // seconds remaining
  const timerRef = useRef(null);
  const [timeline, setTimeline] = useState({ 1: [], 2: [], 3: [], 4: [], 5: [] });
  const [gameConfig, setGameConfig] = useState({ 1:{server:'t1', box:'R'}, 2:{server:'t1', box:'R'}, 3:{server:'t1', box:'R'}, 4:{server:'t1', box:'R'}, 5:{server:'t1', box:'R'} });

  const load = async () => {
    const [m, u, t] = await Promise.all([
      client.get(`/matches/${matchId}`),
      client.get(`/users`).catch(() => ({ data: [] })),
      client.get(`/teams`).catch(() => ({ data: [] })),
    ]);
    setMatch(m.data);
    setUsers(u.data || []);
    setTeams(t.data || []);
    const g = (m.data.games || []).find(x => x.game_number === currentGame);
    setLocal({ t1: g?.team1_score ?? 0, t2: g?.team2_score ?? 0 });
    setStack([]);
  };

  useEffect(() => { load().catch(console.error); }, [matchId]);
  useEffect(() => {
    if (!match) return;
    const g = (match.games || []).find(x => x.game_number === currentGame);
    setLocal({ t1: g?.team1_score ?? 0, t2: g?.team2_score ?? 0 });
    setStack([]);
    const cfg = gameConfig[currentGame] || { server: 't1', box: 'R' };
    setServerTeam(cfg.server);
    setServeBox({ t1:'R', t2:'R', [cfg.server]: cfg.box });
  }, [currentGame]);

  const teamName = (tid) => teams.find(t => Number(t.id) === Number(tid))?.name || `Team ${tid}`;
  const userName = (uid) => users.find(u => Number(u.id) === Number(uid))?.name;
  const leftLabel = userName(match?.team1_player_id) || teamName(match?.team1_id);
  const rightLabel = userName(match?.team2_player_id) || teamName(match?.team2_id);

  const isGameDecided = (a, b) => {
    const max = Math.max(a, b);
    const min = Math.min(a, b);
    return max >= 11 && max - min >= 2;
  };

  const addPoint = async (side) => {
    // snapshot before changing serve/box so undo can restore correctly
    const prevServer = serverTeam;
    const prevServeBox = { ...serveBox };
    const oldScores = { ...local };
    const newScores = { ...oldScores, [side]: oldScores[side] + 1 };

    setLocal(newScores);
    setStack(st => [...st, { side, serverTeam: prevServer, serveBox: prevServeBox }]);

    // Append to visual timeline
    setTimeline(tl => {
      const arr = tl[currentGame] ? [...tl[currentGame]] : [];
      const scoreShown = side === 't1' ? newScores.t1 : newScores.t2;
      // Show the server/box for the NEXT rally (post-rally state)
      let nextServer = prevServer;
      let nextBox = prevServeBox[prevServer];
      if (side === prevServer) {
        // server keeps, toggles box
        nextServer = prevServer;
        nextBox = prevServeBox[prevServer] === 'L' ? 'R' : 'L';
      } else {
        // handout: receiver becomes server at Right box by default
        nextServer = side;
        nextBox = 'R';
      }
      arr.push({ n: arr.length + 1, score: scoreShown, winner: side, server: nextServer, box: nextBox });
      return { ...tl, [currentGame]: arr };
    });

    // PAR to 11: server holds and alternates box if they win, otherwise handout to receiver (server switches), default to Right box
    if (side === prevServer) {
      setServeBox(prev => ({ ...prev, [side]: prev[side] === 'L' ? 'R' : 'L' }));
    } else {
      setServerTeam(side);
      setServeBox(prev => ({ ...prev, [side]: 'R' }));
    }
    // Try to log event; ignore failures
    try { await client.post(`/events/`, { match_id: matchId, event_type: 'point', team_id: side === 't1' ? match.team1_id : match.team2_id }); } catch {}

    // Check win condition asynchronously after state ticks
    setTimeout(() => {
      setLocal(curr => {
        if (isGameDecided(curr.t1, curr.t2)) {
          const winner = curr.t1 > curr.t2 ? 't1' : 't2';
          setWinSide(winner);
          setShowWinModal(true);
        }
        return curr;
      });
    }, 0);
  };

  const undo = () => {
    setStack(st => {
      const copy = [...st];
      const last = copy.pop();
      if (!last) return st;
      setLocal(s => ({ ...s, [last.side]: Math.max(0, s[last.side] - 1) }));
      // restore previous server and boxes snapshot
      setServerTeam(last.serverTeam);
      setServeBox(last.serveBox);
      // remove last timeline item for current game
      setTimeline(tl => {
        const arr = tl[currentGame] ? [...tl[currentGame]] : [];
        arr.pop();
        return { ...tl, [currentGame]: arr };
      });
      return copy;
    });
  };
  const save = async () => {
    try {
      await client.post(`/matches/${matchId}/update/${currentGame}`, null, { params: { team1_score: local.t1, team2_score: local.t2 } });
      const m = await client.get(`/matches/${matchId}`);
      setMatch(m.data);
      setStack([]);
    } catch (e) {
      console.error(e);
    }
  };

  const startTimer = (seconds=120) => {
    if (timerRef.current) clearInterval(timerRef.current);
    setTimer(seconds);
    timerRef.current = setInterval(() => {
      setTimer(prev => {
        if (prev <= 1) { clearInterval(timerRef.current); return 0; }
        return prev - 1;
      });
    }, 1000);
  };

  const stopTimer = () => { if (timerRef.current) { clearInterval(timerRef.current); } setTimer(0); };

  const finalizeGame = async (action) => {
    // action: 'timer' | 'next'
    setShowWinModal(false);
    await save();
    if (currentGame < 5) setCurrentGame(g => g + 1);
    if (action === 'timer') startTimer(120); else stopTimer();
  };

  if (!match) return <div className="card">Loading…</div>;

  return (
    <div className="scoreboard">
      {showWinModal && (
        <div style={{position:'fixed', inset:0, background:'rgba(0,0,0,.5)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:2000}}>
          <div className="card" style={{width:360}}>
            <div style={{fontWeight:700, marginBottom:8}}>Game {currentGame} decided</div>
            <div className="muted" style={{marginBottom:12}}>
              Winner: {winSide==='t1'? leftLabel : rightLabel} • Score {local.t1}-{local.t2}
            </div>
            <div style={{display:'flex', gap:8, flexWrap:'wrap'}}>
              <button className="btn btn-primary" onClick={()=>finalizeGame('timer')}>Save & 2:00 Timer</button>
              <button className="btn" onClick={()=>finalizeGame('next')}>Save & Next Now</button>
              <button className="btn" onClick={()=>setShowWinModal(false)}>Cancel</button>
            </div>
          </div>
        </div>
      )}
      <div className="scoreboard-top">
        <Link to={`/matches/${matchId}`} className="btn">Back</Link>
        <div className="scoreboard-games">
          {[1,2,3,4,5].map(g => (
            <button key={g} className={`btn ${g===currentGame? 'btn-primary':''}`} onClick={()=>setCurrentGame(g)}>G{g}</button>
          ))}
        </div>
        <button className="btn" onClick={undo} disabled={stack.length===0}>Undo</button>
      </div>
      <div className="scoreboard-top" style={{justifyContent:'center', gap:8}}>
        <span className="muted" style={{fontSize:12}}>First Server</span>
        <button className={`btn ${gameConfig[currentGame]?.server==='t1'?'btn-primary':''}`} onClick={()=>{ setGameConfig(g=>({ ...g, [currentGame]: { ...(g[currentGame]||{}), server:'t1'} })); setServerTeam('t1'); setServeBox(b=>({ ...b, t1: gameConfig[currentGame]?.box || 'R' })); }}>Left</button>
        <button className={`btn ${gameConfig[currentGame]?.server==='t2'?'btn-primary':''}`} onClick={()=>{ setGameConfig(g=>({ ...g, [currentGame]: { ...(g[currentGame]||{}), server:'t2'} })); setServerTeam('t2'); setServeBox(b=>({ ...b, t2: gameConfig[currentGame]?.box || 'R' })); }}>Right</button>
        <span className="muted" style={{fontSize:12}}>First Box</span>
        <button className={`btn ${gameConfig[currentGame]?.box==='R'?'btn-primary':''}`} onClick={()=>{ setGameConfig(g=>({ ...g, [currentGame]: { ...(g[currentGame]||{}), box:'R'} })); setServeBox(b=>({ ...b, [serverTeam]:'R' })); }}>R</button>
        <button className={`btn ${gameConfig[currentGame]?.box==='L'?'btn-primary':''}`} onClick={()=>{ setGameConfig(g=>({ ...g, [currentGame]: { ...(g[currentGame]||{}), box:'L'} })); setServeBox(b=>({ ...b, [serverTeam]:'L' })); }}>L</button>
      </div>

      <div className="scoreboard-court">
        <div className="side">
          <div className={serverTeam==='t1' ? 'serve-badge' : 'receive-badge'}>
            {serverTeam==='t1' ? `Serve ${serveBox.t1}` : 'Receive'}
          </div>
          <div className="name">{leftLabel}</div>
          <div className="big">{local.t1}</div>
          <button className="add" onClick={()=>addPoint('t1')}>+</button>
        </div>
        <div className="timeline">
          <div className="track" />
          {(timeline[currentGame]||[]).map((it)=> (
            <div key={it.n} className={`tl-item ${it.winner==='t1'?'win-left':'win-right'}`}>
              <div className="tl-label left">{it.server==='t1'? it.box : ''}</div>
              <div className="tl-dot">{it.score ?? it.n}</div>
              <div className="tl-label right">{it.server==='t2'? it.box : ''}</div>
            </div>
          ))}
        </div>
        <div className="side">
          <div className={serverTeam==='t2' ? 'serve-badge' : 'receive-badge'}>
            {serverTeam==='t2' ? `Serve ${serveBox.t2}` : 'Receive'}
          </div>
          <div className="name">{rightLabel}</div>
          <div className="big">{local.t2}</div>
          <button className="add" onClick={()=>addPoint('t2')}>+</button>
        </div>
      </div>

      <div className="scoreboard-bottom" style={{gap:10}}>
        <div className="tag">Server: {serverTeam==='t1'? leftLabel : rightLabel}</div>
        <div className="tag">Boxes: {serveBox.t1}/{serveBox.t2}</div>
        {timer>0 && <div className="tag">Next game in {Math.floor(timer/60)}:{String(timer%60).padStart(2,'0')}</div>}
        <button className="btn" onClick={()=>setServerTeam(s => s==='t1'?'t2':'t1')}>Switch Server</button>
        <button className="btn" onClick={()=>setServeBox(b => ({...b, [serverTeam]: b[serverTeam]==='L'?'R':'L'}))}>Toggle Box</button>
        <button className="btn btn-primary" onClick={save}>Save Game {currentGame}</button>
        <button className="btn" onClick={()=>{ stopTimer(); if (currentGame<5) setCurrentGame(g=>g+1); }}>Start Next Now</button>
      </div>
    </div>
  );
}
