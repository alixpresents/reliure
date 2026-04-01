export default function LevelBadge({ levelName, totalPoints, monthlyPoints }) {
  if (!levelName || totalPoints == null) return null;
  return (
    <span
      className="inline-flex items-center gap-1.5 font-body"
      style={{
        fontSize: 11,
        color: "var(--text-muted)",
        backgroundColor: "var(--bg-surface)",
        padding: "3px 10px",
        borderRadius: 10,
      }}
    >
      {levelName} · {totalPoints} encre
      {monthlyPoints > 0 && (
        <span style={{ color: "var(--color-success)", fontSize: 10, fontWeight: 500 }}>
          +{monthlyPoints} ce mois
        </span>
      )}
    </span>
  );
}
