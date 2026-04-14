import { useState, memo } from "react";

function proxyUrl(url, width) {
  if (!url) return url;
  if (import.meta.env.DEV) return url;
  if (url.includes('/avatars/')) return url;
  return `/api/image-proxy?url=${encodeURIComponent(url)}&w=${width}&q=75`;
}

export default memo(function Img({ book, w, h, onClick, className = "", priority = false }) {
  const hasOverride = className.includes("w-full");
  const [imgFailed, setImgFailed] = useState(false);
  const displayWidth = w ? Math.round(w * 2) : 200;
  const src = proxyUrl(book.c, displayWidth);
  const showFallback = !src || imgFailed;

  return (
    <div
      onClick={onClick}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={onClick ? e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onClick(); } } : undefined}
      className={`rounded-[3px] overflow-hidden shrink-0 relative transition-all duration-150 ${onClick ? "cursor-pointer hover:-translate-y-0.5 hover:shadow-[0_4px_12px_rgba(0,0,0,0.13)]" : ""} ${className}`}
      style={{ ...(hasOverride ? {} : { width: w, height: h }), backgroundColor: "var(--cover-fallback)", boxShadow: "var(--shadow-cover)" }}
    >
      {src && !imgFailed && (
        <img
          src={src}
          alt={book.t ? `Couverture de ${book.t}${book.a ? ` par ${book.a}` : ""}` : "Couverture de livre"}
          loading={priority ? "eager" : "lazy"}
          className="w-full h-full object-cover block absolute inset-0"
          onLoad={e => { if (e.target.naturalWidth < 10 || e.target.naturalHeight < 10) setImgFailed(true); }}
          onError={() => setImgFailed(true)}
        />
      )}
      {showFallback && (
        <div className="absolute inset-0 flex items-center justify-center p-2">
          <span className="font-display italic text-center leading-snug" style={{ color: "var(--text-tertiary)", fontSize: "clamp(9px, 12%, 13px)", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
            {book.t}
          </span>
        </div>
      )}
    </div>
  );
});
