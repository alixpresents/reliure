export default function WipBanner() {
  return (
    <div
      style={{ borderBottom: "1px solid var(--color-wip-border)", backgroundColor: "var(--color-wip-bg)" }}
      className="px-6 py-[10px] flex items-center gap-2"
    >
      <span className="text-base leading-none" aria-hidden="true">🚧</span>
      <span className="text-[13px] font-body" style={{ color: "var(--color-wip-text)" }}>
        Cette section est en cours de développement. Le contenu affiché est un aperçu de ce qui arrive.
      </span>
    </div>
  );
}
