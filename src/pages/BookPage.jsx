import { useState, useRef } from "react";
import { B, QUOTES, ACTIVITY } from "../data";
import Img from "../components/Img";
import Stars from "../components/Stars";
import Avatar from "../components/Avatar";
import Tag from "../components/Tag";
import Pill from "../components/Pill";
import Label from "../components/Label";
import HScroll from "../components/HScroll";
import LikeButton from "../components/LikeButton";

export default function BookPage({ book, onBack, onTag, go }) {
  const [st, setSt] = useState(null);
  const [hv, setHv] = useState(0);
  const [ur, setUr] = useState(0);
  const [starPop, setStarPop] = useState(0);
  const [bt, setBt] = useState("critiques");
  const [finDate, setFinDate] = useState(null);
  const [noDate, setNoDate] = useState(false);
  const [isReread, setIsReread] = useState(false);
  const [tagInput, setTagInput] = useState("");
  const [tags, setTags] = useState([]);
  const dateRef = useRef(null);
  const bq = QUOTES.filter(q => q.b.id === book.id);

  const ALREADY_READ = [1, 7]; // 2666 & Ficciones
  const KNOWN_TAGS = ["en vacances", "recommandé par Margaux", "avion CDG-JFK", "relu", "en VO", "café Oberkampf", "métro"];
  const [tagFocused, setTagFocused] = useState(false);

  const todayLabel = () => {
    const d = new Date();
    const months = ["janvier","février","mars","avril","mai","juin","juillet","août","septembre","octobre","novembre","décembre"];
    return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
  };

  const dateToLabel = iso => {
    const d = new Date(iso);
    const months = ["janvier","février","mars","avril","mai","juin","juillet","août","septembre","octobre","novembre","décembre"];
    return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
  };

  const handleStatus = s => {
    if (st === s) {
      setSt(null); setFinDate(null); setNoDate(false); setIsReread(false);
    } else {
      setSt(s);
      if (s === "Lu") { setFinDate(todayLabel()); setNoDate(false); }
      else { setFinDate(null); setNoDate(false); }
      setIsReread(false);
    }
  };

  const norm = s => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  const tagSuggestions = tagInput.length >= 2
    ? KNOWN_TAGS.filter(t => norm(t).includes(norm(tagInput)) && !tags.includes(t)).slice(0, 4)
    : [];

  const addTag = t => {
    if (!tags.includes(t) && tags.length < 5) setTags([...tags, t]);
    setTagInput("");
  };

  const handleTagKey = e => {
    if (e.key === "Enter" && tagInput.trim()) {
      e.preventDefault();
      if (tagSuggestions.length > 0) { addTag(tagSuggestions[0]); }
      else { addTag(tagInput.replace(/,/g, "").trim().toLowerCase()); }
    } else if (e.key === "," && tagInput.trim()) {
      e.preventDefault();
      addTag(tagInput.replace(/,/g, "").trim().toLowerCase());
    }
  };

  return (
    <div>
      <button onClick={onBack} className="bg-transparent border-none text-[#737373] cursor-pointer text-[13px] py-4 font-body">
        ← Retour
      </button>

      {/* Hero */}
      <div className="flex flex-col sm:flex-row gap-8 py-2 pb-6 items-center sm:items-start">
        <Img book={book} w={180} h={270} />
        <div className="flex-1 pt-1">
          <h1 className="m-0 text-[26px] font-normal leading-tight font-display italic">{book.t}</h1>
          <div className="text-[15px] text-[#666] mt-1.5 font-body">{book.a}</div>
          <div className="text-[13px] text-[#767676] mt-1 font-body">{book.y} · {book.p} pages</div>

          {/* Rating box */}
          <div className="flex items-center gap-3 mt-5 p-3.5 px-[18px] bg-surface rounded-lg">
            <span className="text-[32px] font-bold font-body">{book.r}</span>
            <div>
              <Stars r={book.r} s={14} />
              <div className="text-[11px] text-[#767676] mt-0.5 font-body">{book.rt?.toLocaleString("fr-FR")} évaluations</div>
            </div>
          </div>

          {/* Status pills */}
          <div className="flex gap-1.5 mt-[18px] flex-wrap items-center">
            {["En cours", "Lu", "À lire", "Abandonné"].map(s => (
              <Pill key={s} active={st === s} onClick={() => handleStatus(s)}>{s}</Pill>
            ))}
          </div>

          {/* Secondary pills (Lu only) */}
          <div className={`overflow-hidden transition-all duration-200 ${st === "Lu" ? "max-h-[80px] opacity-100 mt-3" : "max-h-0 opacity-0 mt-0"}`}>
            <div className="flex flex-wrap gap-1.5 items-center">
              {/* Date pill */}
              {finDate && !noDate ? (
                <span className="inline-flex items-center gap-1.5 pl-2.5 pr-1.5 py-[5px] rounded-2xl text-xs bg-tag-bg border border-[#eee] text-[#1a1a1a] font-body">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="shrink-0 text-[#737373]">
                    <rect x="3" y="4" width="18" height="18" rx="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" />
                  </svg>
                  <span className="cursor-pointer" onClick={() => dateRef.current?.showPicker()}>{finDate}</span>
                  <input
                    ref={dateRef}
                    type="date"
                    className="absolute w-0 h-0 opacity-0"
                    onChange={e => { if (e.target.value) setFinDate(dateToLabel(e.target.value)); }}
                  />
                  <button onClick={() => { setFinDate(null); setNoDate(true); }} className="bg-transparent border-none cursor-pointer text-[#767676] hover:text-[#1a1a1a] text-[11px] leading-none p-0 ml-0.5 transition-colors duration-150">×</button>
                </span>
              ) : noDate && st === "Lu" ? (
                <span className="text-[11px] text-[#767676] font-body">Ajouté à ta bibliothèque</span>
              ) : null}

              {/* Reread pill */}
              {ALREADY_READ.includes(book.id) && st === "Lu" && (
                isReread ? (
                  <span className="inline-flex items-center gap-1.5 pl-2.5 pr-1.5 py-[5px] rounded-2xl text-xs bg-tag-bg border border-[#eee] text-[#1a1a1a] font-body">
                    Relecture
                    <button onClick={() => setIsReread(false)} className="bg-transparent border-none cursor-pointer text-[#767676] hover:text-[#1a1a1a] text-[11px] leading-none p-0 ml-0.5 transition-colors duration-150">×</button>
                  </span>
                ) : (
                  <button
                    onClick={() => setIsReread(true)}
                    className="inline-flex items-center px-2.5 py-[5px] rounded-2xl text-xs bg-transparent border-[1.5px] border-dashed border-[#ddd] text-[#767676] font-body cursor-pointer hover:border-[#767676] hover:text-[#1a1a1a] transition-colors duration-150"
                  >
                    + Relecture
                  </button>
                )
              )}
            </div>
          </div>

          {/* User rating */}
          <div className="mt-[18px]">
            <div className="text-xs text-[#737373] mb-1.5 font-body">Votre note</div>
            <div className="flex gap-[3px]">
              {[1, 2, 3, 4, 5].map(n => (
                <span
                  key={n}
                  onMouseEnter={() => setHv(n)}
                  onMouseLeave={() => setHv(0)}
                  onClick={() => { setUr(n === ur ? 0 : n); setStarPop(n); setTimeout(() => setStarPop(0), 200); }}
                  className={`cursor-pointer text-xl transition-all duration-200 inline-block ${n <= (hv || 0) ? "scale-110" : "scale-100"} ${starPop === n ? "scale-125" : ""}`}
                  style={{ color: n <= (hv || ur) ? "#D4883A" : "#ddd" }}
                >
                  ★
                </span>
              ))}
            </div>
          </div>

          {/* Personal tags */}
          <div className="mt-[18px]">
            <div className="text-xs text-[#737373] mb-1.5 font-body">Tags personnels</div>
            {tags.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mb-2">
                {tags.map(t => (
                  <span key={t} className="inline-flex items-center gap-1 pl-2.5 pr-1.5 py-[5px] rounded-2xl text-xs bg-tag-bg border border-[#eee] text-[#1a1a1a] font-body">
                    {t}
                    <button
                      onClick={() => setTags(tags.filter(x => x !== t))}
                      className="bg-transparent border-none cursor-pointer text-[#767676] hover:text-[#1a1a1a] text-[11px] leading-none p-0 ml-0.5 transition-colors duration-150"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            )}
            {tags.length < 5 && (
              <div className="relative">
                <input
                  value={tagInput}
                  onChange={e => setTagInput(e.target.value)}
                  onKeyDown={handleTagKey}
                  onFocus={() => setTagFocused(true)}
                  onBlur={() => setTimeout(() => setTagFocused(false), 150)}
                  placeholder="en vacances, recommandé par Margaux..."
                  className="w-full py-2 text-[13px] bg-transparent border-b border-[#eee] outline-none text-[#1a1a1a] font-body focus:border-[#1a1a1a] transition-colors duration-200"
                />
                {tagFocused && tagSuggestions.length > 0 && (
                  <div className="absolute left-0 right-0 mt-1 bg-white border border-[#eee] rounded-lg overflow-hidden z-10 shadow-[0_2px_8px_rgba(0,0,0,0.06)]">
                    {tagSuggestions.map(s => (
                      <div
                        key={s}
                        onMouseDown={e => { e.preventDefault(); addTag(s); }}
                        className="px-3 py-2 text-[13px] text-[#1a1a1a] font-body cursor-pointer hover:bg-surface transition-colors duration-100"
                      >
                        {s}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
            <div className="text-[11px] text-[#767676] mt-1.5 font-body">Visibles uniquement par toi</div>
          </div>
        </div>
      </div>

      {/* Tags */}
      {book.tags && (
        <div className="pb-5">
          <Label>Thèmes</Label>
          <div className="flex flex-wrap gap-1">{book.tags.map(t => <Tag key={t} onClick={() => onTag(t)}>{t}</Tag>)}</div>
        </div>
      )}

      {/* Où lire */}
      <div className="border-t border-border-light py-5">
        <Label>Où lire</Label>
        <div className="flex gap-2 items-center">
          {["Fnac", "Amazon"].map(s => (
            <span key={s} className="text-[11px] py-1.5 px-3 rounded-md bg-surface text-[#666] cursor-pointer border border-[#eee] font-body">
              {s}
            </span>
          ))}
          <div className="w-px h-5 bg-[#eee] mx-1" />
          {["Bibliothèque", "Kindle", "Audible"].map(s => (
            <span key={s} className="text-[11px] py-1.5 px-3 rounded-md bg-surface text-[#666] cursor-pointer border border-[#eee] font-body">
              {s}
            </span>
          ))}
        </div>
      </div>

      {/* Tabs */}
      <div className="border-t border-border-light">
        <div className="flex">
          {["critiques", "citations", "éditions"].map(t => (
            <button
              key={t}
              onClick={() => setBt(t)}
              className={`flex-1 py-3 bg-transparent border-none cursor-pointer text-xs capitalize font-body ${
                bt === t
                  ? "font-semibold text-[#1a1a1a] border-b-2 border-b-[#1a1a1a]"
                  : "font-normal text-[#737373] border-b-2 border-b-transparent"
              }`}
            >
              {t}{t === "citations" && bq.length > 0 ? ` (${bq.length})` : ""}
            </button>
          ))}
        </div>
      </div>

      {/* Tab content */}
      <div className="py-4">
        {bt === "critiques" && (
          <div>
            {ACTIVITY.filter(a => a.ty === "review").slice(0, 3).map(rv => (
              <div key={rv.id} className="py-4 border-b border-[#f5f5f5]">
                <div className="flex items-center gap-2.5 mb-2">
                  <Avatar i={rv.av} s={26} />
                  <span className="text-[13px] font-semibold font-body">{rv.u}</span>
                  <Stars r={rv.r} s={11} />
                </div>
                <p className="text-[15px] text-[#333] leading-[1.7] m-0 font-body">{rv.txt}</p>
                <div className="text-xs text-[#767676] mt-1.5 font-body"><LikeButton count={rv.lk} /></div>
              </div>
            ))}
          </div>
        )}

        {bt === "citations" && (
          <div>
            {bq.length > 0 ? bq.map(q => (
              <div key={q.id} className="py-[18px] border-b border-[#f5f5f5]">
                <div className="text-[15px] italic text-[#1a1a1a] leading-[1.7] border-l-[3px] border-l-cover-fallback pl-4 font-display">
                  « {q.txt} »
                </div>
                <div className="flex items-center gap-2 mt-2.5">
                  <span className="text-xs text-[#737373] font-body">{q.u}</span>
                  <LikeButton count={q.lk} className="ml-auto text-xs text-[#767676] font-body" />
                </div>
              </div>
            )) : (
              <div className="py-8 text-center text-[#767676] text-[13px] font-body">Pas encore de citations.</div>
            )}
            <button className="w-full mt-3 py-2.5 rounded-md border border-dashed border-[#ddd] bg-transparent cursor-pointer text-[13px] text-[#737373] font-body transition-colors duration-200 hover:border-[#767676] hover:text-[#1a1a1a]">
              + Ajouter une citation
            </button>
          </div>
        )}

        {bt === "éditions" && (
          <div className="flex gap-2.5">
            {[{ l: "Poche", p: "Folio", y: "2008" }, { l: "Relié", p: "Gallimard", y: "2004" }, { l: "Audio", p: "Audible", y: "2019" }].map((e, i) => (
              <div key={i} className="p-3.5 px-4 bg-surface rounded-lg flex-1 cursor-pointer hover:bg-[#f3f0eb]">
                <div className="text-[13px] font-semibold font-body">{e.l}</div>
                <div className="text-xs text-[#737373] mt-[3px] font-body">{e.p} · {e.y}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Also liked */}
      <div className="border-t border-border-light py-6">
        <Label>Les lecteurs ont aussi aimé</Label>
        <HScroll>
          {B.filter(x => x.id !== book.id).slice(0, 6).map(b => (
            <div key={b.id} className="text-center min-w-[100px]">
              <Img book={b} w={100} h={150} onClick={() => { onBack(); setTimeout(() => go(b), 0); }} />
              <div className="text-[10px] font-medium mt-1.5 overflow-hidden text-ellipsis whitespace-nowrap max-w-[100px] font-body">{b.t}</div>
            </div>
          ))}
        </HScroll>
      </div>
    </div>
  );
}
