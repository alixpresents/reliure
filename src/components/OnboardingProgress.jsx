export default function OnboardingProgress({ current, total = 12 }) {
  return (
    <div className="fixed top-0 left-0 right-0 z-[60] flex gap-[3px] h-[3px] px-4">
      {Array.from({ length: total }, (_, i) => (
        <div
          key={i}
          className="flex-1 rounded-full transition-colors duration-200"
          style={{ background: i < current ? "var(--text-primary)" : "var(--border-subtle)" }}
        />
      ))}
    </div>
  );
}
