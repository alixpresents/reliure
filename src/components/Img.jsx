export default function Img({ book, w, h, onClick, className = "" }) {
  const hasOverride = className.includes("w-full");
  const hasCover = !!book.c;
  return (
    <div
      onClick={onClick}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={onClick ? e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onClick(); } } : undefined}
      className={`rounded-[3px] overflow-hidden shrink-0 relative shadow-[0_1px_3px_rgba(0,0,0,0.08)] transition-all duration-150 ${onClick ? "cursor-pointer hover:-translate-y-0.5 hover:shadow-[0_4px_12px_rgba(0,0,0,0.13)]" : ""} ${className}`}
      style={{ ...(hasOverride ? {} : { width: w, height: h }), backgroundColor: "#e8e4de" }}
    >
      {hasCover && (
        <img
          src={book.c}
          alt={book.t}
          className="w-full h-full object-cover block absolute inset-0"
          onError={e => { e.target.style.display = "none"; }}
        />
      )}
      {/* Placeholder titre + auteur — visible si pas de couverture ou si l'image échoue */}
      <div className="absolute inset-0 flex flex-col items-center justify-center p-3 z-0">
        <span
          className="font-display italic text-center leading-snug text-[#999] line-clamp-3"
          style={{ fontSize: "clamp(10px, 14px, 14px)", display: "-webkit-box", WebkitLineClamp: 3, WebkitBoxOrient: "vertical", overflow: "hidden" }}
        >
          {book.t}
        </span>
        {book.a && (
          <span className="font-body text-[10px] text-[#bbb] text-center mt-1 truncate w-full">
            {book.a}
          </span>
        )}
      </div>
    </div>
  );
}
