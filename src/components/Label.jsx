export default function Label({ children }) {
  return (
    <div className="text-[10px] font-semibold uppercase tracking-[2px] mb-3 font-body" style={{ color: "var(--text-tertiary)" }}>
      {children}
    </div>
  );
}
