import { useState, useRef, useEffect } from "react";
import { B, DIARY, REVIEWS, QUOTES, LISTS } from "../data";
import Img from "../components/Img";
import Stars from "../components/Stars";
import Avatar from "../components/Avatar";
import Label from "../components/Label";
import LikeButton from "../components/LikeButton";

const INITIAL_PAGES = { 1: 654, 2: 312 };

function ReadingItem({ book, go, onFinish }) {
  const [currentPage, setCurrentPage] = useState(INITIAL_PAGES[book.id] || Math.floor(book.p * 0.4));
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const [finished, setFinished] = useState(false);
  const [removing, setRemoving] = useState(false);
  const [finHv, setFinHv] = useState(0);
  const [finRating, setFinRating] = useState(0);
  const inputRef = useRef(null);
  const pct = Math.min(100, Math.round((currentPage / book.p) * 100));
  const isComplete = currentPage >= book.p;

  useEffect(() => {
    if (editing && inputRef.current) { inputRef.current.focus(); inputRef.current.select(); }
  }, [editing]);

  const startEdit = () => {
    setDraft(String(currentPage));
    setEditing(true);
  };

  const commitEdit = () => {
    setEditing(false);
    const n = parseInt(draft, 10);
    if (!isNaN(n) && n >= 0) {
      setCurrentPage(Math.min(n, book.p));
      if (n >= book.p) setFinished(true);
    }
  };

  const handleKey = e => {
    if (e.key === "Enter") { e.preventDefault(); commitEdit(); }
  };

  const markRead = () => {
    setRemoving(true);
    setTimeout(() => onFinish(book.id), 400);
  };

  if (removing) {
    return <div className="transition-all duration-400 opacity-0 max-h-0 overflow-hidden" />;
  }

  return (
    <div className="py-2 group/row">
      <div className="flex gap-3.5 items-center">
        <Img book={book} w={44} h={66} onClick={() => go(book)} />
        <div className="flex-1">
          <div className="text-sm font-medium font-body">{book.t}</div>
          <div className="text-[11px] text-[#767676] font-body">{book.a}</div>
          <div className="w-full h-[3px] bg-avatar-bg rounded-sm mt-1.5 overflow-hidden">
            <div className="h-full bg-[#1a1a1a] rounded-sm transition-all duration-400" style={{ width: `${pct}%` }} />
          </div>
        </div>
        {editing ? (
          <div className="flex items-center text-[11px] text-[#767676] font-body">
            <span>p.&nbsp;</span>
            <input
              ref={inputRef}
              type="number"
              min={0}
              max={book.p}
              value={draft}
              onChange={e => setDraft(e.target.value)}
              onBlur={commitEdit}
              onKeyDown={handleKey}
              className="w-10 text-[11px] text-[#1a1a1a] font-body bg-transparent border-b border-[#1a1a1a] outline-none text-center py-0 px-0 appearance-none [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
            />
            <span>/{book.p}</span>
          </div>
        ) : (
          <div role="button" tabIndex={0} className="flex items-center gap-1.5" onClick={startEdit} onKeyDown={e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); startEdit(); } }} aria-label="Modifier la page">
            <span className="text-[11px] text-[#767676] font-body cursor-pointer">
              p. {currentPage}/{book.p}
            </span>
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
              className="text-[#767676] cursor-pointer opacity-0 group-hover/row:opacity-100 transition-opacity duration-150 shrink-0"
            >
              <path d="M17 3a2.83 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
              <path d="m15 5 4 4" />
            </svg>
          </div>
        )}
      </div>

      {/* Completion banner */}
      <div className={`overflow-hidden transition-all duration-300 ${finished && isComplete ? "max-h-[60px] opacity-100 mt-2" : "max-h-0 opacity-0"}`}>
        <div className="flex items-center gap-3 py-2 px-3 bg-surface rounded-lg ml-[58px]">
          <span className="text-[12px] font-medium font-body text-[#1a1a1a]">Tu l'as terminé !</span>
          <div className="flex gap-[2px]">
            {[1, 2, 3, 4, 5].map(n => (
              <span
                key={n}
                role="button"
                tabIndex={0}
                aria-label={`${n} étoile${n > 1 ? "s" : ""}`}
                onMouseEnter={() => setFinHv(n)}
                onMouseLeave={() => setFinHv(0)}
                onClick={() => setFinRating(n === finRating ? 0 : n)}
                onKeyDown={e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setFinRating(n === finRating ? 0 : n); } }}
                className={`cursor-pointer text-xs transition-all duration-150 inline-block ${n <= (finHv || 0) ? "scale-110" : ""}`}
                style={{ color: n <= (finHv || finRating) ? "#D4883A" : "#ddd" }}
              >
                ★
              </span>
            ))}
          </div>
          <button
            onClick={markRead}
            className="ml-auto text-[11px] font-medium text-white bg-[#1a1a1a] rounded-md px-2.5 py-1 border-none cursor-pointer hover:bg-[#333] transition-colors duration-150 font-body"
          >
            Marquer comme lu
          </button>
        </div>
      </div>
    </div>
  );
}

