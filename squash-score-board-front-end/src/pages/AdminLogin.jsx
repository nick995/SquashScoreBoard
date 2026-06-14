import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { login } from "../auth";

export default function AdminLogin() {
  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from || "/admin";

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      await login(username, password);
      navigate(from, { replace: true });
    } catch (err) {
      const detail = err?.response?.data?.detail || "Login failed";
      setError(detail);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section style={{ maxWidth: 380, margin: "48px auto", padding: 24 }}>
      <h1 className="gradient-text" style={{ marginBottom: 8 }}>Admin Login</h1>
      <p className="muted" style={{ marginBottom: 24 }}>
        Sign in to manage users, teams, and matches.
      </p>

      <form onSubmit={handleSubmit} style={{ display: "grid", gap: 12 }}>
        <input
          className="input"
          type="text"
          placeholder="Username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          autoComplete="username"
          required
        />
        <input
          className="input"
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="current-password"
          required
        />

        {error && (
          <div style={{ color: "#ff6b6b", fontSize: 14 }}>{error}</div>
        )}

        <button
          type="submit"
          className="btn btn-primary"
          disabled={submitting}
        >
          {submitting ? "Signing in…" : "Sign in"}
        </button>
      </form>
    </section>
  );
}
