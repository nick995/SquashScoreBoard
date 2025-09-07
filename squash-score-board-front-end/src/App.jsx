import { BrowserRouter, Routes, Route, Link } from "react-router-dom";
import Home from "./pages/Home";
import Teams from "./pages/Teams";
import Users from "./pages/Users";
import Matches from "./pages/Matches";
import TeamDetailPage from "./pages/TeamDetailPage";
import MatchDetail from "./pages/MatchDetail";
import MatchScoreboard from "./pages/MatchScoreboard";

export default function App() {
  return (
    <BrowserRouter>
      <div className="app-shell">
        <header className="header">
          <div className="container header-inner">
            <div className="brand">
              <span className="brand-name">SQUASHWORKS - THE BEST SQUASH CLUB IN UTAH</span>
            </div>
            <nav className="nav">
              <Link className="nav-link" to="/">Home</Link>
              <Link className="nav-link" to="/teams">Teams</Link>
              <Link className="nav-link" to="/users">Users</Link>
              <Link className="nav-link" to="/matches">Matches</Link>
            </nav>
          </div>
        </header>

        <main className="main">
          <div className="container">
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/teams" element={<Teams />} />
              <Route path="/users" element={<Users />} />
              <Route path="/matches" element={<Matches />} />
              <Route path="/matches/:id" element={<MatchDetail />} />
              <Route path="/matches/:id/scoreboard" element={<MatchScoreboard />} />
              <Route path="/teams/:id" element={<TeamDetailPage />} />
            </Routes>
          </div>
        </main>

        <footer className="footer">
          <div className="container footer-inner">© 2025 SQUASHWORKS</div>
        </footer>
      </div>
    </BrowserRouter>
  );
}
