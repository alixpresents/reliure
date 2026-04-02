import { useParams } from "react-router-dom";
import { useCuratedSelection } from "../hooks/useCuratedSelections";
import SelectionPage from "./SelectionPage";
import Skeleton from "../components/Skeleton";

export default function SelectionPageRoute() {
  const { slug } = useParams();
  const { data: selection, isLoading, error } = useCuratedSelection(slug);

  if (isLoading) return <SelectionSkeleton />;
  if (error || !selection) return <NotFound />;
  return <SelectionPage selection={selection} />;
}

function SelectionSkeleton() {
  return (
    <div style={{ paddingTop: 24 }}>
      <Skeleton.Text style={{ width: 80, marginBottom: 24 }} />
      <Skeleton.Text style={{ width: 120, marginBottom: 8 }} />
      <Skeleton.Text style={{ width: 280, height: 32, marginBottom: 8 }} />
      <Skeleton.Text style={{ width: 200, marginBottom: 28 }} />
      <div className="sk" style={{ width: "100%", height: 300, borderRadius: 6, marginBottom: 28 }} />
      <Skeleton.Text style={{ width: "80%", marginBottom: 8 }} />
      <Skeleton.Text style={{ width: "60%", marginBottom: 32 }} />
      {[1, 2, 3].map(i => (
        <div key={i} style={{ display: "flex", gap: 20, padding: "28px 0", borderBottom: "1px solid var(--border-subtle)" }}>
          <Skeleton.Cover style={{ width: 90, height: 135 }} />
          <div style={{ flex: 1 }}>
            <Skeleton.Text style={{ width: 180, height: 18, marginBottom: 8 }} />
            <Skeleton.Text style={{ width: 120, marginBottom: 4 }} />
            <Skeleton.Text style={{ width: 80 }} />
          </div>
        </div>
      ))}
    </div>
  );
}

function NotFound() {
  return (
    <div style={{ paddingTop: 80, textAlign: "center" }}>
      <p className="text-[15px] font-body" style={{ color: "var(--text-tertiary)" }}>
        Sélection introuvable.
      </p>
    </div>
  );
}
