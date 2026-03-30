export default function Toast({ message, onClose }) {
  return (
    <div
      className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[10000] px-4 py-3 text-[13px] font-body rounded-lg shadow-[0_4px_16px_rgba(0,0,0,0.2)] animate-toast-in pointer-events-none select-none whitespace-nowrap"
      style={{ backgroundColor: "var(--text-primary)", color: "var(--bg-primary)" }}
    >
      {message}
    </div>
  );
}
