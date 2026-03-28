export default function HScroll({ children }) {
  return (
    <div className="flex gap-3.5 overflow-x-auto pb-1" style={{ scrollbarWidth: "none" }}>
      {children}
    </div>
  );
}
