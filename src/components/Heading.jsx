export default function Heading({ children, right }) {
  return (
    <div className="flex items-baseline justify-between mb-4">
      <h2 className="font-display text-[26px] font-normal m-0" style={{ color: "var(--text-primary)" }}>{children}</h2>
      {right && <span className="text-[13px] cursor-pointer font-body" style={{ color: "var(--text-tertiary)" }}>{right}</span>}
    </div>
  );
}
