const STYLES = {
  admin: {
    backgroundColor: "var(--text-primary)",
    color: "var(--bg-primary)",
    border: "none",
  },
  moderator: {
    backgroundColor: "var(--avatar-bg)",
    color: "var(--color-wip-text)",
    border: "1px solid var(--color-wip-border)",
  },
};

const LABELS = {
  admin: "Admin",
  moderator: "Modérateur",
};

export default function RoleBadge({ role }) {
  const style = STYLES[role];
  const label = LABELS[role];
  if (!style || !label) return null;

  return (
    <span
      className="font-body"
      style={{
        display: "inline-flex",
        alignItems: "center",
        fontSize: 10,
        fontWeight: 600,
        letterSpacing: "0.5px",
        textTransform: "uppercase",
        padding: "2px 8px",
        borderRadius: 4,
        ...style,
      }}
    >
      {label}
    </span>
  );
}
