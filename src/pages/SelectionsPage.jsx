import { useCuratedSelections } from "../hooks/useCuratedSelections";
import CuratedSelectionCard from "../components/CuratedSelectionCard";
import Label from "../components/Label";
import Skeleton from "../components/Skeleton";

export default function SelectionsPage() {
  const { data: selections, isLoading } = useCuratedSelections();

  if (isLoading) return <SelectionsSkeleton />;

  const all = selections || [];
  const featured = all[0];
  const rest = all.slice(1);

  return (
    <div className="sk-fade pb-16">
      <div className="pt-6 pb-2">
        <Label>Sélections</Label>
      </div>

      <h1 className="font-display italic text-[26px] font-normal leading-tight mb-2" style={{ color: "var(--text-primary)" }}>
        La Bibliothèque de...
      </h1>
      <p className="text-[14px] font-body mb-8" style={{ color: "var(--text-tertiary)" }}>
        Les lectures intimes de ceux qui font la littérature.
      </p>

      {all.length === 0 && (
        <p className="text-[14px] font-body py-12 text-center" style={{ color: "var(--text-muted)" }}>
          Aucune sélection pour l'instant.
        </p>
      )}

      {/* Featured — la plus récente */}
      {featured && (
        <div className="mb-8">
          <CuratedSelectionCard selection={featured} variant="featured" />
        </div>
      )}

      {/* Reste en grille */}
      {rest.length > 0 && (
        <>
          <div style={{ borderTop: "1px solid var(--border-subtle)", marginBottom: 24 }} />
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
              gap: 16,
            }}
          >
            {rest.map(s => (
              <CuratedSelectionCard key={s.id} selection={s} variant="compact" />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function SelectionsSkeleton() {
  return (
    <div style={{ paddingTop: 24 }}>
      <Skeleton.Text style={{ width: 80, marginBottom: 16 }} />
      <Skeleton.Text style={{ width: 220, height: 26, marginBottom: 8 }} />
      <Skeleton.Text style={{ width: 280, marginBottom: 32 }} />
      {/* Featured skeleton */}
      <div className="sk" style={{ width: "100%", height: 240, borderRadius: 12, marginBottom: 32 }} />
      {/* Grid skeletons */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 16 }}>
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="sk" style={{ height: 180, borderRadius: 12 }} />
        ))}
      </div>
    </div>
  );
}
