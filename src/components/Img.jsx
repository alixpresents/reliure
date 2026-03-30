import { useState } from "react";

export default function Img({ book, w, h, onClick, className = "" }) {
  const hasOverride = className.includes("w-full");
  const [imgFailed, setImgFailed] = useState(false);
  const src = book.c;
  const showFallback = !src || imgFailed;

  return (
    <div
      onClick={onClick}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={onClick ? e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onClick(); } } : undefined}
      className={`rounded-[3px] overflow-hidden shrink-0 relative shadow-[0_1px_3px_rgba(0,0,0,0.08)] transition-all duration-150 ${onClick ? "cursor-pointer hover:-translate-y-0.5 hover:shadow-[0_4px_12px_rgba(0,0,0,0.13)]" : ""} ${className}`}
      style={{ ...(hasOverride ? {} : { width: w, height: h }), backgroundColor: "#e8e4de" }}
    >
      {src && !imgFailed && (
        <img
          src={src}
          alt=""
          className="w-full h-full object-cover block absolute inset-0"
          onLoad={e => { if (e.target.naturalWidth < 10 || e.target.naturalHeight < 10) setImgFailed(true); }}
          onError={() => setImgFailed(true)}
        />
      )}
      {showFallback && (
        <div className="absolute inset-0 flex items-center justify-center p-2">
          <span className="font-display italic text-center leading-snug text-[#767676]" style={{ fontSize: "clamp(9px, 12%, 13px)", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
            {book.t}
          </span>
        </div>
      )}
    </div>
  );
}
