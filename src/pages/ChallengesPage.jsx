import { useState } from "react";
import { CHALLENGE } from "../data/challenges";
import Avatar from "../components/Avatar";
import Label from "../components/Label";

function ProgressCircle({ completed, total, size = 80 }) {
  const r = (size - 8) / 2;
  const circumference = 2 * Math.PI * r;
  const pct = Math.min(completed / total, 1);
  const offset = circumference * (1 - pct);
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#f0ede8" strokeWidth="4" />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#1a1a1a" strokeWidth="4" strokeLinecap="round" strokeDasharray={circumference} strokeDashoffset={offset} className="transition-all duration-500" />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-xl font-bold font-body leading-none">{completed}</span>
        <span className="text-[9px] text-[#767676] font-body">/{total}</span>
      </div>
    </div>
  );
}

function StarRating({ rating }) {
  return <span className="text-[10px] text-star tracking-wide">{"★".repeat(Math.floor(rating))}{rating % 1 >= 0.5 ? "½" : ""}</span>;
}

function ParticipantView() {
  const [filter, setFilter] = useState("tous");
  const c = CHALLENGE;
  const target = c.tiers.find(t => t.name === c.targetTier);
  const completed = c.items.filter(i => i.completed);
  const todo = c.items.filter(i => !i.completed);

  const filtered = filter === "complétés" ? completed : filter === "à faire" ? todo : c.items;

  return (
    <div>
      {/* Header */}
      <div className="flex flex-col sm:flex-row gap-5 sm:gap-6 items-center sm:items-start mb-6">
        <ProgressCircle completed={c.completedCount} total={target.required} size={80} />
        <div className="text-center sm:text-left">
          <h1 className="font-display italic text-xl sm:text-2xl font-normal m-0 leading-tight">{c.title}</h1>
          <div className="text-[13px] font-body mt-1">
            Objectif : <span className="font-medium text-[#8B6914]">{c.targetTier}</span>
          </div>
          <div className="text-[13px] font-body">
            Palier actuel : <span className="font-medium">{c.currentTier}</span>
          </div>
          <div className="text-xs text-[#767676] font-body mt-1">
            Par {c.creator} · {c.participants} participants · Jan — Déc 2026
          </div>
        </div>
      </div>

      {/* Filters */}
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
              filter === k
                ? "bg-[#1a1a1a] text-white"
                : "bg-surface text-[#767676] hover:text-[#1a1a1a]"
            }`}
          >
            {l}
          </button>
        ))}
      </div>

      {/* Timeline */}
      <div className="border-l-2 border-avatar-bg pl-5 ml-2">
        {filtered.map(item => (
          <div key={item.id} className="relative pb-7 last:pb-0">
            {/* Dot */}
            <div
              className={`absolute -left-[27px] top-[2px] w-3 h-3 rounded-full ${
                item.completed ? "bg-[#1a1a1a]" : "bg-avatar-bg border-2 border-[#ddd]"
              }`}
            />

            {/* Code + badge */}
            <div className="flex items-center gap-2 mb-1">
              <span className={`text-[11px] font-semibold font-body ${item.completed ? "text-[#1a1a1a]" : "text-[#767676]"}`}>
                {item.code}
              </span>
              {item.completed && (
                <span className="text-[9px] font-medium px-1.5 py-[2px] rounded-lg bg-[#e8f5e9] text-[#2e7d32] font-body">Complété</span>
              )}
              {item.difficulty === "Difficile" && (
                <span className="text-[9px] font-medium px-1.5 py-[2px] rounded-lg bg-[#faf6f0] border border-[#e8dfd2] text-[#8B6914] font-body">Difficile</span>
              )}
            </div>

            {/* Title */}
            <div className="text-[13px] text-[#1a1a1a] font-body mb-1.5">{item.title}</div>

            {item.completed && item.myBook ? (
              /* My response */
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-12 rounded-sm bg-cover-fallback shrink-0" />
                  <div>
                    <div className="text-[11px] font-display italic text-[#1a1a1a]">{item.myBook.title}</div>
                    <div className="text-[10px] text-[#767676] font-body flex items-center gap-1">
                      {item.myBook.date} · <StarRating rating={item.myBook.rating} />
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-0.5">
                  {[1, 2, 3].map(i => (
                    <div key={i} className="w-6 h-9 rounded-sm bg-[#d8d0c8]" />
                  ))}
                  <span className="text-[9px] text-[#767676] font-body ml-1">+{item.responses - 4}</span>
                </div>
              </div>
            ) : (
              /* Todo */
              <div className="flex items-center justify-between">
                <div className="text-[11px] text-[#767676] font-body">
                  Mod. : {item.mod} · {item.responses} réponses
                </div>
                <button className="px-3 py-[5px] rounded-[14px] text-[11px] font-body bg-transparent border-[1.5px] border-dashed border-[#ddd] text-[#767676] cursor-pointer hover:border-[#767676] hover:text-[#1a1a1a] transition-colors duration-150">
                  + Soumettre
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function PublicView() {
  const c = CHALLENGE;
  return (
    <div>
      {/* Hero */}
      <div className="text-center mb-8">
        <div className="flex justify-center mb-4">
          <div className="w-16 h-16 rounded-2xl bg-[#faf6f0] border-[1.5px] border-[#e8dfd2] flex items-center justify-center">
            <span className="text-[28px] text-star">★</span>
          </div>
        </div>
        <h1 className="font-display italic text-[24px] sm:text-[28px] font-normal m-0 leading-tight">{c.title}</h1>
        <p className="text-sm text-[#737373] leading-relaxed max-w-[400px] mx-auto mt-2 font-body">{c.description}</p>
        <div className="text-xs text-[#767676] font-body mt-2">Par {c.creator} · {c.startDate} — {c.endDate}</div>
      </div>

      {/* Stats */}
      <div className="flex justify-center gap-6 sm:gap-10 mb-8">
        {[
          [String(c.participants), "participants"],
          [`~${c.totalItems}`, "items"],
          [String(c.tiers.length), "paliers"],
        ].map(([v, l]) => (
          <div key={l} className="text-center">
            <div className="text-[22px] font-bold font-body">{v}</div>
            <div className="text-[11px] text-[#767676] font-body">{l}</div>
          </div>
        ))}
      </div>

      {/* Join button */}
      <div className="flex justify-center mb-8">
        <button className="px-7 py-2.5 rounded-[20px] text-[13px] font-medium font-body bg-[#1a1a1a] text-white border-none cursor-pointer hover:bg-[#333] transition-colors duration-150">
          Rejoindre ce challenge
        </button>
      </div>

      <div className="border-t border-border-light pt-6 mb-6">
        <Label>Paliers</Label>
        <div className="flex flex-wrap gap-1.5">
          {c.tiers.map(t => {
            const isTop = t.name === "Rossignol";
            return (
              <span
                key={t.name}
                className={`px-3 py-1 rounded-xl text-[11px] font-body ${
                  isTop
                    ? "bg-[#faf6f0] border border-[#e8dfd2] text-[#8B6914] font-medium"
                    : "bg-surface text-[#767676]"
                }`}
              >
                {isTop && <span className="text-star mr-0.5">★</span>}
                {t.name} · {t.required}
              </span>
            );
          })}
        </div>
      </div>

      <div className="border-t border-border-light pt-6 mb-6">
        <Label>Aperçu des items</Label>
        {c.items.slice(0, 5).map(item => (
          <div key={item.id} className="py-3" style={{ borderBottom: "0.5px solid #f0f0f0" }}>
            <div className="text-[11px] font-body">
              <span className="font-semibold text-[#1a1a1a]">{item.code}</span>
              <span className="text-[#767676]"> · {item.responses} réponses</span>
            </div>
            <div className="text-[13px] text-[#1a1a1a] font-body mt-0.5">{item.title}</div>
          </div>
        ))}
        <div className="text-center mt-3">
          <span className="text-[13px] text-[#767676] font-body cursor-pointer hover:text-[#1a1a1a] transition-colors duration-150">
            Voir les {c.totalItems} items ›
          </span>
        </div>
      </div>

      <div className="border-t border-border-light pt-6">
        <Label>Participants récents</Label>
        <div className="flex items-center">
          {["ML", "TB", "CD", "SK", "LR"].map((initials, i) => (
            <div
              key={initials}
              className="w-8 h-8 rounded-full bg-avatar-bg flex items-center justify-center text-[10px] font-medium text-[#6b6b6b] font-body border-2 border-white"
              style={{ marginLeft: i > 0 ? -8 : 0, zIndex: 5 - i }}
            >
              {initials}
            </div>
          ))}
          <span className="text-[11px] text-[#767676] font-body ml-2">+{c.participants - 5}</span>
        </div>
      </div>
    </div>
  );
}

export default function ChallengesPage() {
  const [view, setView] = useState("progression");

  return (
    <div className="pt-5">
      {/* Toggle */}
      <div className="flex justify-center mb-6">
        <div className="inline-flex rounded-lg bg-surface p-[3px]">
          {[["progression", "Ma progression"], ["publique", "Page publique"]].map(([k, l]) => (
            <button
              key={k}
              onClick={() => setView(k)}
              className={`px-4 py-1.5 rounded-md text-[12px] font-medium font-body border-none cursor-pointer transition-all duration-150 ${
                view === k
                  ? "bg-white text-[#1a1a1a] shadow-[0_1px_3px_rgba(0,0,0,0.08)]"
                  : "bg-transparent text-[#767676]"
              }`}
            >
              {l}
            </button>
          ))}
        </div>
      </div>

      {view === "progression" ? <ParticipantView /> : <PublicView />}
    </div>
  );
}