function EmptyState({ children }) {
  return <div className="py-10 text-center">{children}</div>;
}

export default function ProfilePage({ go, onBackfill, onSearch }) {
  const [tab, setTab] = useState("journal");
  const [readingBooks, setReadingBooks] = useState(() => B.slice(0, 2));
  const [emptyMode, setEmptyMode] = useState(false);
  const [libView, setLibView] = useState("grille");

  const removeFromReading = id => {
    setReadingBooks(prev => prev.filter(b => b.id !== id));
  };

  const diary = emptyMode ? [] : DIARY;
  const reviews = emptyMode ? [] : REVIEWS;
  const quotes = emptyMode ? [] : QUOTES.filter(q => q.u === "Alix");
  const lists = emptyMode ? [] : LISTS;
  const reading = emptyMode ? [] : readingBooks;
  const booksRead = emptyMode ? 2 : 38;

  return (
    <div>
      {/* Header */}
      <div className="pt-8 pb-6">
        <div className="flex items-center gap-3.5 mb-3.5 flex-wrap sm:flex-nowrap">
          <Avatar i="AL" s={52} />
          <div className="flex-1">
            <div className="text-[22px] font-normal font-display italic flex items-center gap-1.5">
              Alix
              <span className="relative group/verified inline-flex">
                <svg width="16" height="16" viewBox="0 0 24 24" className="shrink-0 cursor-pointer"><circle cx="12" cy="12" r="10" fill="#1a1a1a" /><path d="M8 12.5l2.5 2.5L16 9.5" fill="none" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2.5 py-1.5 rounded-md bg-[#1a1a1a] text-white text-[11px] font-body whitespace-nowrap opacity-0 scale-95 group-hover/verified:opacity-100 group-hover/verified:scale-100 transition-all duration-150 pointer-events-none">
                  Compte vérifié
                  <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-[#1a1a1a]" />
                </div>
              </span>
            </div>
            <div className="text-xs text-[#767676] font-body">Paris · @alix</div>
          </div>
          <div className="flex gap-5 text-xs text-[#737373] font-body w-full sm:w-auto mt-2 sm:mt-0">
            {[["142", "livres"], ["38", "cette année"], ["89", "abonnés"], ["64", "abonnements"]].map(([n, l]) => (
              <span key={l}><strong className="text-[#1a1a1a] font-semibold">{n}</strong> {l}</span>
            ))}
          </div>
        </div>
        <p className="text-[13px] text-[#6b6b6b] leading-relaxed max-w-[480px] m-0 mb-3 font-body">
          Lecteur compulsif. Fiction contemporaine, littérature latino-américaine, existentialisme.
        </p>
        <div className="flex items-center gap-1.5 flex-wrap">
          {[
            { label: "Rossignol — Multi-Défis 2026", border: "#e8dfd2", bg: "linear-gradient(135deg, #faf6f0, #f0e8d8)", content: <span className="text-star text-sm">★</span> },
            { label: "Défi Francophone 2025 — Mésange", border: "#c8d8c8", bg: "linear-gradient(135deg, #f0f5f0, #dce8dc)", content: <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><polygon points="12,2 15,9 22,9 16.5,14 18.5,21 12,17 5.5,21 7.5,14 2,9 9,9" fill="#6a9a5a" /></svg> },
            { label: "100 livres lus", border: "#d8cce8", bg: "linear-gradient(135deg, #f5f0fa, #e8ddf5)", content: <span className="text-[11px] font-bold text-[#7a5aaa] font-body">100</span> },
          ].map(b => (
            <div key={b.label} className="relative group/badge">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center cursor-pointer border-[1.5px] transition-transform duration-150 hover:scale-110 shrink-0`}
                style={{ background: b.bg, borderColor: b.border }}
              >
                {b.content}
              </div>
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2.5 py-1.5 rounded-md bg-[#1a1a1a] text-white text-[11px] font-body whitespace-nowrap opacity-0 scale-95 group-hover/badge:opacity-100 group-hover/badge:scale-100 transition-all duration-150 pointer-events-none">
                {b.label}
                <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-[#1a1a1a]" />
              </div>
            </div>
          ))}
          <span className="text-[11px] text-[#767676] font-body ml-0.5">3 badges</span>
        </div>
      </div>

      {/* Backfill banner */}
      <div
        role="button"
        tabIndex={0}
        onClick={onBackfill}
        onKeyDown={e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onBackfill(); } }}
        className="flex items-center gap-4 p-3 px-4 bg-surface rounded-lg border border-[#eee] cursor-pointer hover:border-[#ddd] transition-colors duration-150 mb-0"
      >
        <div className="flex-1">
          <div className="text-[13px] font-medium font-body">Tu as lu d'autres livres ?</div>
          <div className="text-xs text-[#737373] font-body">Remplis ta bibliothèque en quelques clics.</div>
        </div>
        <button className="px-3 py-[6px] rounded-[16px] text-xs font-medium font-body bg-white border-[1.5px] border-[#ddd] text-[#1a1a1a] cursor-pointer hover:border-[#bbb] transition-colors duration-150">
          Ajouter
        </button>
      </div>

      {/* Quatre favoris */}
      <div className="border-t border-border-light py-6">
        <Label>Quatre favoris</Label>
        <div className="grid grid-cols-4 gap-4">
          {[B[0], B[6], B[2], B[4]].map(b => (
            <div key={b.id}>
              <Img book={b} w={999} h={999} onClick={() => go(b)} className="w-full h-auto aspect-[2/3]" />
              <div className="text-xs font-medium mt-2 font-body">{b.t}</div>
              <div className="text-[11px] text-[#767676] font-body">{b.a.split(" ").pop()}, {b.y}</div>
            </div>
          ))}
        </div>
      </div>

      {/* En cours */}
      <div className="border-t border-border-light py-6">
        <Label>En cours de lecture</Label>
        {reading.length > 0 ? (
          reading.map(b => (
            <ReadingItem key={b.id} book={b} go={go} onFinish={removeFromReading} />
          ))
        ) : (
          <EmptyState>
            <div className="text-sm text-[#737373] font-body">Rien en cours.</div>
            <div className="text-xs text-[#767676] font-body mt-1">
              Que lis-tu en ce moment ?{" "}
              <span role="button" tabIndex={0} onClick={onSearch} onKeyDown={e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onSearch(); } }} className="underline cursor-pointer hover:text-[#1a1a1a] transition-colors duration-150">Chercher</span>
            </div>
          </EmptyState>
        )}
      </div>

      {/* Tabs */}
      <div className="border-t border-border-light">
        <div className="flex">
          {["journal", "bibliothèque", "mes critiques", "mes citations", "mes listes", "bilan"].map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`flex-1 py-3 bg-transparent border-none cursor-pointer text-xs capitalize font-body ${
                tab === t
                  ? "font-semibold text-[#1a1a1a] border-b-2 border-b-[#1a1a1a]"
                  : "font-normal text-[#767676] border-b-2 border-b-transparent"
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      {/* Journal/diary */}
      {tab === "journal" && (
        <div className="py-4">
          {diary.length > 0 ? (
            ["Mars 2026", "Février 2026", "Janvier 2026"].map(month => {
              const key = month.startsWith("Mars") ? "Mars" : month.startsWith("Fév") ? "Fév" : "Jan";
              const entries = diary.filter(e => e.m === key);
              if (entries.length === 0) return null;
              return (
                <div key={month} className="mb-6">
                  <div className="text-[11px] font-semibold uppercase tracking-[1.5px] text-[#767676] mb-3 pb-2 border-b border-[#f5f5f5] font-body">
                    {month}
                  </div>
                  <div className="flex gap-1.5 flex-wrap">
                    {entries.map((e, i) => (
                      <div key={i} role="button" tabIndex={0} className="relative cursor-pointer" onClick={() => go(e.b)} onKeyDown={ev => { if (ev.key === "Enter" || ev.key === " ") { ev.preventDefault(); go(e.b); } }}>
                        <Img book={e.b} w={80} h={120} />
                        <div className="absolute bottom-1 left-1 right-1 flex justify-between items-center">
                          <span className="text-[8px] bg-black/60 text-white px-1 py-[2px] rounded-sm font-body">{e.d}</span>
                          {e.lk && <span className="text-[10px] bg-black/60 text-spoiler px-[3px] py-[1px] rounded-sm">♥</span>}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })
          ) : (
            <EmptyState>
              <div className="text-sm text-[#737373] font-body">Pas encore de lectures.</div>
              <button
                onClick={onSearch}
                className="mt-4 px-5 py-2.5 rounded-[20px] text-[13px] font-medium font-body bg-[#1a1a1a] text-white border-none cursor-pointer hover:bg-[#333] transition-colors duration-150"
              >
                Chercher un livre
              </button>
            </EmptyState>
          )}
        </div>
      )}

      {/* Bibliothèque */}
      {tab === "bibliothèque" && (
        <div className="py-4">
          {/* View toggle */}
          <div className="flex items-center justify-between mb-4">
            <div className="inline-flex rounded-lg bg-surface p-[3px]">
              {[["grille", "Grille"], ["liste", "Liste"], ["étagère", "Étagère"]].map(([k, l]) => (
                <button
                  key={k}
                  onClick={() => setLibView(k)}
                  className={`px-3 py-1.5 rounded-md text-[11px] font-medium font-body border-none cursor-pointer transition-all duration-150 ${
                    libView === k
                      ? "bg-white text-[#1a1a1a] shadow-[0_1px_3px_rgba(0,0,0,0.08)]"
                      : "bg-transparent text-[#767676]"
                  }`}
                >
                  {l}
                </button>
              ))}
            </div>
            <span className="text-[11px] text-[#767676] font-body">{B.length} livres</span>
          </div>

          {/* Grille */}
          {libView === "grille" && (
            <div className="grid grid-cols-4 sm:grid-cols-6 gap-2.5">
              {B.map(b => (
                <Img key={b.id} book={b} w={999} h={999} onClick={() => go(b)} className="w-full h-auto aspect-[2/3]" />
              ))}
            </div>
          )}

          {/* Liste */}
          {libView === "liste" && (
            <div>
              {B.map(b => (
                <div
                  key={b.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => go(b)}
                  onKeyDown={e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); go(b); } }}
                  className="flex items-center gap-3 py-2.5 cursor-pointer hover:bg-[#fafafa] transition-colors duration-100"
                  style={{ borderBottom: "0.5px solid #f0f0f0" }}
                >
                  <Img book={b} w={36} h={54} />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium font-body truncate">{b.t}</div>
                    <div className="text-xs text-[#737373] font-body">{b.a} · {b.y}</div>
                  </div>
                  <Stars r={b.r} s={11} />
                </div>
              ))}
            </div>
          )}

          {/* Étagère */}
          {libView === "étagère" && (() => {
            const shelfSize = typeof window !== "undefined" && window.innerWidth < 640 ? 5 : 7;
            const shelves = [];
            for (let i = 0; i < B.length; i += shelfSize) {
              shelves.push(B.slice(i, i + shelfSize));
            }
            return (
              <div className="bg-[#faf8f5] rounded-lg p-3 sm:p-4 flex flex-col gap-0">
                {shelves.map((shelf, si) => (
                  <div key={si} className="mb-1">
                    {/* Books */}
                    <div className="flex items-end gap-1 px-1">
                      {shelf.map(b => (
                        <div
                          key={b.id}
                          role="button"
                          tabIndex={0}
                          onClick={() => go(b)}
                          onKeyDown={e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); go(b); } }}
                          className="cursor-pointer border-l-2 border-l-[rgba(0,0,0,0.08)] rounded-tl-sm rounded-tr-[3px] overflow-hidden shrink-0 hover:-translate-y-1 transition-transform duration-150"
                        >
                          <img
                            src={b.c}
                            alt={b.t}
                            className="w-[56px] h-[84px] sm:w-[72px] sm:h-[108px] object-cover block"
                            onError={e => { e.target.style.display = "none"; }}
                          />
                        </div>
                      ))}
                    </div>
                    {/* Shelf plank */}
                    <div className="h-2 rounded-b-sm" style={{ background: "linear-gradient(to bottom, #c4a882, #a08462)", boxShadow: "0 2px 4px rgba(0,0,0,0.1)" }} />
                    {/* Shelf shadow */}
                    <div className="h-1.5" style={{ background: "linear-gradient(to bottom, rgba(0,0,0,0.06), transparent)" }} />
                  </div>
                ))}
              </div>
            );
          })()}
        </div>
      )}

      {/* Critiques */}
      {tab === "mes critiques" && (
        <div className="py-3">
          {reviews.length > 0 ? reviews.map((rv, i) => (
            <div key={i} className="py-5 border-b border-[#f5f5f5]">
              <div className="flex gap-4">
                <Img book={rv.b} w={72} h={108} onClick={() => go(rv.b)} />
                <div className="flex-1">
                  <div className="text-base font-medium font-body mb-0.5">{rv.b.t}</div>
                  <div className="text-xs text-[#737373] mb-2 font-body">{rv.b.a}, {rv.b.y}</div>
                  <Stars r={rv.r} s={12} />
                  {rv.sp ? (
                    <details className="mt-2.5">
                      <summary className="text-[11px] text-spoiler cursor-pointer font-medium font-body">
                        Cette critique contient des spoilers
                      </summary>
                      <p className="text-[15px] text-[#333] leading-[1.7] mt-2.5 font-body">{rv.txt}</p>
                    </details>
                  ) : (
                    <p className="text-[15px] text-[#333] leading-[1.7] mt-2.5 font-body">{rv.txt}</p>
                  )}
                  <div className="text-[11px] text-[#767676] mt-2.5 font-body"><LikeButton count={rv.lk} /> · {rv.d} 2026</div>
                </div>
              </div>
            </div>
          )) : (
            <EmptyState>
              <div className="text-sm text-[#737373] font-body">Tu n'as pas encore écrit de critique.</div>
              <div className="text-xs text-[#767676] font-body mt-1">Tes critiques apparaîtront ici.</div>
            </EmptyState>
          )}
        </div>
      )}

      {/* Citations */}
      {tab === "mes citations" && (
        <div className="py-3">
          {quotes.length > 0 ? quotes.map(q => (
            <div key={q.id} className="py-5 border-b border-[#f5f5f5]">
              <div className="text-[15px] italic text-[#1a1a1a] leading-[1.7] border-l-[3px] border-l-cover-fallback pl-4 mb-3 font-display">
                « {q.txt} »
              </div>
              <div className="flex items-center gap-2.5">
                <Img book={q.b} w={28} h={40} onClick={() => go(q.b)} />
                <span className="text-[13px] font-medium font-body">{q.b.t}</span>
                <span className="text-xs text-[#767676] font-body">· {q.b.a}</span>
                <LikeButton count={q.lk} className="ml-auto text-xs text-[#767676] font-body" />
              </div>
            </div>
          )) : (
            <EmptyState>
              <div className="text-sm text-[#737373] font-body">Pas encore de citations sauvegardées.</div>
            </EmptyState>
          )}
        </div>
      )}

      {/* Listes */}
      {tab === "mes listes" && (
        <div className="py-3">
          {lists.length > 0 ? lists.map(l => (
            <div key={l.id} className="py-5 border-b border-[#f5f5f5]">
              <div className="flex gap-2 mb-3.5 p-3 px-3.5 bg-surface rounded-lg overflow-x-auto">
                {l.cv.slice(0, 4).map(b => <Img key={b.id} book={b} w={60} h={90} onClick={() => go(b)} />)}
                {l.n > 4 && (
                  <div className="w-[60px] h-[90px] rounded-[3px] bg-avatar-bg flex items-center justify-center text-[11px] text-[#737373] shrink-0 font-body">
                    +{l.n - 4}
                  </div>
                )}
              </div>
              <div className="text-[15px] font-medium font-body">{l.t}</div>
              <div className="text-xs text-[#737373] mt-1 font-body">{l.u} · {l.n} livres · <LikeButton count={l.lk} /></div>
            </div>
          )) : (
            <EmptyState>
              <div className="text-sm text-[#737373] font-body">Aucune liste pour l'instant.</div>
              <button className="mt-4 px-5 py-2.5 rounded-[20px] text-[13px] font-medium font-body bg-transparent text-[#666] border-[1.5px] border-[#ddd] cursor-pointer hover:border-[#999] transition-colors duration-150">
                + Créer une liste
              </button>
            </EmptyState>
          )}
        </div>
      )}

      {/* Bilan */}
      {tab === "bilan" && (
        <div className="py-5">
          {booksRead >= 5 ? (
            <>
              <div className="text-center mb-7">
                <Label>Bilan de l'année</Label>
                <div className="text-[40px] font-bold tracking-tight font-body">2026</div>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-px bg-[#eee] rounded-lg overflow-hidden mb-7">
                {[
                  { l: "Livres lus", v: "38" }, { l: "Pages tournées", v: "12 847" }, { l: "Note moyenne", v: "4.1 ★" },
                  { l: "Critiques", v: "24" }, { l: "Citations", v: "14" }, { l: "Listes", v: "6" },
                ].map((s, i) => (
                  <div key={i} className="bg-white p-5 text-center">
                    <div className="text-[22px] font-semibold font-body">{s.v}</div>
                    <div className="text-[10px] text-[#737373] mt-[3px] uppercase tracking-[0.5px] font-body">{s.l}</div>
                  </div>
                ))}
              </div>
              <Label>Chronologie de lecture</Label>
              {(() => {
                const data = [4, 6, 3, 0, 0, 0, 0, 0, 0, 0, 0, 0];
                const max = Math.max(...data, 1);
                const barH = 100;
                return (
                  <div className="flex items-end gap-1.5 mt-2 mb-7" style={{ height: barH + 24 }}>
                    {data.map((v, i) => (
                      <div key={i} className="flex-1 flex flex-col items-center gap-1">
                        {v > 0 && <div className="text-[9px] text-[#737373] font-body">{v}</div>}
                        <div
                          className={`w-full rounded-[3px] ${v ? "bg-[#1a1a1a]" : "bg-avatar-bg"}`}
                          style={{ height: v ? (v / max) * barH : 4 }}
                        />
                        <span className="text-[9px] text-[#767676] font-body">
                          {["J", "F", "M", "A", "M", "J", "J", "A", "S", "O", "N", "D"][i]}
                        </span>
                      </div>
                    ))}
                  </div>
                );
              })()}
              <Label>Les mieux notés</Label>
              <div className="flex gap-2.5">
                {[B[6], B[0], B[2], B[8], B[4]].map(b => (
                  <div key={b.id} className="text-center flex-1">
                    <Img book={b} w={999} h={999} onClick={() => go(b)} className="w-full h-auto aspect-[2/3]" />
                    <div className="text-[10px] font-medium mt-1.5 overflow-hidden text-ellipsis whitespace-nowrap font-body">{b.t}</div>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <EmptyState>
              <div className="font-display italic text-[18px] text-[#1a1a1a] mb-5">
                Encore {5 - booksRead} livre{5 - booksRead > 1 ? "s" : ""} pour débloquer ton bilan 2026
              </div>
              <div className="flex justify-center mb-2">
                <div className="w-[200px] h-1.5 bg-avatar-bg rounded overflow-hidden">
                  <div className="h-full bg-[#1a1a1a] rounded transition-all duration-400" style={{ width: `${(booksRead / 5) * 100}%` }} />
                </div>
              </div>
              <div className="text-xs text-[#767676] font-body mb-6">{booksRead}/5</div>
              {booksRead > 0 && (
                <div className="flex justify-center gap-2.5">
                  {B.slice(0, booksRead).map(b => (
                    <Img key={b.id} book={b} w={52} h={78} onClick={() => go(b)} />
                  ))}
                </div>
              )}
            </EmptyState>
          )}
        </div>
      )}

      {/* Dev toggle */}
      <div className="border-t border-border-light mt-8 pt-4 pb-2 flex justify-center">
        <button
          onClick={() => setEmptyMode(!emptyMode)}
          className="text-[11px] text-[#767676] font-body bg-transparent border border-[#eee] rounded px-3 py-1 cursor-pointer hover:border-[#ccc] transition-colors duration-150"
        >
          {emptyMode ? "Mode rempli" : "Mode vide"}
        </button>
      </div>
    </div>
  );
}
