export function meta() {
  return [
    { title: "La Revue — Reliure" },
    { name: "description", content: "Essais, entretiens et sélections littéraires sur Reliure." },
    { property: "og:title", content: "La Revue — Reliure" },
    { property: "og:description", content: "Essais, entretiens et sélections littéraires sur Reliure." },
    { property: "og:type", content: "website" },
    { property: "og:site_name", content: "Reliure" },
    { name: "twitter:card", content: "summary_large_image" },
  ];
}

import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { JARTICLES, JAGENDA } from "../data";
import Img from "../components/Img";
import Tag from "../components/Tag";
import Label from "../components/Label";
import WipBanner from "../components/WipBanner";
import { useCuratedSelections } from "../hooks/useCuratedSelections";
import CuratedSelectionCard from "../components/CuratedSelectionCard";

export default function JournalPage() {
  const navigate = useNavigate();
  const goArticle = (a) => navigate(`/la-revue/${a.id}`);
  const [jt, setJt] = useState("textes");
  const feat = JARTICLES[0];
  const { data: curatedSelections } = useCuratedSelections();
  const latestSelection = curatedSelections?.[0] || null;

  return (
    <div>
      <div className="-mx-4 sm:-mx-6 mb-5"><WipBanner /></div>
      <div className="pt-5">
      {/* Header */}
      <div className="py-4 pb-5 border-b" style={{ borderColor: "var(--border-default)" }}>
        <h2 className="text-[13px] font-semibold uppercase tracking-[3px] mb-1 font-body" style={{ color: "var(--text-primary)" }}>La Revue</h2>
        <p className="text-[13px] m-0 font-body" style={{ color: "var(--text-tertiary)" }}>
          Essais, entretiens et sélections éditoriales. Une publication de <span className="font-medium" style={{ color: "var(--text-secondary)" }}>Reliure</span>.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-0 border-b" style={{ borderColor: "var(--border-default)" }}>
        {["textes", "agenda", "archives"].map(t => (
          <button
            key={t}
            onClick={() => setJt(t)}
            className={`py-3 pr-5 bg-transparent border-none cursor-pointer text-xs capitalize font-body ${
              jt === t
                ? "font-semibold border-b-2"
                : "font-normal border-b-2 border-b-transparent"
            }`}
            style={{ color: jt === t ? "var(--text-primary)" : "var(--text-tertiary)", borderBottomColor: jt === t ? "var(--text-primary)" : "transparent" }}
          >
            {t}
          </button>
        ))}
      </div>

      {/* Textes */}
      {jt === "textes" && (
        <div>
          {/* Featured */}
          <div
            role="button"
            tabIndex={0}
            onClick={() => goArticle(feat)}
            onKeyDown={e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); goArticle(feat); } }}
            className="py-8 pb-7 cursor-pointer hover:bg-surface -mx-4 px-4 sm:-mx-6 sm:px-6 rounded-lg transition-colors duration-150"
          >
            <div className="flex items-start gap-2 mb-3.5"><Tag>{feat.tag}</Tag></div>
            <h3 className="text-xl sm:text-2xl font-normal mb-2 leading-[1.25] max-w-[580px] font-display">{feat.t}</h3>
            <p className="text-[15px] mb-4 leading-normal max-w-[580px] font-body" style={{ color: "var(--text-secondary)" }}>{feat.st}</p>
            <div className="flex flex-col sm:flex-row gap-6">
              <Img book={feat.cv} w={200} h={300} className="sm:w-[200px] sm:h-[300px] w-full h-auto aspect-[2/3] mx-auto sm:mx-0" />
              <div className="flex-1">
                <p className="text-[15px] leading-[1.7] mb-5 font-body" style={{ color: "var(--text-body)" }}>{feat.ex}</p>
                <div className="text-xs font-body" style={{ color: "var(--text-tertiary)" }}>
                  <span className="font-medium" style={{ color: "var(--text-secondary)" }}>{feat.a}</span>
                  <span className="mx-1.5" style={{ color: "var(--border-subtle)" }}>·</span>{feat.d}
                  <span className="mx-1.5" style={{ color: "var(--border-subtle)" }}>·</span>{feat.rt} de lecture
                </div>
              </div>
            </div>
          </div>

          <div className="border-t border-border-light" />

          {/* Sélection curée featured */}
          {latestSelection && (
            <div style={{ padding: "24px 0", borderBottom: "1px solid var(--border-subtle)" }}>
              <CuratedSelectionCard selection={latestSelection} variant="featured" />
            </div>
          )}

          {/* Other articles */}
          {JARTICLES.slice(1).map(a => (
            <div
              key={a.id}
              role="button"
              tabIndex={0}
              onClick={() => goArticle(a)}
              onKeyDown={e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); goArticle(a); } }}
              className="py-7 border-b border-border-light cursor-pointer hover:bg-surface -mx-4 px-4 sm:-mx-6 sm:px-6 transition-colors duration-150"
            >
              <div className="flex gap-5">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2.5"><Tag>{a.tag}</Tag></div>
                  <h4 className="text-[17px] font-normal mb-[5px] leading-[1.3] font-display">{a.t}</h4>
                  {a.st && <p className="text-[13px] mb-2.5 leading-[1.45] font-body" style={{ color: "var(--text-secondary)" }}>{a.st}</p>}
                  <p className="text-[13px] leading-[1.7] mb-3 font-body" style={{ color: "var(--text-secondary)" }}>{a.ex.slice(0, 180)}...</p>
                  <div className="text-xs font-body" style={{ color: "var(--text-tertiary)" }}>
                    <span className="font-medium" style={{ color: "var(--text-secondary)" }}>{a.a}</span>
                    <span className="mx-1.5" style={{ color: "var(--border-subtle)" }}>·</span>{a.d}
                    <span className="mx-1.5" style={{ color: "var(--border-subtle)" }}>·</span>{a.rt}
                  </div>
                </div>
                <Img book={a.cv} w={90} h={135} />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Agenda */}
      {jt === "agenda" && (
        <div>
          <div className="pt-6"><Label>Événements à venir</Label></div>
          {JAGENDA.map(ev => (
            <div key={ev.id} className="py-5 border-b border-border-light flex gap-4">
              <div className="w-20 shrink-0">
                <div className="text-[11px] uppercase tracking-[0.5px] mb-0.5 font-body" style={{ color: "var(--text-tertiary)" }}>{ev.ty}</div>
                <div className="text-xs font-medium font-body">{ev.d}</div>
                {ev.tm && <div className="text-[11px] font-body" style={{ color: "var(--text-tertiary)" }}>{ev.tm}</div>}
              </div>
              <div className="flex-1">
                <div className="text-[15px] font-medium mb-[3px] font-body">{ev.t}</div>
                <div className="text-xs font-body" style={{ color: "var(--text-tertiary)" }}>{ev.pl}, {ev.ci}</div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Archives */}
      {jt === "archives" && (
        <div className="pt-6">
          <Label>Depuis les archives</Label>
          <p className="text-[13px] mb-5 font-body" style={{ color: "var(--text-tertiary)" }}>Les textes précédents de la rédaction.</p>
        </div>
      )}
    </div>
    </div>
  );
}
