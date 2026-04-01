import { useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../lib/AuthContext";
import { useClassement } from "../hooks/useClassement";
import Avatar from "../components/Avatar";

function initials(user) {
  return (user.display_name || user.username || "?")
    .split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2);
}

function RankNumber({ rank }) {
  if (rank === 1) return <span className="font-display italic text-[18px]" style={{ color: "#C9A84C", minWidth: 28, textAlign: "center" }}>1</span>;
  if (rank === 2) return <span className="font-display italic text-[16px]" style={{ color: "var(--text-tertiary)", minWidth: 28, textAlign: "center" }}>2</span>;
  if (rank === 3) return <span className="font-display italic text-[15px]" style={{ color: "var(--text-tertiary)", minWidth: 28, textAlign: "center" }}>3</span>;
  return <span className="font-body text-[13px]" style={{ color: "var(--text-muted)", minWidth: 28, textAlign: "center" }}>{rank}</span>;
}

function RankRow({ entry, rank, highlight = false }) {
  const name = entry.display_name || entry.username || "?";
  const pts = entry.month_points ?? entry.total_points ?? 0;

  return (
    <div
      className="flex items-center gap-3 py-3"
      style={
        highlight
          ? { backgroundColor: "var(--bg-surface)", borderRadius: 12, padding: "12px 14px", marginLeft: -14, marginRight: -14 }
          : {}
      }
    >
      <RankNumber rank={rank} />
      <Link to={`/${entry.username}`} className="shrink-0">
        <Avatar i={initials(entry)} s={34} src={entry.avatar_url || null} />
      </Link>
      <div className="flex-1 min-w-0">
        <Link
          to={`/${entry.username}`}
          className="block text-[14px] font-medium font-body leading-tight truncate no-underline hover:underline"
          style={{ color: "var(--text-primary)" }}
        >
          {name}
        </Link>
        <div className="text-[12px] font-body mt-0.5 truncate" style={{ color: "var(--text-tertiary)" }}>
          @{entry.username}
        </div>
      </div>
      <div className="text-[14px] font-body font-semibold shrink-0" style={{ color: "var(--text-primary)" }}>
        {pts} <span className="font-normal text-[12px]" style={{ color: "var(--text-muted)" }}>encre</span>
      </div>
    </div>
  );
}

export default function ClassementPage() {
  const [mode, setMode] = useState("monthly");
  const { user } = useAuth();
  const { rankings, userRank, userEntry, loading } = useClassement(mode, user?.id);

  const inTop20 = userRank !== null && userRank <= 20;

  return (
    <div className="sk-fade pb-16">
      <div className="pt-8 pb-3">
        <h1 className="font-display italic text-[28px] font-normal mb-1" style={{ color: "var(--text-primary)" }}>
          Classement
        </h1>
        <p className="text-[13px] font-body" style={{ color: "var(--text-muted)" }}>
          Les lecteurs les plus actifs de la communauté
        </p>
      </div>

      {/* Onglets */}
      <div className="flex gap-2 py-4">
        {[["monthly", "Ce mois"], ["alltime", "Tout temps"]].map(([val, label]) => (
          <button
            key={val}
            onClick={() => setMode(val)}
            className="px-4 py-1.5 rounded-full text-[13px] font-medium font-body border-none cursor-pointer transition-colors duration-150"
            style={
              mode === val
                ? { backgroundColor: "var(--text-primary)", color: "var(--bg-primary)" }
                : { backgroundColor: "var(--bg-surface)", color: "var(--text-muted)" }
            }
          >
            {label}
          </button>
        ))}
      </div>

      {/* Liste */}
      {loading ? (
        <div className="py-12 text-center text-[13px] font-body" style={{ color: "var(--text-muted)" }}>
          Chargement...
        </div>
      ) : rankings.length === 0 ? (
        <div className="py-12 text-center">
          <p className="text-[14px] font-body" style={{ color: "var(--text-tertiary)" }}>
            Pas encore assez d'activité ce mois-ci.
          </p>
          <p className="text-[13px] font-body mt-1" style={{ color: "var(--text-muted)" }}>
            Écris une critique ou sauvegarde une citation pour apparaître ici.
          </p>
        </div>
      ) : (
        <div>
          {rankings.map((entry, i) => (
            <RankRow
              key={entry.user_id}
              entry={entry}
              rank={i + 1}
              highlight={i < 3}
            />
          ))}

          {/* Rang personnel si hors top 20 */}
          {user && !inTop20 && userEntry && (
            <>
              <div className="flex items-center gap-2 py-3" style={{ color: "var(--text-muted)" }}>
                <div className="flex-1 border-t" style={{ borderColor: "var(--border-subtle)" }} />
                <span className="text-[11px] font-body shrink-0">···</span>
                <div className="flex-1 border-t" style={{ borderColor: "var(--border-subtle)" }} />
              </div>
              <RankRow entry={userEntry} rank={userRank} />
            </>
          )}
        </div>
      )}

      {/* Card rang personnel */}
      {user && (
        <div
          className="mt-8 p-4 rounded-xl"
          style={{ backgroundColor: "var(--bg-surface)", border: "1px solid var(--border-subtle)" }}
        >
          {mode === "monthly" ? (
            userEntry ? (
              <p className="text-[13px] font-body m-0" style={{ color: "var(--text-secondary)" }}>
                Ton classement ce mois : <strong style={{ color: "var(--text-primary)" }}>#{userRank}</strong>
                {" · "}
                <strong style={{ color: "var(--text-primary)" }}>{userEntry.month_points} encre</strong> gagnée
              </p>
            ) : (
              <p className="text-[13px] font-body m-0" style={{ color: "var(--text-muted)" }}>
                Tu n'as pas encore d'activité ce mois-ci.
              </p>
            )
          ) : (
            userEntry ? (
              <p className="text-[13px] font-body m-0" style={{ color: "var(--text-secondary)" }}>
                Ton classement tout temps : <strong style={{ color: "var(--text-primary)" }}>#{userRank}</strong>
                {" · "}
                <strong style={{ color: "var(--text-primary)" }}>{userEntry.total_points} encre</strong> au total
              </p>
            ) : (
              <p className="text-[13px] font-body m-0" style={{ color: "var(--text-muted)" }}>
                Commence à contribuer pour apparaître au classement.
              </p>
            )
          )}
        </div>
      )}
    </div>
  );
}
