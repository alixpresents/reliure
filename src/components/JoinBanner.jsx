import { useState } from "react";
import { Link } from "react-router-dom";

const STORAGE_KEY = "reliure_join_banner_dismissed";

export default function JoinBanner() {
  const [dismissed, setDismissed] = useState(
    () => typeof window !== "undefined" && localStorage.getItem(STORAGE_KEY) === "1"
  );

  if (dismissed) return null;

  const dismiss = () => {
    localStorage.setItem(STORAGE_KEY, "1");
    setDismissed(true);
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 z-[9990]" style={{ height: 48, backgroundColor: "var(--text-primary)", color: "var(--bg-primary)" }}>
      <div className="max-w-[760px] mx-auto h-full flex items-center justify-between px-4 sm:px-6 gap-3">
        <span className="text-[13px] font-body truncate">
          Toi aussi, crée ton profil de lecteur — c'est gratuit.
        </span>
        <div className="flex items-center gap-3 shrink-0">
          <Link
            to="/login"
            className="text-[13px] font-medium font-body px-3 py-1 rounded-full transition-colors duration-150 no-underline whitespace-nowrap"
            style={{ color: "var(--bg-primary)", backgroundColor: "rgba(128,128,128,0.25)" }}
          >
            Rejoindre Reliure
          </Link>
          <button
            onClick={dismiss}
            aria-label="Fermer"
            className="bg-transparent border-none cursor-pointer transition-colors duration-150 p-1 opacity-60 hover:opacity-100"
            style={{ color: "var(--bg-primary)" }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
