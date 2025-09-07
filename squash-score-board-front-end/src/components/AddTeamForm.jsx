import { useState } from "react";
import client from "../../api/client";

export default function AddTeamForm({ onAdd }) {
  const [name, setName] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    try {
      const res = await client.post("/teams", { name });
      onAdd(res.data);
      setName("");
    } catch (err) {
      console.error(err);
      alert("Failed to create team");
    }
  };

  return (
    <form onSubmit={handleSubmit} className="form-row">
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Team name"
        className="input"
      />
      <div>
        <button type="submit" className="btn btn-primary">Add Team</button>
      </div>
    </form>
  );
}
