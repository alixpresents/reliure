export default function WipBanner() {
  return (
    <div
      style={{ borderBottom: "1px solid #e8dfd2" }}
      className="bg-[#faf6f0] px-6 py-[10px] flex items-center gap-2"
    >
      <span className="text-base leading-none" aria-hidden="true">🚧</span>
      <span className="text-[13px] text-[#8B6914] font-body">
        Cette section est en cours de développement. Le contenu affiché est un aperçu de ce qui arrive.
      </span>
    </div>
  );
}
