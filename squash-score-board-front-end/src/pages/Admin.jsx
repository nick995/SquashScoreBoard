import { Link, useNavigate } from "react-router-dom";
import { logout } from "../auth";

export default function Admin() {
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate("/admin/login", { replace: true });
  };

  return (
    <section style={{ padding: 24 }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 8,
        }}
      >
        <h1 className="gradient-text" style={{ margin: 0 }}>Admin</h1>
        <button className="btn btn-ghost" onClick={handleLogout}>Log out</button>
      </div>
      <p className="muted" style={{ marginBottom: 24 }}>
        Manage users, teams, matches, and events.
      </p>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          gap: 16,
        }}
      >
        <Link className="btn btn-primary" to="/admin/users">Manage Users</Link>
        <Link className="btn btn-primary" to="/admin/teams">Manage Teams</Link>
        <Link className="btn btn-primary" to="/admin/matches">Manage Matches</Link>
      </div>
    </section>
  );
}
