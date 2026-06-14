import { useEffect, useState } from "react";
import client from "../../api/client";
import { Link } from "react-router-dom";

export default function TeamList() {
  const [teams, setTeams] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    client.get("/teams")
      .then(res => setTeams(Array.isArray(res.data) ? res.data : []))
      .catch(err => { console.error(err); setTeams([]); })
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <p className="muted">Loading...</p>;
  }

  if (!teams.length) {
    return <p className="muted">No teams yet. Create one above!</p>;
  }

  return (
    <ul className="grid grid-2">
      {teams.map(team => (
        <li key={team.id} className="card" style={{display:'flex', gap:8, alignItems:'center', justifyContent:'space-between'}}>
          <div style={{fontWeight:600}}>{team.name}</div>
          <Link to={`/teams/${team.id}`} className="btn">View</Link>
        </li>
      ))}
    </ul>
  );
}
