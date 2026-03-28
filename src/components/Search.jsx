import { useState } from "react";
import { B } from "../data";
import Img from "./Img";

export default function Search({ open, onClose, go }) {
  const [q, setQ] = useState("");

  if (!open) return null;

  const res = q.length > 1
    ? B.filter(b => b.t.toLowerCase().includes(q.toLowerCase()) || b.a.toLowerCase().includes(q.toLowerCase()))
    : [];

  return (
    <div
      className="fixed inset-0 z-200 bg-white/97 backdrop-blur-[8px]"
      onClick={onClose}
    >
      <div
        className="max-w-[500px] mx-auto pt-20 px-5"
        onClick={e => e.stopPropagation()}
      >
        <div className="bg-surface rounded-lg py-[11px] px-4 flex items-center gap-2.5 border border-[#eee] focus-within:border-[#ccc] transition-[border] duration-150">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#bbb" strokeWidth="2" className="shrink-0">
            <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            autoFocus
            value={q}
            onChange={e => setQ(e.target.value)}
            placeholder="Chercher un livre, un auteur..."
            className="bg-transparent border-none outline-none text-[#1a1a1a] text-sm w-full font-body placeholder:text-[#767676]"
          />
        </div>
        <div className="mt-3">
          {res.map(b => (
            <div
              key={b.id}
              onClick={() => { go(b); onClose(); setQ(""); }}
              className="flex gap-3 py-2.5 cursor-pointer border-b border-border-light hover:bg-[#fafafa]"
            >
              <Img book={b} w={36} h={52} />
              <div className="flex-1">
                <div className="text-sm font-medium font-body">{b.t}</div>
                <div className="text-xs text-[#6b6b6b] font-body">{b.a} · {b.y}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
