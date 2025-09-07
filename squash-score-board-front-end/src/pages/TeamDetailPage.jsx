import { useParams } from "react-router-dom";
import TeamDetail from "../components/TeamDetail";

export default function TeamDetailPage() {
  const { id } = useParams();
  return (
    <TeamDetail teamId={id} />
  );
}
