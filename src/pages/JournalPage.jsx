import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { JARTICLES, JAGENDA } from "../data";
import Img from "../components/Img";
import Tag from "../components/Tag";
import Label from "../components/Label";
import WipBanner from "../components/WipBanner";

export default function JournalPage() {
  const navigate = useNavigate();
  const goArticle = (a) => navigate(`/la-revue/${a.id}`);
  const [jt, setJt] = useState("textes");
  const feat = JARTICLES[0];

  return (
    <div>
      <div className="-mx-4 sm:-mx-6 mb-5"><WipBanner /></div>
      <div className="pt-5">
      {/* Header */}
      <div className="py-4 pb-5 border-b border-[#eee]">
        <h2 className="text-[13px] font-semibold uppercase tracking-[3px] text-[#1a1a1a] mb-1 font-body">La Revue</h2>
        <p className="text-[13px] text-[#767676] m-0 font-body">
          Essais, entretiens et sélections éditoriales. Une publication de <span className="font-medium text-[#666]">Reliure</span>.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-0 border-b border-[#eee]">
        {["textes", "agenda", "archives"].map(t => (
          <button
            key={t}
            onClick={() => setJt(t)}
            className={`py-3 pr-5 bg-transparent border-none cursor-pointer text-xs capitalize font-body ${
              jt === t
                ? "font-semibold text-[#1a1a1a] border-b-2 border-b-[#1a1a1a]"
                : "font-normal text-[#767676] border-b-2 border-b-transparent"
            }`}
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
            className="py-8 pb-7 cursor-pointer hover:bg-[#fafafa] -mx-4 px-4 sm:-mx-6 sm:px-6 rounded-lg transition-colors duration-150"
          >
            <div className="flex items-start gap-2 mb-3.5"><Tag>{feat.tag}</Tag></div>
            <h3 className="text-xl sm:text-2xl font-normal mb-2 leading-[1.25] max-w-[580px] font-display italic">{feat.t}</h3>
            <p className="text-[15px] text-[#666] mb-4 leading-normal max-w-[580px] font-body">{feat.st}</p>
            <div className="flex flex-col sm:flex-row gap-6">
              <Img book={feat.cv} w={200} h={300} className="sm:w-[200px] sm:h-[300px] w-full h-auto aspect-[2/3] mx-auto sm:mx-0" />
              <div className="flex-1">
                <p className="text-[15px] text-[#333] leading-[1.7] mb-5 font-body">{feat.ex}</p>
                <div className="text-xs text-[#767676] font-body">
                  <span className="font-medium text-[#666]">{feat.a}</span>
                  <span className="mx-1.5 text-[#f0f0f0]">·</span>{feat.d}
                  <span className="mx-1.5 text-[#f0f0f0]">·</span>{feat.rt} de lecture
                </div>
              </div>
            </div>
          </div>

          <div className="border-t border-border-light" />

          {/* Other articles */}
          {JARTICLES.slice(1).map(a => (
            <div
              key={a.id}
              role="button"
              tabIndex={0}
              onClick={() => goArticle(a)}
              onKeyDown={e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); goArticle(a); } }}
              className="py-7 border-b border-border-light cursor-pointer hover:bg-[#fafafa] -mx-4 px-4 sm:-mx-6 sm:px-6 transition-colors duration-150"
            >
              <div className="flex gap-5">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2.5"><Tag>{a.tag}</Tag></div>
                  <h4 className="text-[17px] font-normal mb-[5px] leading-[1.3] font-display italic">{a.t}</h4>
                  {a.st && <p className="text-[13px] text-[#666] mb-2.5 leading-[1.45] font-body">{a.st}</p>}
                  <p className="text-[13px] text-[#666] leading-[1.7] mb-3 font-body">{a.ex.slice(0, 180)}...</p>
                  <div className="text-xs text-[#767676] font-body">
                    <span className="font-medium text-[#666]">{a.a}</span>
                    <span className="mx-1.5 text-[#f0f0f0]">·</span>{a.d}
                    <span className="mx-1.5 text-[#f0f0f0]">·</span>{a.rt}
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
                <div className="text-[11px] text-[#767676] uppercase tracking-[0.5px] mb-0.5 font-body">{ev.ty}</div>
                <div className="text-xs font-medium font-body">{ev.d}</div>
                {ev.tm && <div className="text-[11px] text-[#767676] font-body">{ev.tm}</div>}
              </div>
              <div className="flex-1">
                <div className="text-[15px] font-medium mb-[3px] font-body">{ev.t}</div>
                <div className="text-xs text-[#767676] font-body">{ev.pl}, {ev.ci}</div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Archives */}
      {jt === "archives" && (
        <div className="pt-6">
          <Label>Depuis les archives</Label>
          <p className="text-[13px] text-[#767676] mb-5 font-body">Les textes précédents de la rédaction.</p>
        </div>
      )}
    </div>
    </div>
  );
}
