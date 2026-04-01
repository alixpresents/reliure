import { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../lib/AuthContext";
import { useProfile } from "../hooks/useProfile";

const CATEGORY_COLORS = {
  reading:      "#4A7C6F",
  contribution: "#8B6914",
  social:       "#5B6ABF",
  challenge:    "#B8860B",
  special:      "#9B5DE5",
};

export default function BadgeToast({ badge, onDismiss }) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { profile } = useProfile();
  const timerRef = useRef(null);

  useEffect(() => {
    if (!badge) return;
    timerRef.current = setTimeout(() => onDismiss(), 5000);
    return () => clearTimeout(timerRef.current);
  }, [badge, onDismiss]);

  if (!badge) return null;

  const def = badge.badge_definitions;
  if (!def) return null;

  const color = CATEGORY_COLORS[def.category] || "var(--text-tertiary)";

  const handleViewBadges = () => {
    onDismiss();
    if (profile?.username) navigate(`/${profile.username}/badges`);
  };

  return (
    <div
      className="fixed z-[9999] animate-badge-toast-in"
      style={{ bottom: 24, right: 20, maxWidth: 300 }}
      role="alert"
    >
      <div
        className="flex items-start gap-3 p-4 rounded-xl cursor-pointer"
        style={{
          backgroundColor: "var(--bg-surface)",
          border: "1px solid var(--border-subtle)",
          boxShadow: "0 8px 24px rgba(0,0,0,0.12)",
        }}
        onClick={onDismiss}
      >
        {/* Icône */}
        <div
          className="flex items-center justify-center shrink-0"
          style={{
            width: 44,
            height: 44,
            borderRadius: "50%",
            backgroundColor: color + "18",
            border: `1px solid ${color}30`,
            fontSize: 22,
          }}
        >
          {def.icon}
        </div>

        {/* Texte */}
        <div className="flex-1 min-w-0">
          <div
            className="text-[11px] font-body font-semibold uppercase tracking-wide mb-0.5"
            style={{ color: color }}
          >
            Nouveau badge débloqué !
          </div>
          <div
            className="font-display italic text-[16px] font-normal leading-tight"
            style={{ color: "var(--text-primary)" }}
          >
            {def.name}
          </div>
          <div
            className="text-[12px] font-body leading-snug mt-0.5"
            style={{ color: "var(--text-tertiary)" }}
          >
            {def.description}
          </div>
          <button
            onClick={e => { e.stopPropagation(); handleViewBadges(); }}
            className="text-[11px] font-body mt-1.5 bg-transparent border-none p-0 cursor-pointer hover:underline"
            style={{ color: "var(--text-muted)" }}
          >
            Voir mes badges ›
          </button>
        </div>

        {/* Fermer */}
        <button
          onClick={e => { e.stopPropagation(); onDismiss(); }}
          className="shrink-0 bg-transparent border-none p-0 cursor-pointer opacity-40 hover:opacity-70 transition-opacity"
          style={{ color: "var(--text-primary)", marginTop: -2 }}
          aria-label="Fermer"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>
    </div>
  );
}
