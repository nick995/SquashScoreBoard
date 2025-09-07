import { useEffect, useState } from "react";
import client from "../../api/client";
import AddUserToTeamForm from "./AddUserToTeamForm";

export default function TeamDetail({ teamId }) {
  const [team, setTeam] = useState(null);
  const reload = async () => {
    try {
      const res = await client.get(`/teams/${teamId}`);
      setTeam(res.data);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    reload();
  }, [teamId]);

  if (!team) return <div className="card">Loading...</div>;

  return (
    <div className="grid">
      <div className="card">
        <h2 style={{marginBottom:6}}>{team.name}</h2>
        <span className="tag">Team #{team.id}</span>
      </div>
      <div className="card">
        <h2>Members</h2>
        {team.members.length === 0 ? (
          <p className="muted">No members yet.</p>
        ) : (
          <ul style={{margin:0, padding:0, listStyle:'none'}}>
            {team.members.map(user => (
              <li key={user.id} style={{display:'flex', alignItems:'baseline', justifyContent:'space-between', padding:'8px 0', borderBottom:'1px solid var(--border)'}}>
                <div style={{fontWeight:600}}>{user.name}</div>
                <div className="muted">#{user.player_number}</div>
              </li>
            ))}
          </ul>
        )}
        <AddUserToTeamForm teamId={teamId} onAdd={() => { reload(); }}/>
      </div>
    </div>
  );
}
