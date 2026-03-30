import { useState } from "react";

export default function AnnouncementBanner({
  pill = "Bêta",
  message = "est en bêta fermée —",
  ctaLabel = "Demander un accès",
  ctaHref = "/login",
  storageKey = "reliure_banner_dismissed_v1",
}) {
  const [dismissed, setDismissed] = useState(
    () => !!localStorage.getItem(storageKey)
  );

  if (dismissed) return null;

  const dismiss = () => {
    localStorage.setItem(storageKey, "1");
    setDismissed(true);
  };

  return (
    <div
      className="relative flex items-center justify-center px-10 font-body"
      style={{ height: 36, background: "#1a1a1a", color: "#fff" }}
    >
      <div className="flex items-center gap-2.5 text-[12px]">
        <span
          className="uppercase tracking-wide text-[11px] px-2 py-0.5 rounded-full"
          style={{
            background: "rgba(255,255,255,0.12)",
            border: "1px solid rgba(255,255,255,0.18)",
            color: "rgba(255,255,255,0.75)",
          }}
        >
          {pill}
        </span>
        <span style={{ color: "rgba(255,255,255,0.85)" }}>
          <em className="font-display not-italic" style={{ fontStyle: "italic", fontFamily: "'Instrument Serif', serif" }}>Reliure</em>
          {" "}{message}
        </span>
        <a
          href={ctaHref}
          className="underline underline-offset-2 font-medium transition-opacity duration-150 hover:opacity-75"
          style={{ color: "#fff" }}
        >
          {ctaLabel}
        </a>
      </div>

      <button
        onClick={dismiss}
        aria-label="Fermer"
        className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center justify-center bg-transparent border-none cursor-pointer transition-opacity duration-150 hover:opacity-75"
        style={{ width: 24, height: 24, color: "rgba(255,255,255,0.6)", fontSize: 18, lineHeight: 1 }}
      >
        ×
      </button>
    </div>
  );
}
