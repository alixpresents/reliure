export function meta() {
  return [
    { title: "Défis de lecture — Reliure" },
    { name: "description", content: "Participez aux défis de lecture de la communauté Reliure." },
    { property: "og:title", content: "Défis de lecture — Reliure" },
    { property: "og:description", content: "Participez aux défis de lecture de la communauté Reliure." },
    { property: "og:type", content: "website" },
    { property: "og:site_name", content: "Reliure" },
    { name: "twitter:card", content: "summary_large_image" },
  ];
}

import { useState } from "react";
import { CHALLENGE, CHALLENGES_LIST } from "../data/challenges";
import Avatar from "../components/Avatar";
import Label from "../components/Label";
import Stars from "../components/Stars";
import WipBanner from "../components/WipBanner";

function MiniProgress({ completed, total, size = 40 }) {
  const r = (size - 6) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ * (1 - Math.min(completed / total, 1));
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--avatar-bg)" strokeWidth="3" />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--text-primary)" strokeWidth="3" strokeLinecap="round" strokeDasharray={circ} strokeDashoffset={offset} />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-xs font-bold font-body leading-none">{completed}</span>
      </div>
    </div>
  );
}

function ProgressCircle({ completed, total, size = 80 }) {
  const r = (size - 8) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ * (1 - Math.min(completed / total, 1));
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--avatar-bg)" strokeWidth="4" />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--text-primary)" strokeWidth="4" strokeLinecap="round" strokeDasharray={circ} strokeDashoffset={offset} className="transition-all duration-500" />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-xl font-bold font-body leading-none">{completed}</span>
        <span className="text-[9px] font-body" style={{ color: "var(--text-tertiary)" }}>/{total}</span>
      </div>
    </div>
  );
}


