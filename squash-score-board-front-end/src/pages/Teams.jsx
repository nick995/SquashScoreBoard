import TeamList from "../components/TeamList";
import AddTeamForm from "../components/AddTeamForm";
import { useState } from "react";

export default function Teams() {
  const [teams, setTeams] = useState([]);

  return (
    <div className="grid">
      <div className="card">
        <h2>Create a New Team</h2>
        <p className="muted" style={{marginBottom: 12}}>Set up a team and add players later.</p>
        <AddTeamForm onAdd={(t) => setTeams([...teams, t])} />
      </div>

      <div className="card">
        <h2>All Teams</h2>
        <TeamList />
      </div>
    </div>
  );
}
