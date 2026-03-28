export default function Img({ book, w, h, onClick, className = "" }) {
  const hasOverride = className.includes("w-full");
  return (
    <div
      onClick={onClick}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={onClick ? e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onClick(); } } : undefined}
      className={`rounded-[3px] overflow-hidden bg-cover-fallback shrink-0 relative shadow-[0_1px_3px_rgba(0,0,0,0.08)] transition-all duration-150 ${onClick ? "cursor-pointer hover:-translate-y-0.5 hover:shadow-[0_4px_12px_rgba(0,0,0,0.13)]" : ""} ${className}`}
      style={hasOverride ? undefined : { width: w, height: h }}
    >
      <img
        src={book.c}
        alt={book.t}
        className="w-full h-full object-cover block"
        onError={e => { e.target.style.display = "none"; }}
      />
      <div className="absolute inset-0 flex items-end justify-start p-[8%] z-0">
        <span
          className="text-[rgba(140,130,120,0.7)] font-display italic leading-tight"
          style={{ fontSize: Math.max(8, w * 0.07) }}
        >
          {book.t}
        </span>
      </div>
    </div>
  );
}