/* ── Index page ── */
function ChallengesIndex({ onSelect, enrolled, onJoin }) {
  const mine = CHALLENGES_LIST.filter(c => enrolled.has(c.id));
  const discover = CHALLENGES_LIST.filter(c => !enrolled.has(c.id));

  return (
    <div className="pt-5">
      <h1 className="font-display text-[26px] font-normal m-0 leading-tight">Défis</h1>
      <p className="text-[13px] font-body mt-1 mb-6" style={{ color: "var(--text-tertiary)" }}>Rejoins un défi de lecture et découvre de nouveaux livres.</p>

      {mine.length > 0 && (
        <div className="mb-6">
          <Label>Mes challenges</Label>
          <div className="flex flex-col gap-2">
            {mine.map(c => (
              <div
                key={c.id}
                role="button"
                tabIndex={0}
                onClick={() => onSelect(c.id, "progression")}
                onKeyDown={e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onSelect(c.id, "progression"); } }}
                className="flex items-center gap-4 p-4 bg-surface rounded-[10px] cursor-pointer hover:bg-surface transition-colors duration-150"
              >
                <div className="w-11 h-11 rounded-[10px] flex items-center justify-center shrink-0" style={{ backgroundColor: "var(--color-wip-bg)", border: "1.5px solid var(--color-wip-border)" }}>
                  <span className="text-[18px] text-star">{c.icon}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-[15px] font-medium font-body truncate">{c.title}</div>
                  <div className="text-xs font-body" style={{ color: "var(--text-tertiary)" }}>Par {c.creator} · {c.participants} participants</div>
                </div>
                <div className="flex flex-col items-center shrink-0">
                  <MiniProgress completed={c.progress} total={c.target} />
                  <span className="text-[9px] font-body mt-0.5" style={{ color: "var(--text-tertiary)" }}>{c.progress}/{c.target}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div>
        <Label>Découvrir</Label>
        <div className="flex flex-col gap-2">
          {discover.map(c => (
            <div
              key={c.id}
              role="button"
              tabIndex={0}
              onClick={() => onSelect(c.id, "publique")}
              onKeyDown={e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onSelect(c.id, "publique"); } }}
              className="flex items-center gap-4 p-4 bg-surface rounded-[10px] cursor-pointer hover:bg-surface transition-colors duration-150"
            >
              <div className="w-11 h-11 rounded-[10px] flex items-center justify-center shrink-0" style={{ backgroundColor: "var(--color-wip-bg)", border: "1.5px solid var(--color-wip-border)" }}>
                <span className="text-[18px] text-star">{c.icon}</span>
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-[15px] font-medium font-body truncate">{c.title}</div>
                <div className="text-xs font-body" style={{ color: "var(--text-tertiary)" }}>Par {c.creator} · {c.participants} participants</div>
              </div>
              <button
                onClick={e => { e.stopPropagation(); onJoin(c.id); }}
                className="px-3 py-[5px] rounded-[14px] text-[11px] font-medium font-body bg-transparent border-[1.5px] cursor-pointer transition-colors duration-150 shrink-0 hover:opacity-80"
                style={{ borderColor: "var(--border-default)", color: "var(--text-tertiary)" }}
              >
                Rejoindre
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ── Participant view ── */
function ParticipantView() {
  const [filter, setFilter] = useState("tous");
  const c = CHALLENGE;
  const target = c.tiers.find(t => t.name === c.targetTier);
  const completed = c.items.filter(i => i.completed);
  const todo = c.items.filter(i => !i.completed);
  const filtered = filter === "complétés" ? completed : filter === "à faire" ? todo : c.items;

  return (
    <div>
      <div className="flex flex-col sm:flex-row gap-5 sm:gap-6 items-center sm:items-start mb-6">
        <ProgressCircle completed={c.completedCount} total={target.required} size={80} />
        <div className="text-center sm:text-left">
          <h1 className="font-display text-xl sm:text-2xl font-normal m-0 leading-tight">{c.title}</h1>
          <div className="text-[13px] font-body mt-1">
            Objectif : <span className="font-medium" style={{ color: "var(--color-wip-text)" }}>{c.targetTier}</span>
          </div>
          <div className="text-[13px] font-body">
            Palier actuel : <span className="font-medium">{c.currentTier}</span>
          </div>
          <div className="text-xs font-body mt-1" style={{ color: "var(--text-tertiary)" }}>
            Par {c.creator} · {c.participants} participants · Jan — Déc 2026
          </div>
        </div>
      </div>

      <div className="flex gap-2 overflow-x-auto mb-6" style={{ scrollbarWidth: "none" }}>
        {[
          ["tous", `Tous (${c.totalItems})`],
          ["complétés", `Complétés (${c.completedCount})`],
          ["à faire", `À faire (${c.totalItems - c.completedCount})`],
        ].map(([k, l]) => (
          <button
            key={k}
            onClick={() => setFilter(k)}
            className={`shrink-0 px-3.5 py-[5px] rounded-[14px] text-[11px] font-medium font-body border-none cursor-pointer transition-all duration-150 ${
              filter === k ? "" : "bg-surface hover:opacity-80"
            }`}
            style={filter === k ? { backgroundColor: "var(--text-primary)", color: "var(--bg-primary)" } : { color: "var(--text-tertiary)" }}
          >{l}</button>
        ))}
      </div>

      <div className="border-l-2 border-avatar-bg pl-5 ml-2">
        {filtered.map(item => (
          <div key={item.id} className="relative pb-7 last:pb-0">
            <div className={`absolute -left-[27px] top-[2px] w-3 h-3 rounded-full ${item.completed ? "" : "bg-avatar-bg border-2"}`} style={item.completed ? { backgroundColor: "var(--text-primary)" } : { borderColor: "var(--border-default)" }} />
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[11px] font-semibold font-body" style={{ color: item.completed ? "var(--text-primary)" : "var(--text-tertiary)" }}>{item.code}</span>
              {item.completed && <span className="text-[9px] font-medium px-1.5 py-[2px] rounded-lg font-body" style={{ backgroundColor: "var(--color-success-bg)", color: "var(--color-success)" }}>Complété</span>}
              {item.difficulty === "Difficile" && <span className="text-[9px] font-medium px-1.5 py-[2px] rounded-lg font-body" style={{ backgroundColor: "var(--color-wip-bg)", border: "1px solid var(--color-wip-border)", color: "var(--color-wip-text)" }}>Difficile</span>}
            </div>
            <div className="text-[13px] font-body mb-1.5" style={{ color: "var(--text-primary)" }}>{item.title}</div>
            {item.completed && item.myBook ? (
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-12 rounded-sm bg-cover-fallback shrink-0" />
                  <div>
                    <div className="text-[11px] font-display" style={{ color: "var(--text-primary)" }}>{item.myBook.title}</div>
                    <div className="text-[10px] font-body flex items-center gap-1" style={{ color: "var(--text-tertiary)" }}>{item.myBook.date} · <Stars r={item.myBook.rating} s={10} /></div>
                  </div>
                </div>
                <div className="flex items-center gap-0.5">
                  {[1, 2, 3].map(i => <div key={i} className="w-6 h-9 rounded-sm bg-cover-fallback" />)}
                  <span className="text-[9px] font-body ml-1" style={{ color: "var(--text-tertiary)" }}>+{item.responses - 4}</span>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-between">
                <div className="text-[11px] font-body" style={{ color: "var(--text-tertiary)" }}>Mod. : {item.mod} · {item.responses} réponses</div>
                <button className="px-3 py-[5px] rounded-[14px] text-[11px] font-body bg-transparent border-[1.5px] border-dashed cursor-pointer hover:opacity-80 transition-colors duration-150" style={{ borderColor: "var(--border-default)", color: "var(--text-tertiary)" }}>+ Soumettre</button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── Public view ── */
function PublicView() {
  const c = CHALLENGE;
  return (
    <div>
      <div className="text-center mb-8">
        <div className="flex justify-center mb-4">
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center" style={{ backgroundColor: "var(--color-wip-bg)", border: "1.5px solid var(--color-wip-border)" }}>
            <span className="text-[28px] text-star">★</span>
          </div>
        </div>
        <h1 className="font-display text-[24px] sm:text-[28px] font-normal m-0 leading-tight">{c.title}</h1>
        <p className="text-sm leading-relaxed max-w-[400px] mx-auto mt-2 font-body" style={{ color: "var(--text-tertiary)" }}>{c.description}</p>
        <div className="text-xs font-body mt-2" style={{ color: "var(--text-tertiary)" }}>Par {c.creator} · {c.startDate} — {c.endDate}</div>
      </div>

      <div className="flex justify-center gap-6 sm:gap-10 mb-8">
        {[[String(c.participants), "participants"], [`~${c.totalItems}`, "items"], [String(c.tiers.length), "paliers"]].map(([v, l]) => (
          <div key={l} className="text-center">
            <div className="text-[22px] font-bold font-body">{v}</div>
            <div className="text-[11px] font-body" style={{ color: "var(--text-tertiary)" }}>{l}</div>
          </div>
        ))}
      </div>

      <div className="flex justify-center mb-8">
        <button className="px-7 py-2.5 rounded-[20px] text-[13px] font-medium font-body border-none cursor-pointer hover:opacity-80 transition-colors duration-150" style={{ backgroundColor: "var(--text-primary)", color: "var(--bg-primary)" }}>Rejoindre ce challenge</button>
      </div>

      <div className="border-t border-border-light pt-6 mb-6">
        <Label>Paliers</Label>
        <div className="flex flex-wrap gap-1.5">
          {c.tiers.map(t => {
            const isTop = t.name === "Rossignol";
            return (
              <span key={t.name} className={`px-3 py-1 rounded-xl text-[11px] font-body ${isTop ? "font-medium" : "bg-surface"}`} style={isTop ? { backgroundColor: "var(--color-wip-bg)", border: "1px solid var(--color-wip-border)", color: "var(--color-wip-text)" } : { color: "var(--text-tertiary)" }}>
                {isTop && <span className="text-star mr-0.5">★</span>}{t.name} · {t.required}
              </span>
            );
          })}
        </div>
      </div>

      <div className="border-t border-border-light pt-6 mb-6">
        <Label>Aperçu des items</Label>
        {c.items.slice(0, 5).map(item => (
          <div key={item.id} className="py-3" style={{ borderBottom: "0.5px solid var(--border-subtle)" }}>
            <div className="text-[11px] font-body"><span className="font-semibold" style={{ color: "var(--text-primary)" }}>{item.code}</span><span style={{ color: "var(--text-tertiary)" }}> · {item.responses} réponses</span></div>
            <div className="text-[13px] font-body mt-0.5" style={{ color: "var(--text-primary)" }}>{item.title}</div>
          </div>
        ))}
        <div className="text-center mt-3">
          <span className="text-[13px] font-body cursor-pointer hover:opacity-80 transition-colors duration-150" style={{ color: "var(--text-tertiary)" }}>Voir les {c.totalItems} items ›</span>
        </div>
      </div>

      <div className="border-t border-border-light pt-6">
        <Label>Participants récents</Label>
        <div className="flex items-center">
          {["ML", "TB", "CD", "SK", "LR"].map((initials, i) => (
            <div key={initials} className="w-8 h-8 rounded-full bg-avatar-bg flex items-center justify-center text-[10px] font-medium font-body border-2" style={{ marginLeft: i > 0 ? -8 : 0, zIndex: 5 - i, color: "var(--text-secondary)", borderColor: "var(--bg-primary)" }}>{initials}</div>
          ))}
          <span className="text-[11px] font-body ml-2" style={{ color: "var(--text-tertiary)" }}>+{c.participants - 5}</span>
        </div>
      </div>
    </div>
  );
}

/* ── Main component ── */
export default function ChallengesPage() {
  const [selectedId, setSelectedId] = useState(null);
  const [view, setView] = useState("progression");
  const [enrolled, setEnrolled] = useState(() => new Set(CHALLENGES_LIST.filter(c => c.enrolled).map(c => c.id)));

  const handleSelect = (id, defaultView) => {
    setSelectedId(id);
    setView(defaultView);
    window.scrollTo(0, 0);
  };

  const handleJoin = id => {
    setEnrolled(prev => new Set([...prev, id]));
  };

  const handleBack = () => {
    setSelectedId(null);
    window.scrollTo(0, 0);
  };

  const banner = <div className="-mx-4 sm:-mx-6 mb-5"><WipBanner /></div>;

  if (selectedId === null) {
    return <><div className="-mx-4 sm:-mx-6"><WipBanner /></div><ChallengesIndex onSelect={handleSelect} enrolled={enrolled} onJoin={handleJoin} /></>;
  }

  return (
    <div>
      {banner}
      <div className="pt-5">
      {/* Back */}
      <button onClick={handleBack} className="bg-transparent border-none cursor-pointer text-[13px] pb-4 font-body" style={{ color: "var(--text-tertiary)" }}>← Défis</button>

      {/* Toggle */}
      <div className="flex justify-center mb-6">
        <div className="inline-flex rounded-lg bg-surface p-[3px]">
          {[["progression", "Ma progression"], ["publique", "Page publique"]].map(([k, l]) => (
            <button
              key={k}
              onClick={() => setView(k)}
              className={`px-4 py-1.5 rounded-md text-[12px] font-medium font-body border-none cursor-pointer transition-all duration-150 ${
                view === k ? "shadow-[0_1px_3px_rgba(0,0,0,0.08)]" : "bg-transparent"
              }`}
              style={view === k ? { backgroundColor: "var(--bg-elevated)", color: "var(--text-primary)" } : { color: "var(--text-tertiary)" }}
            >{l}</button>
          ))}
        </div>
      </div>

      {view === "progression" ? <ParticipantView /> : <PublicView />}
      </div>
    </div>
  );
}
