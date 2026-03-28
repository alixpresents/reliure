import { B, QUOTES, LISTS } from "../data";
import Img from "../components/Img";
import Avatar from "../components/Avatar";
import Tag from "../components/Tag";
import Heading from "../components/Heading";
import Label from "../components/Label";
import HScroll from "../components/HScroll";
import LikeButton from "../components/LikeButton";

export default function ExplorePage({ go, onTag, onSearch }) {
  const ptags = ["autofiction", "réalisme magique", "Japon", "années 80", "féminisme", "dystopie", "poésie", "philosophie", "Paris", "mémoire", "nature writing"];

  return (
    <div>
      {/* Search bar */}
      <div className="py-6 pb-5">
        <div
          role="button"
          tabIndex={0}
          onClick={onSearch}
          onKeyDown={e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onSearch(); } }}
          aria-label="Rechercher"
          className="bg-surface rounded-lg py-[11px] px-4 flex items-center gap-2.5 border border-[#eee] cursor-pointer hover:border-[#ddd] transition-[border] duration-150"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#bbb" strokeWidth="2">
            <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <span className="text-[#767676] text-sm font-body">Chercher des livres, auteurs, tags...</span>
        </div>
      </div>

      {/* Tags */}
      <div className="mb-6">
        <Label>Parcourir par thème</Label>
        <div className="flex flex-wrap gap-1">
          {ptags.map(t => <Tag key={t} onClick={() => onTag(t)}>{t}</Tag>)}
        </div>
      </div>

      {/* Populaires */}
      <div className="border-t border-border-light py-6">
        <Heading>Populaires cette semaine</Heading>
        <HScroll>
          {B.slice(0, 7).map((book, i) => (
            <div key={book.id} className="text-center min-w-[130px]">
              <div className="relative inline-block">
                <Img book={book} w={130} h={195} onClick={() => go(book)} />
                <div className="absolute top-1.5 left-1.5 w-[22px] h-[22px] rounded-full bg-black/70 backdrop-blur-[4px] flex items-center justify-center text-[10px] font-bold text-white font-body z-2">
                  {i + 1}
                </div>
              </div>
              <div className="text-xs font-medium mt-2 overflow-hidden text-ellipsis whitespace-nowrap max-w-[130px] font-body">{book.t}</div>
              <div className="text-[11px] text-[#767676] mt-[1px] font-body">{book.a.split(" ").pop()}</div>
            </div>
          ))}
        </HScroll>
      </div>

      {/* Citations populaires */}
      <div className="border-t border-border-light py-6">
        <Heading>Citations populaires</Heading>
        {[...QUOTES].sort((a, b) => b.lk - a.lk).slice(0, 3).map(q => (
          <div key={q.id} className="py-4 border-b border-[#f5f5f5]">
            <div className="text-[15px] italic text-[#1a1a1a] leading-[1.7] border-l-[3px] border-l-cover-fallback pl-3.5 mb-2.5 font-display">
              « {q.txt} »
            </div>
            <div className="flex items-center gap-2">
              <Img book={q.b} w={24} h={34} onClick={() => go(q.b)} />
              <span className="text-xs text-[#666] font-body">{q.b.t}</span>
              <span className="text-[11px] text-[#767676] font-body">· {q.u}</span>
              <LikeButton count={q.lk} className="ml-auto text-[11px] text-[#767676] font-body" />
            </div>
          </div>
        ))}
      </div>

      {/* Listes populaires */}
      <div className="border-t border-border-light py-6">
        <Heading>Listes populaires</Heading>
        {LISTS.map(l => (
          <div key={l.id} className="py-5 border-b border-[#f5f5f5] cursor-pointer">
            <div className="flex gap-2 mb-3.5 p-3.5 px-4 bg-surface rounded-lg overflow-x-auto">
              {l.cv.slice(0, 4).map(b => <Img key={b.id} book={b} w={68} h={102} onClick={() => go(b)} />)}
              {l.n > 4 && (
                <div className="w-[68px] h-[102px] rounded-[3px] bg-avatar-bg flex items-center justify-center text-xs text-[#737373] shrink-0 font-body">
                  +{l.n - 4}
                </div>
              )}
            </div>
            <div className="text-base font-medium font-body">{l.t}</div>
            <div className="flex items-center gap-2 mt-[5px]">
              <Avatar i={l.u.split(" ").map(w => w[0]).join("")} s={20} />
              <span className="text-xs text-[#666] font-body">{l.u}</span>
              <span className="text-xs text-[#737373] font-body">· {l.n} livres</span>
              <span className="text-xs text-[#767676] font-body">· <LikeButton count={l.lk} /></span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
