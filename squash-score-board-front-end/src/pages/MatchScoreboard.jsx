import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import client from "../../api/client";
import "./scoreboard.css";
import "./scoreboard.css"; // <-- add this import

// CSS‑first, tidy scoreboard implementing explicit serve logic
// - Server wins: next rally starts on opposite box → record n+Opposite
// - Handout: winner serves from their preferred box → record n+Pref
// - Center timeline: strict order, left/right offset by winner side

export default function MatchScoreboard() {
  // Route param
  const { id } = useParams();
  const matchId = Number(id);

  // Names (loaded from API)
  const [p1Name, setP1Name] = useState("Player 1");
  const [p2Name, setP2Name] = useState("Player 2");

  // Scores and counts per side
  const [score, setScore] = useState({ p1: 0, p2: 0 });
  const [counts, setCounts] = useState({ p1: 0, p2: 0 });

  // Serve state
  const [server, setServer] = useState("p1"); // 'p1' | 'p2'
  const [box, setBox] = useState({ p1: "R", p2: "R" }); // current box for each when serving next
  const [pref, setPref] = useState({ p1: "R", p2: "R" }); // preferred starting box after handout

  // Timeline sequence (center), strict order
  const [seq, setSeq] = useState([]); // { side: 'p1'|'p2', box: 'R'|'L', n: number }

  // Game/match state
  const [gameNumber, setGameNumber] = useState(1); // 1..5
  const [gamesWon, setGamesWon] = useState({ p1: 0, p2: 0 });
  const [games, setGames] = useState([]); // [{ g, p1, p2, winner }]
  const [matchOver, setMatchOver] = useState(false);
  const MAX_GAMES = 5;
  const POINTS_TO_WIN = 11; // win by 2

  // Modal to set initial server and side
  const [showStart, setShowStart] = useState(true);
  const [startServer, setStartServer] = useState("p1");
  const [startBox, setStartBox] = useState("R");
  const [startMark, setStartMark] = useState(null); // 'R' | 'L'

  // Undo stack (full snapshot)
  const [stack, setStack] = useState([]);
  const snap = () => setStack((s) => [...s, JSON.stringify({ score, counts, server, box, pref, seq, startMark })]);
  const undo = () => {
    setStack((s) => {
      if (!s.length) return s;
      const copy = [...s];
      const last = JSON.parse(copy.pop());
      setScore(last.score);
      setCounts(last.counts);
      setServer(last.server);
      setBox(last.box);
      setPref(last.pref);
      setSeq(last.seq);
      setStartMark(last.startMark);
      return copy;
    });
  };

  const opp = (b) => (b === "R" ? "L" : "R");

  const isGameOver = (s) => {
    const a = s.p1, b = s.p2;
    if (a >= POINTS_TO_WIN || b >= POINTS_TO_WIN) {
      if (Math.abs(a - b) >= 2) return a > b ? 'p1' : 'p2';
    }
    return null;
  };

  const postGameToServer = async (g, p1, p2) => {
    try {
      if (!Number.isNaN(matchId)) {
        await client.post(`/matches/${matchId}/update/${g}`, null, { params: { team1_score: p1, team2_score: p2 } });
      }
    } catch (e) {
      console.error('Failed to post game score', e);
    }
  };

  const startNextGame = (winner) => {
    setGameNumber((gn) => gn + 1);
    // Winner of previous game serves next; start on preferred side
    const nextBox = pref[winner] || 'R';
    // Preselect next server/box and show start modal for confirmation
    setStartServer(winner);
    setStartBox(nextBox);
    setServer(winner);
    setBox((b) => ({ ...b, [winner]: nextBox }));
    setStartMark(null);
    setShowStart(true);
    // reset rally state
    setScore({ p1: 0, p2: 0 });
    setCounts({ p1: 0, p2: 0 });
    setSeq([]);
  };

  // Load player names for this match
  useEffect(() => {
    let active = true;
    const fetchNames = async () => {
      try {
        const mRes = await client.get(`/matches/${matchId}`);
        const m = mRes.data || {};
        let p1Id = m.team1_player_id;
        let p2Id = m.team2_player_id;
        let p1 = null, p2 = null;
        if (p1Id && p2Id) {
          const [u1, u2] = await Promise.all([
            client.get(`/users/${p1Id}`).catch(() => ({ data: null })),
            client.get(`/users/${p2Id}`).catch(() => ({ data: null })),
          ]);
          p1 = u1.data?.name || null;
          p2 = u2.data?.name || null;
        } else {
          // fallback (rare): find by team/order from all users
          const uRes = await client.get(`/users`).catch(() => ({ data: [] }));
          const users = uRes.data || [];
          const findByTeamOrder = (teamId, order) => users.find((u) => Number(u.team_id) === Number(teamId) && Number(u.player_number) === Number(order));
          if (!p1 && m.team1_id && m.order) p1 = findByTeamOrder(m.team1_id, m.order)?.name;
          if (!p2 && m.team2_id && m.order) p2 = findByTeamOrder(m.team2_id, m.order)?.name;
        }

        // Compute game progress from backend games
        const sorted = (m.games || []).slice().sort((a, b) => (a.game_number || 0) - (b.game_number || 0));
        let gw = { p1: 0, p2: 0 };
        let finished = [];
        let currentG = 1;
        let lastWinner = null;
        let foundCurrent = false;
        let currP1s = 0, currP2s = 0;
        for (const g of sorted) {
          const p1s = Number(g.team1_score || 0);
          const p2s = Number(g.team2_score || 0);
          const w = isGameOver({ p1: p1s, p2: p2s });
          if (w) {
            finished.push({ g: g.game_number, p1: p1s, p2: p2s, winner: w });
            gw[w] += 1;
            lastWinner = w;
            currentG = (g.game_number || 0) + 1;
          } else if (!foundCurrent) {
            // first incomplete game is the current
            foundCurrent = true;
            currentG = g.game_number || currentG;
            currP1s = p1s; currP2s = p2s;
            if (active) {
              setScore({ p1: p1s, p2: p2s });
              setCounts({ p1: p1s, p2: p2s });
            }
          }
        }
        if (currentG > MAX_GAMES) currentG = MAX_GAMES;
        const isOver = gw.p1 >= 3 || gw.p2 >= 3 || (finished.length >= MAX_GAMES);

        if (active) {
          if (p1) setP1Name(p1);
          if (p2) setP2Name(p2);
          setGamesWon(gw);
          setGames(finished);
          setGameNumber(currentG);
          setMatchOver(isOver);
          // Start-of-game handling: if scores are 0-0, show modal for confirmation
          const isStartOfGame = foundCurrent ? (currP1s === 0 && currP2s === 0) : (!finished.length ? true : currentG > finished.length);
          if (!isOver && isStartOfGame) {
            const defaultServer = lastWinner || startServer;
            const nextBox = pref[defaultServer] || 'R';
            setStartServer(defaultServer);
            setStartBox(nextBox);
            setServer(defaultServer); // reflect in UI behind modal
            setBox((b) => ({ ...b, [defaultServer]: nextBox }));
            setStartMark(null);
            setShowStart(true);
          } else {
            setShowStart(false);
          }
        }
      } catch (e) {
        console.error(e);
      }
    };
    if (!Number.isNaN(matchId)) fetchNames();
    return () => { active = false; };
  }, [matchId]);

  const addPoint = (winner) => {
    if (matchOver) return;
    snap();

    // Decide what to display and where next rally starts
    let recordBox;
    if (winner === server) {
      // Server wins → next rally on opposite
      recordBox = opp(box[winner]);
      setBox((b) => ({ ...b, [winner]: recordBox }));
      setServer(winner);
    } else {
      // Handout → winner serves from preferred
      recordBox = pref[winner] || "R";
      setBox((b) => ({ ...b, [winner]: recordBox }));
      setServer(winner);
    }

    // Compute next scores/counts synchronously
    const nextCounts = { ...counts, [winner]: counts[winner] + 1 };
    const nextScore = { ...score, [winner]: score[winner] + 1 };

    // Apply UI updates
    setCounts(nextCounts);
    setScore(nextScore);
    setSeq((a) => [...a, { side: winner, box: recordBox, n: (winner === 'p1' ? nextCounts.p1 : nextCounts.p2) }]);

    // Check game over (11, win by 2)
    const gWinner = isGameOver(nextScore);
    if (gWinner) {
      // Record game result
      const p1 = nextScore.p1;
      const p2 = nextScore.p2;
      setGames((arr) => [...arr, { g: gameNumber, p1, p2, winner: gWinner }]);
      setGamesWon((gw) => {
        const updated = { ...gw, [gWinner]: gw[gWinner] + 1 };
        const over = updated.p1 >= 3 || updated.p2 >= 3 || gameNumber >= MAX_GAMES;
        if (over) setMatchOver(true);
        return updated;
      });

      // Persist this game's score to backend
      postGameToServer(gameNumber, p1, p2);

      // Advance to next game automatically if match not over
      const willBeOver = (gamesWon[gWinner] + 1) >= 3 || gameNumber >= MAX_GAMES;
      if (!willBeOver) {
        startNextGame(gWinner);
      }
    }
  };

  const confirmStart = () => {
    snap();
    setServer(startServer);
    setBox((b) => ({ ...b, [startServer]: startBox }));
    setStartMark(startBox);
    setShowStart(false);
  };

  const resetAll = () => {
    snap();
    setScore({ p1: 0, p2: 0 });
    setCounts({ p1: 0, p2: 0 });
    setServer("p1");
    setBox({ p1: "R", p2: "R" });
    setPref({ p1: "R", p2: "R" });
    setSeq([]);
    setStartMark(null);
    setShowStart(true);
    setGameNumber(1);
    setGamesWon({ p1: 0, p2: 0 });
    setGames([]);
    setMatchOver(false);
  };

  return (
    <div className="scoreboard">
      {showStart && (
        <div className="modal-overlay">
          <div className="card modal-card">
            <div style={{ fontWeight: 800, marginBottom: 10, fontSize: 18 }}>Start Game</div>
            <div className="muted" style={{marginBottom:6}}>Initial Server</div>
            <div className="seg-group" role="group">
              <button className={`seg ${startServer==='p1'?'active':''}`} onClick={() => setStartServer('p1')}>{p1Name}</button>
              <button className={`seg ${startServer==='p2'?'active':''}`} onClick={() => setStartServer('p2')}>{p2Name}</button>
            </div>
            <div className="muted" style={{marginTop:12, marginBottom:6}}>Serve Side</div>
            <div className="seg-group" role="group">
              <button className={`seg ${startBox==='R'?'active':''}`} onClick={() => setStartBox('R')}>R</button>
              <button className={`seg ${startBox==='L'?'active':''}`} onClick={() => setStartBox('L')}>L</button>
            </div>
            <div style={{ display: 'flex', gap: 8, marginTop: 14, justifyContent: 'flex-end' }}>
              <button className="btn" onClick={() => setShowStart(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={confirmStart}>Start</button>
            </div>
          </div>
        </div>
      )}

      {/* Controls */}
      <div className="card">
        <div style={{ textAlign:'center', marginBottom:12 }}>
          <div style={{ fontWeight:800, fontSize:22, letterSpacing:'0.3px' }}>
            Game {gameNumber} / {MAX_GAMES}
          </div>
          <div style={{ marginTop:6, fontSize:18, opacity:0.95 }}>
            {p1Name} {gamesWon.p1} - {gamesWon.p2} {p2Name}
          </div>
          {matchOver && <div className="tag" style={{ marginTop:8 }}>Match Over</div>}
        </div>
        <div className="grid grid-2">
          <div>
            <div className="muted" style={{marginBottom:6}}>Serve Pref (handout) – {p1Name}</div>
            <div className="seg-group" role="group">
              <button className={`seg ${pref.p1==='R'?'active':''}`} onClick={() => { setPref(p => ({...p, p1:'R'})); if (server==='p1') setBox(b=>({...b,p1:'R'})); }}>R</button>
              <button className={`seg ${pref.p1==='L'?'active':''}`} onClick={() => { setPref(p => ({...p, p1:'L'})); if (server==='p1') setBox(b=>({...b,p1:'L'})); }}>L</button>
            </div>
            <div className="muted" style={{marginTop:12, marginBottom:6}}>Serve Pref (handout) – {p2Name}</div>
            <div className="seg-group" role="group">
              <button className={`seg ${pref.p2==='R'?'active':''}`} onClick={() => { setPref(p => ({...p, p2:'R'})); if (server==='p2') setBox(b=>({...b,p2:'R'})); }}>R</button>
              <button className={`seg ${pref.p2==='L'?'active':''}`} onClick={() => { setPref(p => ({...p, p2:'L'})); if (server==='p2') setBox(b=>({...b,p2:'L'})); }}>L</button>
            </div>
          </div>
          <div>
            <div className="muted" style={{marginBottom:6}}>Initial Server</div>
            <div className="seg-group" role="group">
              <button className={`seg ${server==='p1'?'active':''}`} onClick={() => setServer('p1')}>{p1Name}</button>
              <button className={`seg ${server==='p2'?'active':''}`} onClick={() => setServer('p2')}>{p2Name}</button>
            </div>
            <div className="form-row" style={{marginTop:12, gap:8}}>
              <button className="btn" onClick={undo} disabled={!stack.length}>Undo</button>
              <button className="btn" onClick={resetAll}>Reset</button>
            </div>
          </div>
        </div>
        {/* Removed verbose tags (Server/Boxes/Pref) for cleaner UI */}
      </div>

      {/* Court */}
      <div className="scoreboard-court">
        {/* Left */}
        <div className="side">
          <div className={server==='p1' ? 'serve-badge' : 'receive-badge'}>{server==='p1' ? `Serve ${box.p1}` : 'Receive'}</div>
          <div className="name">{p1Name}</div>
          <div className="big">{score.p1}</div>
          <button className="add" onClick={() => addPoint('p1')} disabled={matchOver}>+</button>
        </div>

        {/* Timeline */}
        <div className="timeline">
          <div className="track" />
          {startMark && (
            <div className={`tl-item ${startServer==='p1' ? 'win-left' : 'win-right'}`}>
              <div className="tl-dot">{startMark}</div>
            </div>
          )}
          {seq.map((ev, i) => (
            <div key={i} className={`tl-item ${ev.side==='p1'?'win-left':'win-right'}`}>
              <div className="tl-dot">{`${ev.n}${ev.box}`}</div>
            </div>
          ))}
        </div>

        {/* Right */}
        <div className="side">
          <div className={server==='p2' ? 'serve-badge' : 'receive-badge'}>{server==='p2' ? `Serve ${box.p2}` : 'Receive'}</div>
          <div className="name">{p2Name}</div>
          <div className="big">{score.p2}</div>
          <button className="add" onClick={() => addPoint('p2')} disabled={matchOver}>+</button>
        </div>
      </div>
    </div>
  );
}
