// Inject shimmer + fade-in keyframes once at module import time
if (typeof document !== "undefined") {
  const STYLE_ID = "__reliure_sk";
  if (!document.getElementById(STYLE_ID)) {
    const s = document.createElement("style");
    s.id = STYLE_ID;
    s.textContent =
      "@keyframes sk-shimmer{0%{transform:translateX(-100%)}100%{transform:translateX(100%)}}" +
      "@keyframes sk-fadein{from{opacity:0}to{opacity:1}}" +
      ".sk{position:relative;overflow:hidden;background:#f0ede8;}" +
      ".sk::after{content:'';position:absolute;inset:0;background:linear-gradient(90deg,transparent 0%,#f8f6f2 50%,transparent 100%);animation:sk-shimmer 1.4s ease-in-out infinite;}" +
      ".sk-fade{animation:sk-fadein 200ms ease-in-out;}";
    document.head.appendChild(s);
  }
}

function Base({ className = "", style }) {
  return <div className={`sk ${className}`} style={style} />;
}

export default function Skeleton({ className = "", style }) {
  return <Base className={`rounded-[3px] ${className}`} style={style} />;
}

// ratio 2:3, border-radius 3px — reproduit les mêmes dims qu'Img
// avec w+h : taille fixe en pixels. Sans : width 100% + aspect-ratio 2:3
Skeleton.Cover = function Cover({ w, h, className = "" }) {
  if (w && h) {
    return <Base className={`rounded-[3px] shrink-0 ${className}`} style={{ width: w, height: h }} />;
  }
  return <Base className={`w-full rounded-[3px] ${className}`} style={{ aspectRatio: "2/3" }} />;
};

// barre arrondie, largeur/hauteur configurables
Skeleton.Text = function Text({ width = "80%", height = 14, className = "" }) {
  return (
    <Base
      className={`rounded-full ${className}`}
      style={{ width: typeof width === "number" ? width + "px" : width, height }}
    />
  );
};

// cercle
Skeleton.Avatar = function AvatarSk({ size = 30 }) {
  return <Base className="rounded-full shrink-0" style={{ width: size, height: size }} />;
};

// zone étoiles fixe
Skeleton.Stars = function Stars() {
  return <Base className="rounded-full" style={{ width: 80, height: 12 }} />;
};

// composition fil d'activité : avatar + 2 lignes + mini couverture
Skeleton.Card = function Card() {
  return (
    <div className="py-3.5 border-b border-[#f0f0f0] flex gap-3 items-start">
      <Skeleton.Avatar size={28} />
      <div className="flex-1 flex flex-col gap-2 pt-0.5">
        <Skeleton.Text width="55%" height={12} />
        <Skeleton.Text width="38%" height={12} />
      </div>
      <Base className="rounded-[2px] shrink-0" style={{ width: 36, height: 54 }} />
    </div>
  );
};
