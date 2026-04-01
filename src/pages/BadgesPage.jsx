import { useParams, Link } from "react-router-dom";
import { usePublicProfile } from "../hooks/usePublicProfile";
import { useUserPoints, useAllBadgeDefinitions } from "../hooks/useUserPoints";
import NotFoundPage from "./NotFoundPage";

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
  const { profile, loading: profileLoading, notFound } = usePublicProfile(username);
  const { badges, loading: pointsLoading } = useUserPoints(profile?.id);
  const { definitions, loading: defsLoading } = useAllBadgeDefinitions();

  if (profileLoading || pointsLoading || defsLoading) return null;
  if (notFound || !profile) return <NotFoundPage />;

  // Map des badges obtenus par badge_id
  const earnedMap = new Map(badges.map(b => [b.badge_id, b]));

  // Grouper les définitions par catégorie
  const byCategory = {};
  for (const def of definitions) {
    if (!byCategory[def.category]) byCategory[def.category] = [];
    byCategory[def.category].push(def);
  }

  return (
    <div className="sk-fade pb-16">
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

      <h1 className="font-display italic text-[26px] font-normal mb-1">
        Collection de badges
      </h1>
      <p className="text-[13px] font-body mb-8" style={{ color: "var(--text-tertiary)" }}>
        {badges.filter(b => !b.expired).length} badge{badges.filter(b => !b.expired).length !== 1 ? "s" : ""} débloqué{badges.filter(b => !b.expired).length !== 1 ? "s" : ""}
      </p>

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

              return (
                <div
                  key={def.id}
                  className="flex flex-col items-center gap-2 text-center"
                  style={{ opacity: unlocked ? 1 : 0.3 }}
                  title={unlocked ? (earned.awarded_at ? `Obtenu le ${new Date(earned.awarded_at).toLocaleDateString("fr-FR")}` : "") : "Non débloqué"}
                >
                  <div
                    className="flex items-center justify-center rounded-full"
                    style={{
                      width: 52,
                      height: 52,
                      backgroundColor: unlocked ? "var(--bg-elevated)" : "var(--avatar-bg)",
                      border: `1px solid ${unlocked ? "var(--border-default)" : "transparent"}`,
                      fontSize: 26,
                    }}
                  >
                    {def.icon}
                  </div>
                  <div>
                    <div className="text-[12px] font-medium font-body leading-tight" style={{ color: "var(--text-primary)" }}>
                      {def.name}
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
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
