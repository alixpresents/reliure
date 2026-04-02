export default function LevelBadge({ levelName }) {
  if (!levelName) return null;
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
      {levelName}
    </span>
  );
}
