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
    <div className="fixed bottom-0 left-0 right-0 z-[9990] bg-[#1a1a1a] text-white" style={{ height: 48 }}>
      <div className="max-w-[760px] mx-auto h-full flex items-center justify-between px-4 sm:px-6 gap-3">
        <span className="text-[13px] font-body truncate">
          Toi aussi, crée ton profil de lecteur — c'est gratuit.
        </span>
        <div className="flex items-center gap-3 shrink-0">
          <Link
            to="/login"
            className="text-[13px] font-medium font-body text-white bg-white/20 hover:bg-white/30 px-3 py-1 rounded-full transition-colors duration-150 no-underline whitespace-nowrap"
          >
            Rejoindre Reliure
          </Link>
          <button
            onClick={dismiss}
            aria-label="Fermer"
            className="bg-transparent border-none cursor-pointer text-white/60 hover:text-white transition-colors duration-150 p-1"
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
