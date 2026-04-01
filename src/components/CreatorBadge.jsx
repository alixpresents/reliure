export default function CreatorBadge() {
  return (
    <span
      className="inline-flex items-center gap-0.5 font-body font-medium"
      style={{
        fontSize: 11,
        backgroundColor: "var(--creator-bg)",
        color: "var(--creator-text)",
        border: "1px solid var(--creator-border)",
        padding: "1px 8px",
        borderRadius: 999,
        whiteSpace: "nowrap",
      }}
    >
      ✦ Créateur
    </span>
  );
}
