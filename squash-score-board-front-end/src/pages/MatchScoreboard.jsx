import React, { useEffect, useRef, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import client from "../../api/client";
import "./scoreboard.css";

// CSS‑first, tidy scoreboard implementing explicit serve logic
// - Server wins: next rally starts on opposite box → record n+Opposite
// - Handout: winner serves from their preferred box → record n+Pref
// - Center timeline: strict order, left/right offset by winner side

export default function MatchScoreboard() {
  // Route param
  const { id } = useParams();
  const matchId = Number(id);
  const navigate = useNavigate();

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
  // True while fetchNames is loading the match's current state. Shows a loading
  // overlay so the user doesn't see a flash of empty/default UI before history
  // (score + timeline) is restored.
  const [loading, setLoading] = useState(true);
  const MAX_GAMES = 5;
  const POINTS_TO_WIN = 11; // win by 2

  // Modal to set initial server and side (only used for game 1)
  // Default false; fetchNames decides whether to show the warm-up / Start modal
  // after it knows the match's current state.
  const [showStart, setShowStart] = useState(false);
  const [startServer, setStartServer] = useState("p1");
  const [startBox, setStartBox] = useState("R");
  const [startMark, setStartMark] = useState(null); // 'R' | 'L'

  // Between-game break (2 min) — used for games 2+
  const BREAK_SECONDS = 120;
  const [showBreak, setShowBreak] = useState(false);
  const [breakSeconds, setBreakSeconds] = useState(0);
  const formatBreak = (s) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;

  // Match warm-up (4 min) — only for brand-new matches (game 1, no progress)
  const WARMUP_SECONDS = 240;
  const [showWarmup, setShowWarmup] = useState(false);
  const [warmupSeconds, setWarmupSeconds] = useState(0);

  // End-of-match winner popup (only shown right after the winning point,
  // not on reload of an already-completed match)
  const [showWinner, setShowWinner] = useState(false);

  // Auto-scroll timeline to bottom when items are added
  const tlScrollRef = useRef(null);
  useEffect(() => {
    const el = tlScrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [seq.length, startMark]);

  // Undo stack (full snapshot)
  const [stack, setStack] = useState([]);

  // Track when initial load (backend + localStorage hydration) is complete,
  // so we don't overwrite saved state during mount.
  const [hydrated, setHydrated] = useState(false);

  const rallyKey = (mId, gNum) => `match:${mId}:game:${gNum}:rally`;
  const warmupDoneKey = (mId) => `match:${mId}:warmup_done`;
  const markWarmupDone = (mId) => {
    if (Number.isNaN(mId)) return;
    try { localStorage.setItem(warmupDoneKey(mId), "1"); } catch {}
  };
  const isWarmupDone = (mId) => {
    if (Number.isNaN(mId)) return false;
    try { return localStorage.getItem(warmupDoneKey(mId)) === "1"; } catch { return false; }
  };
  const clearMatchLocal = (mId) => {
    if (Number.isNaN(mId)) return;
    for (let i = 1; i <= MAX_GAMES; i++) {
      try { localStorage.removeItem(rallyKey(mId, i)); } catch {}
    }
    try { localStorage.removeItem(warmupDoneKey(mId)); } catch {}
  };
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
      // Persist the reverted score to backend (debounced) so the DB matches
      // the visible state — otherwise the undid point would resurface on reload.
      queueScoreSave(gameNumber, last.score.p1, last.score.p2);
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

  // Latest rally snapshot per game — read by the debounced post so the backend
  // always gets the freshest seq/serve state without us having to thread it
  // through every queueScoreSave caller.
  const latestRallyRef = useRef({});
  useEffect(() => {
    latestRallyRef.current[gameNumber] = {
      seq,
      server,
      box,
      pref,
      startMark,
      startServer,
      startBox,
    };
  }, [gameNumber, seq, server, box, pref, startMark, startServer, startBox]);

  const postScoreToServer = async (g, p1, p2) => {
    try {
      if (Number.isNaN(matchId)) return;
      const rally = latestRallyRef.current[g];
      const params = { team1_score: p1, team2_score: p2 };
      if (rally) params.rally_data = JSON.stringify(rally);
      await client.post(`/matches/${matchId}/update/${g}`, null, { params });
    } catch (e) {
      console.error('Failed to post game score', e);
    }
  };

  // Debounced score save — rapid "+" taps collapse to one HTTP request so the
  // backend (and the Supabase pooler) doesn't get flooded.
  const SAVE_DEBOUNCE_MS = 400;
  const saveTimerRef = useRef(null);
  const pendingScoreRef = useRef(null);
  // Holds the most recently dispatched score POST so we can await it before
  // navigating (e.g. on match end → /matches needs the backend to have
  // committed winner_team_id before it refetches).
  const lastPostRef = useRef(Promise.resolve());

  const flushPendingScore = () => {
    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current);
      saveTimerRef.current = null;
    }
    const pending = pendingScoreRef.current;
    pendingScoreRef.current = null;
    if (pending) {
      lastPostRef.current = postScoreToServer(pending.g, pending.p1, pending.p2);
    }
    return lastPostRef.current;
  };

  const queueScoreSave = (g, p1, p2) => {
    // If the game number changed since the last queued post, flush it first
    // so the previous game's final score lands before we overwrite the queue.
    if (
      pendingScoreRef.current &&
      pendingScoreRef.current.g !== g
    ) {
      flushPendingScore();
    }
    pendingScoreRef.current = { g, p1, p2 };
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      // Capture the post promise so callers waiting on lastPostRef pick it up.
      const pending = pendingScoreRef.current;
      pendingScoreRef.current = null;
      saveTimerRef.current = null;
      if (pending) {
        lastPostRef.current = postScoreToServer(pending.g, pending.p1, pending.p2);
      }
    }, SAVE_DEBOUNCE_MS);
  };

  // On unmount / navigation, flush any pending save so we don't lose points
  useEffect(() => {
    return () => {
      flushPendingScore();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const startNextGame = (winner) => {
    setGameNumber((gn) => gn + 1);
    // Winner of previous game serves next; start on preferred side
    const nextBox = pref[winner] || 'R';
    setStartServer(winner);
    setStartBox(nextBox);
    setServer(winner);
    setBox((b) => ({ ...b, [winner]: nextBox }));
    setStartMark(null);
    // Trigger 2-minute break between games (no start modal — winner auto-serves)
    setShowStart(false);
    setShowBreak(true);
    setBreakSeconds(BREAK_SECONDS);
    // reset rally state
    setScore({ p1: 0, p2: 0 });
    setCounts({ p1: 0, p2: 0 });
    setSeq([]);
  };

  const endBreak = () => {
    // Winner serves from their preferred box — mark the timeline and let scoring begin
    setStartMark(startBox);
    setServer(startServer);
    setBox((b) => ({ ...b, [startServer]: startBox }));
    setShowBreak(false);
    setBreakSeconds(0);
  };

  // Countdown timer for between-games break
  useEffect(() => {
    if (!showBreak) return;
    if (breakSeconds <= 0) {
      endBreak();
      return;
    }
    const t = setTimeout(() => setBreakSeconds((s) => s - 1), 1000);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showBreak, breakSeconds]);

  const endWarmup = () => {
    setShowWarmup(false);
    setWarmupSeconds(0);
    markWarmupDone(matchId);
    setShowStart(true);
  };

  // Countdown timer for the match warm-up
  useEffect(() => {
    if (!showWarmup) return;
    if (warmupSeconds <= 0) {
      endWarmup();
      return;
    }
    const t = setTimeout(() => setWarmupSeconds((s) => s - 1), 1000);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showWarmup, warmupSeconds]);

  // Load player names for this match
  useEffect(() => {
    let active = true;
    if (active) setLoading(true);
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

          // Restore rally state (seq + serve info + score/counts) for the current
          // game. Prefer localStorage (it's the freshest local copy and survives
          // debounce gaps), then fall back to backend rally_data so the timeline
          // is rebuilt even on a different browser/device.
          let restoredFromLocal = false;
          let saved = null;
          try {
            const raw = localStorage.getItem(rallyKey(matchId, currentG));
            if (raw) saved = JSON.parse(raw);
          } catch (e) {
            console.warn("Failed to read local rally state", e);
          }
          if (!saved || !Array.isArray(saved.seq) || saved.seq.length === 0) {
            // Fallback: try backend
            const currentGameRow = sorted.find((g) => (g.game_number || 0) === currentG);
            const backendRally = currentGameRow?.rally_data;
            if (backendRally) {
              try {
                const parsed = JSON.parse(backendRally);
                if (parsed && Array.isArray(parsed.seq) && parsed.seq.length > 0) {
                  saved = parsed;
                }
              } catch (e) {
                console.warn("Failed to parse backend rally_data", e);
              }
            }
          }
          try {
            if (saved) {
              if (Array.isArray(saved.seq)) setSeq(saved.seq);
              if (saved.server === 'p1' || saved.server === 'p2') setServer(saved.server);
              if (saved.box && (saved.box.p1 === 'R' || saved.box.p1 === 'L')) setBox(saved.box);
              if (saved.pref && (saved.pref.p1 === 'R' || saved.pref.p1 === 'L')) setPref(saved.pref);
              if (saved.startMark === 'R' || saved.startMark === 'L') setStartMark(saved.startMark);
              if (saved.startServer === 'p1' || saved.startServer === 'p2') setStartServer(saved.startServer);
              if (saved.startBox === 'R' || saved.startBox === 'L') setStartBox(saved.startBox);
              const hasLocalScore =
                saved.score &&
                typeof saved.score.p1 === 'number' &&
                typeof saved.score.p2 === 'number';
              if (hasLocalScore) {
                // localStorage is the source of truth for the live scoreboard:
                // every state change (including undo) writes here synchronously,
                // while backend writes are debounced. So trust local outright
                // and reconcile the backend if it's out of sync.
                const localP1 = saved.score.p1;
                const localP2 = saved.score.p2;
                setScore({ p1: localP1, p2: localP2 });
                if (saved.counts) setCounts(saved.counts);
                if (localP1 !== currP1s || localP2 !== currP2s) {
                  queueScoreSave(currentG, localP1, localP2);
                }
              }
              if ((saved.seq && saved.seq.length > 0) || saved.startMark) {
                restoredFromLocal = true;
              }
            }
          } catch (e) {
            console.warn('Failed to restore rally state from localStorage', e);
          }

          // Brand-new match (game 1, no progress, no localStorage) → 4-minute
          // warm-up countdown, then the Start Game modal asks who serves and
          // from which side (R by default).
          // Mid-match resumes go straight to the scoreboard with the latest state.
          setShowStart(false);
          setShowWarmup(false);
          if (!restoredFromLocal && !isOver && isStartOfGame) {
            if (currentG === 1 && !lastWinner) {
              setStartServer("p1");
              setStartBox("R");
              if (isWarmupDone(matchId)) {
                // Already came through the warm-up once for this match.
                // Skip both warm-up AND the Start modal — silently commit the
                // defaults (p1 serves from R) and go straight to scoring.
                // Reset clears `warmup_done`, so user can redo the prompts.
                setServer("p1");
                setBox((b) => ({ ...b, p1: "R" }));
                setStartMark("R");
              } else {
                // Truly brand-new match: 4-min warm-up countdown → Start modal.
                setStartMark(null);
                setShowWarmup(true);
                setWarmupSeconds(WARMUP_SECONDS);
              }
            } else {
              // Mid-match game-1 retry or game 2+ with no scores yet: auto-assign winner serves
              const defaultServer = lastWinner || "p1";
              const nextBox = pref[defaultServer] || "R";
              setStartServer(defaultServer);
              setStartBox(nextBox);
              setServer(defaultServer);
              setBox((b) => ({ ...b, [defaultServer]: nextBox }));
              setStartMark(nextBox);
            }
          }

          setHydrated(true);
        }
      } catch (e) {
        console.error(e);
      } finally {
        if (active) setLoading(false);
      }
    };
    if (!Number.isNaN(matchId)) {
      fetchNames();
    } else {
      setLoading(false);
    }
    return () => { active = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [matchId]);

  // Persist rally state to localStorage so reloads restore the timeline + serve info.
  // We also save score/counts here so points lost in a pending debounce window
  // are still recovered on reload.
  useEffect(() => {
    if (!hydrated || Number.isNaN(matchId)) return;
    try {
      localStorage.setItem(
        rallyKey(matchId, gameNumber),
        JSON.stringify({ seq, server, box, pref, startMark, startServer, startBox, score, counts })
      );
    } catch (e) {
      console.warn('Failed to persist rally state', e);
    }
  }, [hydrated, matchId, gameNumber, seq, server, box, pref, startMark, startServer, startBox, score, counts]);

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

    // Persist (debounced) so rapid taps coalesce into one HTTP request
    queueScoreSave(gameNumber, nextScore.p1, nextScore.p2);

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
        if (over) {
          setMatchOver(true);
          setShowWinner(true);
        }
        return updated;
      });

      // Flush immediately: the game's final score must reach the backend before
      // we advance gameNumber (otherwise the next queued save would clobber it
      // with a different game id).
      flushPendingScore();

      // Advance to next game automatically if match not over
      const willBeOver = (gamesWon[gWinner] + 1) >= 3 || gameNumber >= MAX_GAMES;
      if (!willBeOver) {
        startNextGame(gWinner);
      }
    }
  };

  const changeServeBox = (side, newBox) => {
    if (matchOver) return;
    if (side !== server) return; // only the server's side matters
    snap();
    setBox((b) => ({ ...b, [side]: newBox }));
    if (seq.length === 0) {
      // Game hasn't started yet — update the initial-serve mark on the timeline.
      setStartMark(newBox);
      setStartBox(newBox);
    } else {
      // The last tl-dot encodes where the next serve happens; sync its box so
      // the timeline matches the picker. We only rewrite when the last rally
      // belongs to the current server (i.e., it's the rally that set up the
      // current serve state).
      setSeq((prev) => {
        if (!prev.length) return prev;
        const last = prev[prev.length - 1];
        if (last.side !== side) return prev;
        const copy = [...prev];
        copy[copy.length - 1] = { ...last, box: newBox };
        return copy;
      });
    }
  };

  const matchWinner = () => {
    if (gamesWon.p1 > gamesWon.p2) return { side: "p1", name: p1Name };
    if (gamesWon.p2 > gamesWon.p1) return { side: "p2", name: p2Name };
    return { side: null, name: "—" };
  };

  const [navigating, setNavigating] = useState(false);
  const closeWinnerAndExit = async () => {
    setNavigating(true);
    // Ensure the final score (and winner_team_id derivation) has landed in the
    // backend before navigating, so /matches refetches with the match marked
    // completed instead of still showing it as live.
    flushPendingScore();
    try {
      await lastPostRef.current;
    } catch {}
    setShowWinner(false);
    setNavigating(false);
    navigate("/matches");
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
    clearMatchLocal(matchId);
  };

  return (
    <div className="scoreboard">
      {loading && (
        <div className="modal-overlay">
          <div
            className="card modal-card"
            style={{ textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center", gap: 14, padding: "26px 28px" }}
          >
            <div
              aria-hidden="true"
              style={{
                width: 38,
                height: 38,
                borderRadius: "50%",
                border: "3px solid rgba(255,255,255,0.18)",
                borderTopColor: "var(--accent)",
                animation: "spin 0.9s linear infinite",
              }}
            />
            <div style={{ fontWeight: 700, fontSize: 16 }}>Loading match…</div>
            <div className="muted" style={{ fontSize: 13 }}>
              Restoring score and timeline
            </div>
          </div>
        </div>
      )}

      {showWarmup && (
        <div className="modal-overlay">
          <div className="card modal-card">
            <div style={{ fontWeight: 800, fontSize: 22, marginBottom: 4, textAlign: "center" }}>
              Warm-up
            </div>
            <div className="muted" style={{ textAlign: "center", marginBottom: 8 }}>
              4-minute warm-up before Game 1. Skip when ready.
            </div>
            <div
              className="gradient-text"
              style={{
                fontSize: 72,
                fontWeight: 800,
                textAlign: "center",
                fontVariantNumeric: "tabular-nums",
                margin: "8px 0 16px",
                lineHeight: 1,
              }}
            >
              {formatBreak(warmupSeconds)}
            </div>
            <div style={{ display: "flex", justifyContent: "center" }}>
              <button className="btn btn-primary" onClick={endWarmup}>Skip & Start</button>
            </div>
          </div>
        </div>
      )}

      {showStart && (
        <div className="modal-overlay">
          <div className="card modal-card">
            <div style={{ fontWeight: 800, marginBottom: 10, fontSize: 18 }}>Start Game</div>
            <div className="muted" style={{ marginBottom: 6 }}>Initial Server</div>
            <div className="seg-group" role="group">
              <button className={`seg ${startServer === "p1" ? "active" : ""}`} onClick={() => setStartServer("p1")}>{p1Name}</button>
              <button className={`seg ${startServer === "p2" ? "active" : ""}`} onClick={() => setStartServer("p2")}>{p2Name}</button>
            </div>
            <div className="muted" style={{ marginTop: 12, marginBottom: 6 }}>Serve Side</div>
            <div className="seg-group" role="group">
              <button className={`seg ${startBox === "R" ? "active" : ""}`} onClick={() => setStartBox("R")}>R</button>
              <button className={`seg ${startBox === "L" ? "active" : ""}`} onClick={() => setStartBox("L")}>L</button>
            </div>
            <div style={{ display: "flex", gap: 8, marginTop: 14, justifyContent: "flex-end" }}>
              <button className="btn btn-primary" onClick={confirmStart}>Start</button>
            </div>
          </div>
        </div>
      )}

      {showBreak && (
        <div className="modal-overlay">
          <div className="card modal-card">
            <div style={{ fontWeight: 800, fontSize: 22, marginBottom: 4, textAlign: "center" }}>
              Break
            </div>
            <div className="muted" style={{ textAlign: "center", marginBottom: 8 }}>
              Game {gameNumber} starts after the break.
              <br />
              {startServer === "p1" ? p1Name : p2Name} serves from {startBox}.
            </div>
            <div
              className="gradient-text"
              style={{
                fontSize: 72,
                fontWeight: 800,
                textAlign: "center",
                fontVariantNumeric: "tabular-nums",
                margin: "8px 0 16px",
                lineHeight: 1,
              }}
            >
              {formatBreak(breakSeconds)}
            </div>
            <div style={{ display: "flex", justifyContent: "center" }}>
              <button className="btn btn-primary" onClick={endBreak}>Skip & Start</button>
            </div>
          </div>
        </div>
      )}

      {showWinner && (
        <div className="modal-overlay">
          <div className="card modal-card">
            <div className="kicker" style={{ display: "inline-flex", margin: "0 auto 6px" }}>
              Match Complete
            </div>
            <div
              className="gradient-text"
              style={{
                fontSize: 32,
                fontWeight: 800,
                textAlign: "center",
                margin: "8px 0 4px",
                lineHeight: 1.1,
              }}
            >
              {matchWinner().name} wins!
            </div>
            <div
              className="muted"
              style={{
                textAlign: "center",
                fontSize: 16,
                marginBottom: 16,
                fontVariantNumeric: "tabular-nums",
              }}
            >
              Games: {p1Name} {gamesWon.p1} — {gamesWon.p2} {p2Name}
            </div>
            <div style={{ display: "flex", justifyContent: "center" }}>
              <button
                className="btn btn-primary"
                onClick={closeWinnerAndExit}
                disabled={navigating}
              >
                {navigating ? "Saving…" : "Back to Matches"}
              </button>
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
        <div style={{ display:'flex', gap:8, justifyContent:'center', marginTop:4 }}>
          <button className="btn" onClick={undo} disabled={!stack.length}>Undo</button>
          <button className="btn" onClick={resetAll}>Reset</button>
        </div>
      </div>

      {/* Court */}
      <div className="scoreboard-court">
        {/* Left */}
        <div className="side">
          {server === 'p1' ? (
            <div className="serve-pick">
              <span className="serve-pick-label">SERVE</span>
              <div className="seg-group">
                <button type="button" className={`seg ${box.p1==='R'?'active':''}`} onClick={() => changeServeBox('p1', 'R')}>R</button>
                <button type="button" className={`seg ${box.p1==='L'?'active':''}`} onClick={() => changeServeBox('p1', 'L')}>L</button>
              </div>
            </div>
          ) : (
            <div className="receive-badge">Receive</div>
          )}
          <div className="name">{p1Name}</div>
          <div className="big">{score.p1}</div>
          <button className="add" onClick={() => addPoint('p1')} disabled={matchOver}>+</button>
        </div>

        {/* Timeline */}
        <div className="timeline">
          <div className="track" />
          <div className="tl-scroll" ref={tlScrollRef}>
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
        </div>

        {/* Right */}
        <div className="side">
          {server === 'p2' ? (
            <div className="serve-pick">
              <span className="serve-pick-label">SERVE</span>
              <div className="seg-group">
                <button type="button" className={`seg ${box.p2==='R'?'active':''}`} onClick={() => changeServeBox('p2', 'R')}>R</button>
                <button type="button" className={`seg ${box.p2==='L'?'active':''}`} onClick={() => changeServeBox('p2', 'L')}>L</button>
              </div>
            </div>
          ) : (
            <div className="receive-badge">Receive</div>
          )}
          <div className="name">{p2Name}</div>
          <div className="big">{score.p2}</div>
          <button className="add" onClick={() => addPoint('p2')} disabled={matchOver}>+</button>
        </div>
      </div>
    </div>
  );
}
