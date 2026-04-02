import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { usePublicProfile } from "../hooks/usePublicProfile";
import { useUserPoints, useAllBadgeDefinitions } from "../hooks/useUserPoints";
import { CATEGORY_COLORS, TIER_COLORS } from "../hooks/useUserBadges";
import { useAuth } from "../lib/AuthContext";
import { supabase } from "../lib/supabase";
import { useQueryClient } from "@tanstack/react-query";
import Toast from "../components/Toast";
import { useToast } from "../hooks/useToast";
import NotFoundPage from "./NotFoundPage";
import BadgeIcon from "../components/BadgeIcon";
import Tooltip from "../components/Tooltip";

const CATEGORY_LABELS = {
  reading: "Lecture",
  contribution: "Contribution",
  social: "Social",
  challenge: "Défis",
  special: "Spécial",
};

const CATEGORY_ORDER = ["reading", "contribution", "social", "challenge", "special"];

export default function BadgesPage() {
  const { username } = useParams();
  const { user } = useAuth();
  const { profile, loading: profileLoading, notFound } = usePublicProfile(username);
  const { badges, pinnedBadges, loading: pointsLoading } = useUserPoints(profile?.id);
  const { definitions, loading: defsLoading } = useAllBadgeDefinitions();
  const queryClient = useQueryClient();
  const { toast, showToast } = useToast();
  const [pinning, setPinning] = useState(null);
  const [swapModal, setSwapModal] = useState(null); // badgeId à épingler, ou null

  // Fermer le modal swap avec Escape
  useEffect(() => {
    if (!swapModal) return;
    const handler = e => { if (e.key === "Escape") setSwapModal(null); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [swapModal]);

  if (profileLoading || pointsLoading || defsLoading) return null;
  if (notFound || !profile) return <NotFoundPage />;

  const isOwnProfile = user?.id === profile.id;
  const earnedMap = new Map(badges.map(b => [b.badge_id, b]));
  const pinnedIds = new Set(pinnedBadges.map(b => b.badge_id));

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["userBadges", profile.id] });
    queryClient.invalidateQueries({ queryKey: ["userPoints", profile.id] });
    queryClient.invalidateQueries({ queryKey: ["pinnedBadges"] });
  };

  const pinBadge = async (badgeId) => {
    if (pinnedIds.size >= 3) {
      setSwapModal(badgeId);
      return;
    }
    setPinning(badgeId);
    await supabase
      .from("user_badges")
      .update({ is_pinned: true })
      .eq("user_id", user.id)
      .eq("badge_id", badgeId);
    invalidate();
    setPinning(null);
  };

  const swapBadge = async (oldBadgeId) => {
    const newBadgeId = swapModal;
    setSwapModal(null);
    setPinning(newBadgeId);
    await supabase
      .from("user_badges")
      .update({ is_pinned: false })
      .eq("user_id", user.id)
      .eq("badge_id", oldBadgeId);
    await supabase
      .from("user_badges")
      .update({ is_pinned: true })
      .eq("user_id", user.id)
      .eq("badge_id", newBadgeId);
    invalidate();
    setPinning(null);
  };

  const unpinBadge = async (badgeId) => {
    setPinning(badgeId);
    await supabase
      .from("user_badges")
      .update({ is_pinned: false })
      .eq("user_id", user.id)
      .eq("badge_id", badgeId);
    invalidate();
    setPinning(null);
  };

  // Group tiered badges: show only highest earned tier per group_key
  const highestEarnedTier = new Map(); // group_key → tier number
  const TIER_ORDER = ["bronze", "argent", "or", "emeraude", "saphir", "diamant"];
  for (const def of definitions) {
    if (def.group_key && def.tier && earnedMap.has(def.id)) {
      const tierIdx = TIER_ORDER.indexOf(def.tier);
      const prev = highestEarnedTier.get(def.group_key) ?? -1;
      if (tierIdx > prev) highestEarnedTier.set(def.group_key, tierIdx);
    }
  }
  // Filter: for tiered groups, show only highest earned + next unearned; for non-tiered, show all
  const visibleDefs = definitions.filter(def => {
    if (!def.group_key || !def.tier) return true;
    const tierIdx = TIER_ORDER.indexOf(def.tier);
    const highest = highestEarnedTier.get(def.group_key) ?? -1;
    return tierIdx <= highest + 1;
  });

  // Group definitions by category
  const byCategory = {};
  for (const def of visibleDefs) {
    if (!byCategory[def.category]) byCategory[def.category] = [];
    byCategory[def.category].push(def);
  }

  return (
    <div className="sk-fade pb-16">
      {toast.visible && <Toast message={toast.message} />}

      {/* Retour */}
      <div className="py-4">
        <Link
          to={`/${username}`}
          className="text-[13px] font-body hover:opacity-70 transition-opacity duration-150"
          style={{ color: "var(--text-tertiary)" }}
        >
          ← {profile.display_name || profile.username}
        </Link>
      </div>

      <h1 className="font-display text-[20px] font-normal mb-0.5">
        Collection de badges
      </h1>
      <p className="text-[13px] font-body mb-8" style={{ color: "var(--text-tertiary)" }}>
        {badges.filter(b => !b.expired).length} badge{badges.filter(b => !b.expired).length !== 1 ? "s" : ""} débloqué{badges.filter(b => !b.expired).length !== 1 ? "s" : ""}
      </p>

      {/* ── Vitrine (own profile only) ── */}
      {isOwnProfile && (
        <div className="mb-10">
          <div className="text-[14px] font-display mb-1">Ma vitrine</div>
          <div className="text-[12px] font-body mb-4" style={{ color: "var(--text-tertiary)" }}>
            Choisis 3 badges à afficher sur ton profil
          </div>
          <div className="flex gap-5 justify-center">
            {[0, 1, 2].map(slot => {
              const pinned = pinnedBadges[slot];
              const def = pinned ? pinned.badge_definitions : null;
              const color = def ? ((def.tier && TIER_COLORS[def.tier]) || CATEGORY_COLORS[def.category] || "var(--text-tertiary)") : null;

              if (!def) {
                return (
                  <div key={slot} className="flex flex-col items-center gap-1.5">
                    <div
                      className="flex items-center justify-center rounded-full"
                      style={{
                        width: 56,
                        height: 56,
                        border: "2px dashed var(--border-default)",
                      }}
                    >
                      <span className="text-[18px]" style={{ color: "var(--text-muted)" }}>+</span>
                    </div>
                    <span className="text-[10px] font-body" style={{ color: "var(--text-muted)" }}>&nbsp;</span>
                  </div>
                );
              }

              return (
                <div key={slot} className="flex flex-col items-center gap-1.5 relative group/slot">
                  <div className="transition-transform duration-150">
                    <BadgeIcon badgeId={def.id} iconKey={def.icon_key} category={def.category} tier={def.tier} size={56} />
                    {/* × button on hover */}
                    <button
                      onClick={() => unpinBadge(pinned.badge_id)}
                      disabled={pinning === pinned.badge_id}
                      className="absolute -top-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center text-[11px] opacity-0 group-hover/slot:opacity-100 transition-opacity duration-150 cursor-pointer border-none"
                      style={{
                        backgroundColor: "var(--bg-elevated)",
                        color: "var(--text-tertiary)",
                        boxShadow: "0 1px 3px rgba(0,0,0,0.15)",
                      }}
                      aria-label="Retirer"
                    >
                      ×
                    </button>
                  </div>
                  <span className="text-[10px] font-body font-medium text-center leading-tight max-w-[64px]" style={{ color: "var(--text-secondary)" }}>
                    {def.name}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Collection grid ── */}
      {CATEGORY_ORDER.filter(cat => byCategory[cat]?.length > 0).map(cat => (
        <div key={cat} className="mb-10">
          <div
            className="text-[10px] font-medium font-body uppercase tracking-widest mb-4"
            style={{ color: "var(--text-tertiary)", letterSpacing: "0.12em" }}
          >
            {CATEGORY_LABELS[cat]}
          </div>
          <div className="grid grid-cols-3 sm:grid-cols-4 gap-5">
            {byCategory[cat].map(def => {
              const earned = earnedMap.get(def.id);
              const isExpired = earned?.expired ?? false;
              const unlocked = !!earned && !isExpired;
              const isPinned = pinnedIds.has(def.id);

              return (
                <div
                  key={def.id}
                  className={`flex flex-col items-center gap-2 text-center relative group/badge ${isPinned ? "animate-pinned" : ""}`}
                  style={{ opacity: unlocked ? 1 : 0.3 }}
                >
                  <Tooltip
                    multiline
                    text={
                      <>
                        <div style={{ fontWeight: 600, fontSize: 12, whiteSpace: "nowrap" }}>{def.name}</div>
                        {def.description && <div style={{ fontSize: 11, opacity: 0.7, marginTop: 2 }}>{def.description}</div>}
                      </>
                    }
                  >
                    <span className="inline-block">
                      <BadgeIcon badgeId={def.id} iconKey={def.icon_key} category={def.category} tier={unlocked ? def.tier : null} size={52} locked={!unlocked} />
                    </span>
                  </Tooltip>
                  <div>
                    <div className="text-[12px] font-medium font-body leading-tight" style={{ color: "var(--text-primary)" }}>
                      {def.name}
                      {def.tier && (
                        <span className="ml-1 text-[10px] font-normal capitalize" style={{ color: TIER_COLORS[def.tier] || "var(--text-tertiary)" }}>
                          {def.tier}
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] font-body leading-snug mt-0.5" style={{ color: "var(--text-tertiary)" }}>
                      {def.description}
                    </div>
                    {unlocked && earned.awarded_at && (
                      <div className="text-[10px] font-body mt-1" style={{ color: "var(--text-muted)" }}>
                        {new Date(earned.awarded_at).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" })}
                      </div>
                    )}
                  </div>

                  {/* Pin/Unpin pill (own profile, unlocked only) */}
                  {isOwnProfile && unlocked && (
                    isPinned ? (
                      <button
                        onClick={() => unpinBadge(def.id)}
                        disabled={pinning === def.id}
                        className="text-[10px] font-body font-medium cursor-pointer transition-opacity duration-150 hover:opacity-70 px-2.5 py-0.5 rounded-full border"
                        style={{
                          color: (def.tier && TIER_COLORS[def.tier]) || CATEGORY_COLORS[def.category] || "var(--text-tertiary)",
                          borderColor: ((def.tier && TIER_COLORS[def.tier]) || CATEGORY_COLORS[def.category] || "var(--text-tertiary)") + "40",
                          backgroundColor: ((def.tier && TIER_COLORS[def.tier]) || CATEGORY_COLORS[def.category] || "var(--text-tertiary)") + "10",
                        }}
                      >
                        Épinglé ✓
                      </button>
                    ) : (
                      <button
                        onClick={() => pinBadge(def.id)}
                        disabled={pinning === def.id}
                        className="text-[10px] font-body cursor-pointer px-2.5 py-0.5 rounded-full border transition-opacity duration-150 hover:opacity-70"
                        style={{
                          color: "var(--text-muted)",
                          borderColor: "var(--border-default)",
                          backgroundColor: "transparent",
                        }}
                      >
                        Épingler
                      </button>
                    )
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ))}

      {/* Modal swap — "Quel badge remplacer ?" */}
      {swapModal && (
        <>
          <div
            onClick={() => setSwapModal(null)}
            style={{ position: "fixed", inset: 0, zIndex: 9998, backgroundColor: "rgba(0,0,0,0.4)" }}
          />
          <div style={{ position: "fixed", inset: 0, zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center", padding: "0 20px" }}>
            <div
              onClick={e => e.stopPropagation()}
              style={{ backgroundColor: "var(--bg-primary)", border: "1px solid var(--border-subtle)", borderRadius: 16, padding: 24, boxShadow: "0 8px 40px rgba(0,0,0,0.16)", maxWidth: 360, width: "100%" }}
            >
              <h2 className="font-display font-normal mb-5 text-center" style={{ fontSize: 18, color: "var(--text-primary)", margin: "0 0 20px" }}>
                Quel badge remplacer ?
              </h2>
              <div className="flex justify-center gap-6">
                {pinnedBadges.map(b => {
                  const d = b.badge_definitions;
                  const color = (d?.tier && TIER_COLORS[d.tier]) || CATEGORY_COLORS[d?.category] || "var(--text-tertiary)";
                  return (
                    <button
                      key={b.badge_id}
                      onClick={() => swapBadge(b.badge_id)}
                      className="flex flex-col items-center gap-1.5 bg-transparent border-none cursor-pointer transition-opacity duration-150 hover:opacity-70 p-0"
                    >
                      <BadgeIcon badgeId={d?.id} iconKey={d?.icon_key} category={d?.category} tier={d?.tier} size={48} />
                      <span className="text-[11px] font-body font-medium text-center" style={{ color: "var(--text-secondary)", maxWidth: 72, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {d?.name}
                      </span>
                    </button>
                  );
                })}
              </div>
              <button
                onClick={() => setSwapModal(null)}
                className="block w-full mt-5 text-[12px] font-body bg-transparent border-none cursor-pointer hover:opacity-70 transition-opacity duration-150"
                style={{ color: "var(--text-muted)" }}
              >
                Annuler
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
