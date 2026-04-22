import { useState, useRef, useEffect, useMemo } from "react";
import Img from "../components/Img";
import Stars from "../components/Stars";
import Avatar from "../components/Avatar";
import Label from "../components/Label";
import LikeButton from "../components/LikeButton";
import InteractiveStars from "../components/InteractiveStars";
import { useProfileData } from "../hooks/useProfileData";
import { useMyReviews } from "../hooks/useReviews";
import { useMyQuotes } from "../hooks/useQuotes";
import { useFollowCounts, useFollow } from "../hooks/useFollow";
import { useFavorites } from "../hooks/useFavorites";
import { useMyLists, createList } from "../hooks/useLists";
import { useLikes } from "../hooks/useLikes";
import { useAuth } from "../lib/AuthContext";
import { useQueryClient } from "@tanstack/react-query";
import { useNav } from "../lib/NavigationContext";
import { useNavigate, Link } from "react-router-dom";
import ContentMenu from "../components/ContentMenu";
import { supabase } from "../lib/supabase";
import { safeMutation, unwrapSupabase } from "../lib/safeMutation";
import CreateListModal from "../components/CreateListModal";
import Skeleton from "../components/Skeleton";
import Toast from "../components/Toast";
import RoleBadge from "../components/RoleBadge";
import RecommendationsSection from "../components/RecommendationsSection";
import LevelBadge from "../components/LevelBadge";
import { useToast } from "../hooks/useToast";
import { useUserRole } from "../hooks/useUserRole";
import { useUserPoints } from "../hooks/useUserPoints";
import { useUserBadges } from "../hooks/useUserBadges";
import CreatorBadge from "../components/CreatorBadge";
import { CATEGORY_COLORS, TIER_COLORS } from "../hooks/useUserBadges";
import Tooltip from "../components/Tooltip";
import BadgeIcon from "../components/BadgeIcon";

function ReadingItem({ book, go, onFinish, initialPage = 0, statusId = null, isOwner = true }) {
  const [currentPage, setCurrentPage] = useState(initialPage);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const [finished, setFinished] = useState(false);
  const [removing, setRemoving] = useState(false);
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

  const commitEdit = async () => {
    setEditing(false);
    const n = parseInt(draft, 10);
    if (!isNaN(n) && n >= 0) {
      const clamped = Math.min(n, book.p);
      const prevPage = currentPage;
      if (statusId) {
        await safeMutation({
          onOptimistic: () => setCurrentPage(clamped),
          mutate: () => unwrapSupabase(
            supabase.from("reading_status").update({ current_page: clamped }).eq("id", statusId),
            "page update"
          ),
          onRevert: () => setCurrentPage(prevPage),
          errorMessage: `page update error (statusId: ${statusId})`,
        });
      } else {
        console.error("page update skipped: statusId is null for book", book.t);
        setCurrentPage(clamped);
      }
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
          <div className="text-[11px] font-body" style={{ color: "var(--text-tertiary)" }}>{book.a}</div>
          <div className="w-full h-[3px] bg-[var(--border-default)] rounded-sm mt-1.5 overflow-hidden">
            <div className="h-full rounded-sm transition-all duration-400" style={{ width: `${pct}%`, backgroundColor: "var(--text-primary)" }} />
          </div>
        </div>
        {!isOwner ? (
          <span className="text-[11px] font-body" style={{ color: "var(--text-tertiary)" }}>p. {currentPage}/{book.p}</span>
        ) : editing ? (
          <div className="flex items-center text-[11px] font-body" style={{ color: "var(--text-tertiary)" }}>
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
              className="w-10 text-base md:text-[11px] font-body bg-transparent outline-none text-center py-0 px-0 appearance-none [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
              style={{ color: "var(--text-primary)", borderBottom: "1px solid var(--text-primary)" }}
            />
            <span>/{book.p}</span>
          </div>
        ) : (
          <div role="button" tabIndex={0} className="flex items-center gap-1.5" onClick={startEdit} onKeyDown={e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); startEdit(); } }} aria-label="Modifier la page">
            <span className="text-[11px] font-body cursor-pointer" style={{ color: "var(--text-tertiary)" }}>
              p. {currentPage}/{book.p}
            </span>
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
              className="cursor-pointer opacity-0 group-hover/row:opacity-100 transition-opacity duration-150 shrink-0"
              style={{ color: "var(--text-tertiary)" }}
            >
              <path d="M17 3a2.83 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
              <path d="m15 5 4 4" />
            </svg>
          </div>
        )}
      </div>

      {/* Completion banner */}
      <div className={`overflow-hidden transition-all duration-300 ${isOwner && finished && isComplete ? "max-h-[60px] opacity-100 mt-2" : "max-h-0 opacity-0"}`}>
        <div className="flex items-center gap-3 py-2 px-3 bg-surface rounded-lg ml-[58px]">
          <span className="text-[12px] font-medium font-body" style={{ color: "var(--text-primary)" }}>Tu l'as terminé !</span>
          <InteractiveStars value={finRating} onChange={setFinRating} size="text-xs" />
          <button
            onClick={markRead}
            className="ml-auto text-[11px] font-medium rounded-md px-2.5 py-1 border-none cursor-pointer hover:opacity-80 transition-colors duration-150 font-body"
            style={{ backgroundColor: "var(--text-primary)", color: "var(--bg-primary)" }}
          >
            Marquer comme lu
          </button>
        </div>
      </div>
    </div>
  );
}

function FavNote({ note, isOwner, onSave }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(note);
  const [popping, setPopping] = useState(false);
  const inputRef = useRef(null);

  useEffect(() => { if (editing && inputRef.current) { inputRef.current.focus(); inputRef.current.select(); } }, [editing]);

  const commit = () => {
    setEditing(false);
    if (draft.trim()) setPopping(true);
    onSave(draft.trim());
  };

  if (editing) {
    return (
      <div className="flex justify-center -mt-1.5 relative z-1">
        <div className="inline-flex items-center gap-1 rounded-[10px] px-2.5 py-[2px] shadow-[0_1px_4px_rgba(0,0,0,0.06)]" style={{ backgroundColor: "var(--bg-elevated)", border: "1px solid var(--border-default)" }}>
          <input
            ref={inputRef}
            value={draft}
            onChange={e => setDraft(e.target.value.slice(0, 24))}
            onBlur={commit}
            onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); commit(); } if (e.key === "Escape") { setEditing(false); setDraft(note); } }}
            className="bg-transparent border-none outline-none text-[11px] font-body w-[100px] text-center"
            style={{ color: "var(--text-secondary)" }}
            maxLength={24}
          />
          <span className="text-[9px] font-body shrink-0" style={{ color: "var(--text-tertiary)" }}>{draft.length}/24</span>
        </div>
      </div>
    );
  }

  if (note) {
    return (
      <div className="flex justify-center -mt-1.5 relative z-1">
        <div
          onClick={isOwner ? (e) => { e.stopPropagation(); setEditing(true); setDraft(note); } : undefined}
          onAnimationEnd={() => setPopping(false)}
          className={`inline-block rounded-[10px] px-2.5 py-[2px] shadow-[0_1px_4px_rgba(0,0,0,0.06)] whitespace-nowrap ${isOwner ? "cursor-text" : ""} ${popping ? "animate-confirm-pop" : ""}`}
          style={{ backgroundColor: "var(--bg-elevated)", border: "1px solid var(--border-default)" }}
        >
          <span className="text-[11px] font-body" style={{ color: "var(--text-secondary)" }}>{note}</span>
        </div>
      </div>
    );
  }

  if (isOwner) {
    return (
      <div className="flex justify-center -mt-1.5 relative z-1">
        <div
          onClick={e => { e.stopPropagation(); setEditing(true); setDraft(""); }}
          className="inline-block rounded-[10px] px-1.5 py-[1px] shadow-[0_1px_4px_rgba(0,0,0,0.06)] cursor-pointer opacity-100 sm:opacity-0 sm:group-hover/fav:opacity-100 transition-opacity duration-150"
          style={{ backgroundColor: "var(--bg-elevated)", border: "1px solid var(--border-default)" }}
        >
          <span className="text-[11px]" style={{ color: "var(--text-tertiary)" }}>+</span>
        </div>
      </div>
    );
  }

  return null;
}

function FavoritesSection({ favorites, isOwner, username, go, onAdd, onRemove, onSwap, onUpdateNote }) {
  const [editingRaw, setIsEditing] = useState(false);

  const [dragFrom, _setDragFrom] = useState(null);
  const dragFromRef = useRef(null);
  const setDragFrom = (v) => { dragFromRef.current = v; _setDragFrom(v); };

  const [dragOver, _setDragOver] = useState(null);
  const dragOverRef = useRef(null);
  const setDragOver = (v) => { dragOverRef.current = v; _setDragOver(v); };

  const [poppingPos, setPoppingPos] = useState(null);
  const prevFavsRef = useRef(favorites);
  const gridRef = useRef(null);
  const longPressTimer = useRef(null);
  const touchOrigin = useRef(null);

  const filledCount = favorites.filter(f => f.book).length;
  const canModify = isOwner && filledCount >= 1;
  const isEditing = editingRaw && canModify;
  const canDrag = isOwner && isEditing;

  useEffect(() => {
    const prev = prevFavsRef.current;
    const newPos = [1, 2, 3, 4].find(pos => {
      const hadBook = prev.find(f => f.position === pos)?.book;
      const hasBook = favorites.find(f => f.position === pos)?.book;
      return !hadBook && hasBook;
    });
    if (newPos) setPoppingPos(newPos);
    prevFavsRef.current = favorites;
  }, [favorites]);

  // Touch drag: passive:false touchmove on grid when drag is active (prevents scroll)
  useEffect(() => {
    if (dragFrom === null) return;
    const grid = gridRef.current;
    if (!grid) return;
    const onMove = (e) => {
      e.preventDefault();
      const touch = e.touches[0];
      if (!touch) return;
      const el = document.elementFromPoint(touch.clientX, touch.clientY);
      const slot = el?.closest("[data-fav-pos]");
      const p = slot ? parseInt(slot.dataset.favPos, 10) : null;
      if (p !== dragOverRef.current) setDragOver(p !== dragFromRef.current ? p : null);
    };
    grid.addEventListener("touchmove", onMove, { passive: false });
    return () => grid.removeEventListener("touchmove", onMove);
  }, [dragFrom]);

  const handleTouchStart = (e, pos) => {
    if (e.target.closest("button")) return;
    touchOrigin.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    longPressTimer.current = setTimeout(() => {
      setDragFrom(pos);
      navigator.vibrate?.(50);
    }, 400);
  };
  const handleTouchMoveCancel = (e) => {
    if (dragFromRef.current !== null) return;
    const t = e.touches[0];
    const o = touchOrigin.current;
    if (!o) return;
    if (Math.abs(t.clientX - o.x) > 8 || Math.abs(t.clientY - o.y) > 8) {
      clearTimeout(longPressTimer.current);
    }
  };
  const handleTouchEnd = () => {
    clearTimeout(longPressTimer.current);
    const from = dragFromRef.current;
    const to = dragOverRef.current;
    if (from !== null) {
      if (to !== null && to !== from) onSwap(from, to);
      setDragFrom(null);
      setDragOver(null);
    }
  };

  const handleDragStart = (e, pos) => {
    setDragFrom(pos);
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", String(pos));
  };
  const handleDragOver = (e, pos) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    if (pos !== dragOverRef.current) setDragOver(pos);
  };
  const handleDrop = (e, pos) => {
    e.preventDefault();
    const raw = e.dataTransfer.getData("text/plain");
    const from = raw ? parseInt(raw, 10) : dragFromRef.current;
    if (from !== null && !isNaN(from) && from !== pos) onSwap(from, pos);
    setDragFrom(null);
    setDragOver(null);
  };
  const handleDragEnd = () => { setDragFrom(null); setDragOver(null); };

  if (!isOwner && filledCount === 0) {
    return (
      <div className="border-t border-border-light py-6">
        <p className="font-display italic text-[14px]" style={{ color: "var(--text-secondary)" }}>
          {username} n'a pas encore choisi ses favoris.
        </p>
      </div>
    );
  }

  const actionBtnClass = "w-6 h-6 rounded-full flex items-center justify-center cursor-pointer p-0 transition-colors duration-150 border-[0.5px] bg-[rgba(0,0,0,0.65)] border-[rgba(255,255,255,0.15)] text-[rgba(255,255,255,0.9)] hover:bg-[rgba(0,0,0,0.85)] hover:border-[rgba(255,255,255,0.3)]";

  return (
    <div className="border-t border-border-light py-6" data-onboarding="favorites">
      <div className="flex items-baseline justify-between mb-[14px]">
        <div className="font-display italic text-[14px]" style={{ color: "var(--text-secondary)" }}>Quatre favoris</div>
        {canModify && (
          <button
            onClick={() => setIsEditing(v => !v)}
            className={`px-3 py-1 text-[12px] rounded cursor-pointer transition-colors duration-150 border-[0.5px] ${
              isEditing
                ? "bg-[var(--text-primary)] text-[var(--bg-primary)] border-[var(--text-primary)]"
                : "bg-transparent text-[var(--text-secondary)] border-[var(--border-default)] hover:border-[var(--text-tertiary)] hover:text-[var(--text-primary)]"
            }`}
          >
            {isEditing ? "Terminé" : "Modifier"}
          </button>
        )}
      </div>
      <div ref={gridRef} className="grid grid-cols-4 gap-[14px] items-stretch">
        {[1, 2, 3, 4].map(pos => {
          const fav = favorites.find(f => f.position === pos);
          const isDragging = dragFrom === pos;
          const isDropTarget = dragOver === pos && dragFrom !== pos;

          if (fav?.book) {
            return (
              <div
                key={pos}
                className="flex flex-col"
                data-fav-pos={pos}
                draggable={canDrag ? true : undefined}
                onDragStart={canDrag ? e => handleDragStart(e, pos) : undefined}
                onDragEnd={canDrag ? handleDragEnd : undefined}
                onDragOver={canDrag ? e => handleDragOver(e, pos) : undefined}
                onDrop={canDrag ? e => handleDrop(e, pos) : undefined}
                onDragLeave={canDrag ? () => setDragOver(null) : undefined}
                onTouchStart={canDrag ? e => handleTouchStart(e, pos) : undefined}
                onTouchMove={canDrag ? handleTouchMoveCancel : undefined}
                onTouchEnd={canDrag ? handleTouchEnd : undefined}
                style={{ cursor: canDrag ? "grab" : "default" }}
              >
                <div
                  className={`relative aspect-[2/3] rounded-[3px] overflow-hidden ${poppingPos === pos ? "animate-confirm-pop" : ""}`}
                  onAnimationEnd={() => setPoppingPos(null)}
                  style={{
                    opacity: isDragging ? 0.4 : 1,
                    transform: isDragging ? "scale(0.95)" : "scale(1)",
                    boxShadow: isDragging ? "0 8px 24px rgba(0,0,0,0.15)" : "none",
                    transition: "opacity 150ms, box-shadow 150ms, transform 150ms, outline-color 150ms",
                    userSelect: "none",
                    WebkitUserSelect: "none",
                    outline: isEditing ? "0.5px solid var(--text-tertiary)" : "0 solid transparent",
                    outlineOffset: "2px",
                  }}
                >
                  <Img
                    book={fav.book}
                    w={999} h={999}
                    onClick={() => { if (!isEditing && dragFrom === null) go(fav.book); }}
                    className="w-full h-full"
                  />

                  {isDropTarget && (
                    <div style={{ position: "absolute", inset: 0, borderRadius: 3, border: "2px dashed var(--text-muted)", backgroundColor: "rgba(0,0,0,0.12)", pointerEvents: "none", zIndex: 10 }} />
                  )}

                  {isOwner && isEditing && (
                    <div className="absolute top-1.5 left-1.5 right-1.5 flex justify-between items-center z-[11]">
                      <button
                        type="button"
                        aria-label="Retirer ce favori"
                        onClick={e => { e.stopPropagation(); onRemove(pos); }}
                        onTouchStart={e => e.stopPropagation()}
                        className={actionBtnClass}
                        style={{ backdropFilter: "blur(4px)" }}
                      >
                        <svg viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" className="w-3 h-3">
                          <path d="M3 3 L9 9 M9 3 L3 9"/>
                        </svg>
                      </button>
                      <button
                        type="button"
                        aria-label="Déplacer"
                        onClick={e => e.stopPropagation()}
                        className={`${actionBtnClass} cursor-grab active:cursor-grabbing`}
                        style={{ backdropFilter: "blur(4px)" }}
                      >
                        <svg viewBox="0 0 12 12" fill="currentColor" className="w-3 h-3">
                          <circle cx="4" cy="3" r="1"/><circle cx="8" cy="3" r="1"/>
                          <circle cx="4" cy="6" r="1"/><circle cx="8" cy="6" r="1"/>
                          <circle cx="4" cy="9" r="1"/><circle cx="8" cy="9" r="1"/>
                        </svg>
                      </button>
                      <button
                        type="button"
                        aria-label="Remplacer ce livre"
                        onClick={e => { e.stopPropagation(); onAdd(pos); }}
                        onTouchStart={e => e.stopPropagation()}
                        className={actionBtnClass}
                        style={{ backdropFilter: "blur(4px)" }}
                      >
                        <svg viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" className="w-3 h-3">
                          <path d="M3 5 L3 4 C3 3.4 3.4 3 4 3 L10 3 L8.5 1.5 M11 9 L11 10 C11 10.6 10.6 11 10 11 L4 11 L5.5 12.5"/>
                        </svg>
                      </button>
                    </div>
                  )}
                </div>

                <FavNote note={fav.note} isOwner={isOwner} onSave={text => onUpdateNote(pos, text)} />

                <div className="mt-2 min-h-[40px]">
                  <div className="text-[15px] font-display leading-tight">{fav.book.t}</div>
                  <div className="text-[12px] font-body" style={{ color: "var(--text-secondary)" }}>
                    {fav.book.a.split(" ").pop()}{fav.book.y ? `, ${fav.book.y}` : ""}
                  </div>
                </div>
              </div>
            );
          }

          if (!isOwner) {
            return (
              <div key={pos} className="flex flex-col">
                <div
                  className="w-full aspect-[2/3] rounded-[3px] border-[0.5px] border-dashed border-[var(--border-default)]"
                  aria-hidden="true"
                />
                <div className="mt-2 min-h-[40px]" aria-hidden="true" />
              </div>
            );
          }

          return (
            <div
              key={pos}
              className="flex flex-col"
              data-fav-pos={pos}
              onDragOver={canDrag ? e => handleDragOver(e, pos) : undefined}
              onDrop={canDrag ? e => handleDrop(e, pos) : undefined}
            >
              <Tooltip text="Ajouter un favori" strategy="fixed">
                <div
                  role="button"
                  tabIndex={0}
                  aria-label="Ajouter un favori"
                  onClick={() => { if (!dragFrom) onAdd(pos); }}
                  onKeyDown={e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onAdd(pos); } }}
                  className="group/slot w-full aspect-[2/3] rounded-[3px] flex items-center justify-center cursor-pointer transition-colors duration-150 border-[0.5px] border-dashed border-[var(--border-default)] hover:border-[var(--text-tertiary)]"
                >
                  <span className="font-light leading-none transition-colors duration-150 text-[22px] text-[var(--text-tertiary)] group-hover/slot:text-[var(--text-primary)]">+</span>
                </div>
              </Tooltip>
              <div className="mt-2 min-h-[40px]" aria-hidden="true" />
            </div>
          );
        })}
      </div>
    </div>
  );
}

function EmptyState({ children }) {
  return <div className="py-10 text-center">{children}</div>;
}

const TAB_SUBTITLES = {
  "journal": "Tes lectures terminées, par date",
  "bibliothèque": "Livres lus, en cours ou abandonnés",
  "à lire": "Ta liste de livres à découvrir",
  "mes critiques": "Tes avis sur les livres lus",
  "mes citations": "Les phrases que tu as sauvegardées",
  "mes listes": "Tes sélections de livres",
  "bilan": "Tes stats de lecture",
};

export default function ProfilePage({ viewedProfile, initialTab }) {
  const [tab, setTab] = useState(initialTab || "journal");
  const [libView, setLibView] = useState("grille");
  const [showHints, setShowHints] = useState(() => !localStorage.getItem("reliure_tab_hints_seen"));
  const [hintsOpacity, setHintsOpacity] = useState(0);
  const [badgeModal, setBadgeModal] = useState(null); // null | "pick" | { swapping: badgeId }
  useEffect(() => { if (initialTab) setTab(initialTab); }, [initialTab]);
  useEffect(() => {
    if (!showHints) return;
    localStorage.setItem("reliure_tab_hints_seen", "1");
    const t1 = setTimeout(() => setHintsOpacity(1), 30);
    const t2 = setTimeout(() => setHintsOpacity(0), 3000);
    const t3 = setTimeout(() => setShowHints(false), 3200);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, [showHints]);
  useEffect(() => {
    if (!badgeModal) return;
    const handler = e => { if (e.key === "Escape") setBadgeModal(null); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [badgeModal]);
  const { goToBook: go, openSearchFor } = useNav();
  const navigate = useNavigate();
  const { user } = useAuth();
  const profile = viewedProfile;
  const profileId = viewedProfile?.id;
  const { role } = useUserRole(profileId);
  const { levelName, totalPoints, monthlyPoints, badges, pinnedBadges } = useUserPoints(profileId);
  const queryClient = useQueryClient();

  // Inline profile editing state
  const [editingName, setEditingName] = useState(false);
  const [nameDraft, setNameDraft] = useState("");
  const [localDisplayName, setLocalDisplayName] = useState(null);
  const [editingBio, setEditingBio] = useState(false);
  const [bioDraft, setBioDraft] = useState("");
  const [localBio, setLocalBio] = useState(null);
  const [localAvatar, setLocalAvatar] = useState(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const avatarInputRef = useRef(null);
  const nameInputRef = useRef(null);
  const bioTextareaRef = useRef(null);

  const displayName = localDisplayName ?? profile?.display_name;
  const bio = localBio ?? profile?.bio;
  const avatarUrl = localAvatar ?? profile?.avatar_url;

  useEffect(() => {
    if (editingName && nameInputRef.current) { nameInputRef.current.focus(); nameInputRef.current.select(); }
  }, [editingName]);

  useEffect(() => {
    if (editingBio && bioTextareaRef.current) { bioTextareaRef.current.focus(); }
  }, [editingBio]);

  const startEditName = () => {
    setNameDraft(displayName || profile?.username || "");
    setEditingName(true);
  };

  const commitName = async () => {
    setEditingName(false);
    const trimmed = nameDraft.trim().slice(0, 50);
    if (!trimmed || trimmed === (displayName || profile?.username)) return;
    setLocalDisplayName(trimmed);
    await supabase.from("users").update({ display_name: trimmed }).eq("id", user.id);
  };

  const startEditBio = () => {
    setBioDraft(bio || "");
    setEditingBio(true);
  };

  const commitBio = async () => {
    setEditingBio(false);
    const trimmed = bioDraft.trim().slice(0, 160);
    if (trimmed === (bio || "")) return;
    setLocalBio(trimmed || null);
    await supabase.from("users").update({ bio: trimmed || null }).eq("id", user.id);
  };

  const invalidateBadges = () => {
    queryClient.invalidateQueries({ queryKey: ["userBadges", profileId] });
    queryClient.invalidateQueries({ queryKey: ["userPoints", profileId] });
  };

  const pinBadgeFromModal = async (badgeId) => {
    const isPinned = pinnedBadges.some(p => p.badge_id === badgeId);
    if (isPinned) {
      await supabase.from("user_badges").update({ is_pinned: false }).eq("user_id", user.id).eq("badge_id", badgeId);
      invalidateBadges();
      setBadgeModal(null);
      return;
    }
    if (pinnedBadges.length < 3) {
      await supabase.from("user_badges").update({ is_pinned: true }).eq("user_id", user.id).eq("badge_id", badgeId);
      invalidateBadges();
      setBadgeModal(null);
      return;
    }
    setBadgeModal({ swapping: badgeId });
  };

  const swapBadgeFromModal = async (oldBadgeId) => {
    const newBadgeId = badgeModal.swapping;
    await supabase.from("user_badges").update({ is_pinned: false }).eq("user_id", user.id).eq("badge_id", oldBadgeId);
    await supabase.from("user_badges").update({ is_pinned: true }).eq("user_id", user.id).eq("badge_id", newBadgeId);
    invalidateBadges();
    setBadgeModal(null);
  };

  const [avatarError, setAvatarError] = useState(null);
  const showAvatarError = (msg) => {
    setAvatarError(msg);
    setTimeout(() => setAvatarError(null), 4000);
  };

  const compressImage = (file) => new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      const MAX = 200;
      const ratio = Math.min(MAX / img.width, MAX / img.height, 1);
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(img.width * ratio);
      canvas.height = Math.round(img.height * ratio);
      canvas.getContext("2d").drawImage(img, 0, 0, canvas.width, canvas.height);
      canvas.toBlob(blob => blob ? resolve(blob) : reject(new Error("canvas toBlob failed")), "image/jpeg", 0.70);
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error("image load failed")); };
    img.src = url;
  });

  const handleAvatarChange = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (!["image/jpeg", "image/jpg", "image/png", "image/webp"].includes(file.type)) {
      showAvatarError("Format non supporté. Utilise un fichier JPG, PNG ou WebP.");
      return;
    }
    if (file.size > 1 * 1024 * 1024) {
      showAvatarError("Image trop lourde. Maximum 1 Mo.");
      return;
    }
    setUploadingAvatar(true);
    let blob;
    try { blob = await compressImage(file); } catch (err) { console.error("compress error:", err); setUploadingAvatar(false); return; }
    const path = `${user.id}/avatar.jpg`;
    const { error: uploadErr } = await supabase.storage.from("avatars").upload(path, blob, { upsert: true, contentType: "image/jpeg" });
    if (uploadErr) { console.error("avatar upload error:", uploadErr); setUploadingAvatar(false); return; }
    const { data: { publicUrl } } = supabase.storage.from("avatars").getPublicUrl(path);
    const urlWithBust = `${publicUrl}?t=${Date.now()}`;
    await supabase.from("users").update({ avatar_url: urlWithBust }).eq("id", user.id);
    setLocalAvatar(urlWithBust);
    setUploadingAvatar(false);
  };
  const isOwnProfile = user?.id === profileId;
  const profileData = useProfileData(profileId);
  const dbReading = useMemo(() => (profileData.allStatuses || []).filter(s => s.status === "reading"), [profileData.allStatuses]);
  const { reviews: myReviews, refetch: refetchReviews } = useMyReviews(profileId, { enabled: tab === "mes critiques" });
  const { quotes: myQuotes, refetch: refetchQuotes } = useMyQuotes(profileId, { enabled: tab === "mes citations" });
  const { followers, following: followingCount } = useFollowCounts(profileId);
  const { following: isFollowing, follow, unfollow } = useFollow(!isOwnProfile ? profileId : null);
  const { favorites, loading: favoritesLoading, setFavorite, removeFavorite, swapPositions, updateNote } = useFavorites(profileId);
  const { lists: myLists, refetch: refetchLists } = useMyLists(profileId, { enabled: tab === "mes listes" });
  const { hasCreator } = useUserBadges(profileId);
  const listIds = myLists.map(l => l.id);
  const { likedSet: listLikedSet, initialSet: listInitialSet, toggle: toggleListLike } = useLikes(listIds, "list");
  const [showCreateList, setShowCreateList] = useState(false);
  const { toast, showToast } = useToast();
  const onSearch = () => navigate("/");
  const onBackfill = () => navigate("/backfill");

  // Normalize reading books from Supabase
  const normalizeStatus = rs => ({
    id: rs.books?.id || rs.book_id,
    t: rs.books?.title || "?",
    a: Array.isArray(rs.books?.authors) ? rs.books.authors.join(", ") : (rs.books?.authors || ""),
    c: rs.books?.cover_url,
    p: rs.books?.page_count || 0,
    r: rs.books?.avg_rating || 0,
    slug: rs.books?.slug,
    _supabase: rs.books,
    _currentPage: rs.current_page || 0,
    _statusId: rs.id,
  });

  const readingBooks = dbReading.map(normalizeStatus);

  const removeFromReading = async id => {
    const item = readingBooks.find(b => b.id === id);
    if (item?._statusId) {
      await supabase.from("reading_status").update({ status: "read", finished_at: new Date().toISOString() }).eq("id", item._statusId);
    }
    profileData.refetch();
  };

  // Diary: group read books by month
  const diaryMonths = useMemo(() => {
    const months = ["janvier", "février", "mars", "avril", "mai", "juin", "juillet", "août", "septembre", "octobre", "novembre", "décembre"];
    const grouped = new Map();
    (profileData.diaryBooks || []).forEach(rs => {
      const d = new Date(rs.finished_at);
      const key = `${months[d.getMonth()].charAt(0).toUpperCase() + months[d.getMonth()].slice(1)} ${d.getFullYear()}`;
      if (!grouped.has(key)) grouped.set(key, []);
      grouped.get(key).push({
        b: { id: rs.books?.id, t: rs.books?.title, c: rs.books?.cover_url, a: Array.isArray(rs.books?.authors) ? rs.books.authors.join(", ") : "", slug: rs.books?.slug, _supabase: rs.books },
        d: String(d.getDate()),
        lk: false,
      });
    });
    return Array.from(grouped.entries());
  }, [profileData.diaryBooks]);

  // Library: read, reading, abandoned only (want_to_read has its own tab)
  const libraryBooks = (profileData.allStatuses || [])
    .filter(rs => rs.status !== "want_to_read")
    .map(rs => ({
      ...normalizeStatus(rs),
      _rating: profileData.reviewMap?.get(rs.book_id) || 0,
    }));

  const wantToReadBooks = (profileData.allStatuses || [])
    .filter(rs => rs.status === "want_to_read")
    .map(rs => normalizeStatus(rs));

  // Stats
  const totalBooks = profileData.stats?.total || 0;
  const booksThisYear = profileData.stats?.thisYear || 0;

  const handleCreateList = async (opts) => {
    if (!user) return;
    const created = await createList(user.id, opts);
    if (created) {
      refetchLists();
      const listSlug = created.slug || created.id;
      navigate(`/${profile?.username || user.user_metadata?.username}/listes/${listSlug}`);
    }
  };

  return (
    <div>
      {toast.visible && <Toast message={toast.message} />}
      {/* Header */}
      <div className="pt-8 pb-6">
        <div className="flex items-center gap-3.5 mb-3.5 flex-wrap sm:flex-nowrap">
          {/* Avatar — editable on own profile */}
          {isOwnProfile ? (
            <div
              className="relative rounded-full shrink-0 cursor-pointer group/avatar"
              style={{ width: 52, height: 52 }}
              onClick={() => avatarInputRef.current?.click()}
            >
              <Avatar
                i={(displayName || profile.username || "?").split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2)}
                s={52}
                src={avatarUrl}
              />
              <div className="absolute inset-0 rounded-full bg-black/40 flex items-center justify-center opacity-0 group-hover/avatar:opacity-100 transition-opacity duration-150">
                {uploadingAvatar ? (
                  <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                ) : (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                    <circle cx="12" cy="13" r="4" />
                  </svg>
                )}
              </div>
              <input
                ref={avatarInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                onChange={handleAvatarChange}
              />
            </div>
          ) : (
            <Avatar
              i={(displayName || profile.username || "?").split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2)}
              s={52}
              src={avatarUrl}
            />
          )}
          <div className="flex-1">
            {/* Display name — editable on own profile */}
            {isOwnProfile && editingName ? (
              <input
                ref={nameInputRef}
                type="text"
                value={nameDraft}
                onChange={e => setNameDraft(e.target.value)}
                onBlur={commitName}
                onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); commitName(); } if (e.key === "Escape") setEditingName(false); }}
                maxLength={50}
                className="text-[22px] font-normal font-display bg-transparent border-none outline-none w-full py-0 px-0"
                style={{ borderBottom: "1px solid var(--text-primary)" }}
              />
            ) : (
              <div
                className={`flex items-center gap-1.5 ${isOwnProfile ? "cursor-pointer group/name" : ""}`}
                onClick={isOwnProfile ? startEditName : undefined}
              >
                <span className="text-[22px] font-normal font-display">{displayName || profile.username}</span>
                {isOwnProfile && <span className="text-[15px] select-none opacity-0 group-hover/name:opacity-100 transition-opacity duration-150" style={{ color: "var(--text-muted)" }}>✎</span>}
              </div>
            )}
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-body" style={{ color: "var(--text-tertiary)" }}>@{profile.username}</span>
            </div>
          </div>
          <div className="flex flex-col w-full sm:w-auto mt-2 sm:mt-0">
            <div className="flex gap-5 text-xs font-body" style={{ color: "var(--text-tertiary)" }}>
              {[[totalBooks, totalBooks < 2 ? "livre" : "livres"], [booksThisYear, "cette année"], [followers, followers < 2 ? "abonné" : "abonnés"], [followingCount, followingCount < 2 ? "abonnement" : "abonnements"]].map(([n, l]) => (
                <span key={l}><strong className="font-semibold" style={{ color: "var(--text-primary)" }}>{n}</strong> {l}</span>
              ))}
            </div>
            {false && (pinnedBadges.length > 0 || isOwnProfile) && (
              <div className="flex gap-2 mt-2">
                {[0, 1, 2].map(slot => {
                  const b = pinnedBadges[slot];
                  if (!b) {
                    if (!isOwnProfile) return null;
                    return (
                      <button
                        key={slot}
                        onClick={() => setBadgeModal("pick")}
                        className="flex items-center justify-center rounded-full cursor-pointer"
                        style={{ width: 32, height: 32, border: "1.5px dashed var(--border-default)", background: "transparent" }}
                      >
                        <span style={{ fontSize: 14, color: "var(--text-muted)", lineHeight: 1 }}>+</span>
                      </button>
                    );
                  }
                  const d = b.badge_definitions;
                  const color = (d?.tier && TIER_COLORS[d.tier]) || CATEGORY_COLORS[d?.category] || "var(--text-tertiary)";
                  return (
                    <Tooltip
                      key={b.id}
                      multiline
                      text={
                        <>
                          <div style={{ fontWeight: 600, fontSize: 12, whiteSpace: "nowrap" }}>{d?.name}</div>
                          {d?.description && <div style={{ fontSize: 11, color: "rgba(255,255,255,0.7)", lineHeight: 1.4, marginTop: 2 }}>{d.description}</div>}
                        </>
                      }
                    >
                      <div
                        style={{ cursor: isOwnProfile ? "pointer" : "default" }}
                        onClick={isOwnProfile ? () => setBadgeModal("pick") : undefined}
                      >
                        <BadgeIcon badgeId={d?.id} iconKey={d?.icon_key} category={d?.category} tier={d?.tier} size={32} />
                      </div>
                    </Tooltip>
                  );
                })}
              </div>
            )}
          </div>
          {!isOwnProfile && (
            <button
              onClick={() => {
                if (!user) { navigate("/login"); return; }
                const action = isFollowing ? unfollow : follow;
                action(() => showToast("Une erreur est survenue"));
              }}
              className="shrink-0 px-4 py-1.5 rounded-full text-[13px] font-medium font-body border transition-colors duration-150 hover:opacity-80"
              style={isFollowing
                ? { backgroundColor: "transparent", color: "var(--text-tertiary)", borderColor: "var(--border-default)" }
                : { backgroundColor: "var(--text-primary)", color: "var(--bg-primary)", borderColor: "var(--text-primary)" }
              }
            >
              {isFollowing ? "Abonné·e" : "Suivre"}
            </button>
          )}
        </div>
        {/* Bio — editable on own profile */}
        {isOwnProfile ? (
          editingBio ? (
            <div className="max-w-[480px] mb-3">
              <textarea
                ref={bioTextareaRef}
                value={bioDraft}
                onChange={e => setBioDraft(e.target.value.slice(0, 160))}
                onBlur={commitBio}
                onKeyDown={e => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) { e.preventDefault(); commitBio(); } if (e.key === "Escape") setEditingBio(false); }}
                rows={3}
                maxLength={160}
                className="w-full text-[13px] leading-relaxed font-body bg-transparent rounded-lg outline-none p-2.5 resize-none transition-[border] duration-150"
                style={{ color: "var(--text-secondary)", border: "1px solid var(--border-default)" }}
                onFocus={e => e.target.style.borderColor = "var(--text-tertiary)"}
                onBlurCapture={e => e.target.style.borderColor = "var(--border-default)"}
              />
              <div className="text-[10px] font-body text-right mt-1" style={{ color: "var(--text-tertiary)" }}>{bioDraft.length}/160</div>
            </div>
          ) : bio ? (
            <div
              className="flex items-start gap-1.5 max-w-[480px] mb-3 cursor-pointer group/bio"
              onClick={startEditBio}
            >
              <p className="text-[13px] leading-relaxed m-0 font-body" style={{ color: "var(--text-secondary)" }}>{bio}</p>
              <span className="text-[13px] select-none shrink-0 mt-px opacity-0 group-hover/bio:opacity-100 transition-opacity duration-150" style={{ color: "var(--text-muted)" }}>✎</span>
            </div>
          ) : (
            <p
              className="text-[14px] italic max-w-[480px] m-0 mb-3 font-body cursor-pointer transition-colors duration-150"
              style={{ color: "var(--text-tertiary)" }}
              onClick={startEditBio}
            >
              Ajoute une bio...
            </p>
          )
        ) : profile.bio ? (
          <p className="text-[13px] leading-relaxed max-w-[480px] m-0 mb-3 font-body" style={{ color: "var(--text-secondary)" }}>
            {profile.bio}
          </p>
        ) : null}
        {/* Avatar error toast */}
        {avatarError && (
          <div className="mt-3 px-3 py-2 rounded-lg text-[12px] font-body max-w-[360px]" style={{ backgroundColor: "var(--color-error-bg)", border: "1px solid var(--color-error-border)", color: "var(--color-error)" }}>
            {avatarError}
          </div>
        )}
      </div>

      {/* Backfill banner — own profile only, masqué si déjà des livres */}
      {isOwnProfile && totalBooks === 0 && (
        <div
          role="button"
          tabIndex={0}
          onClick={onBackfill}
          onKeyDown={e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onBackfill(); } }}
          className="flex items-center gap-4 p-3 px-4 rounded-lg cursor-pointer transition-colors duration-150 mb-0" style={{ backgroundColor: "var(--bg-elevated)", border: "1px solid var(--border-default)" }}
        >
          <div className="flex-1">
            <div className="text-[13px] font-medium font-body">Importe ta bibliothèque</div>
            <div className="text-xs font-body" style={{ color: "var(--text-tertiary)" }}>Transfère tes lectures depuis Goodreads, Babelio ou ajoute-les manuellement en quelques clics.</div>
          </div>
          <button className="px-3 py-[6px] rounded-[16px] text-xs font-medium font-body cursor-pointer transition-colors duration-150 shrink-0" style={{ backgroundColor: "var(--text-primary)", color: "var(--bg-primary)", border: "none" }}>
            📥 Importer
          </button>
        </div>
      )}
      {isOwnProfile && totalBooks > 0 && (
        <button
          onClick={onBackfill}
          className="self-start text-xs font-body bg-transparent border-none cursor-pointer p-0 transition-opacity duration-150 hover:opacity-100"
          style={{ color: "var(--text-muted)", opacity: 0.5 }}
        >
          + Importer d'autres lectures
        </button>
      )}

      {/* Quatre favoris */}
      {favoritesLoading ? (
        <div className="border-t border-border-light py-6">
          <div className="grid grid-cols-4 gap-[14px]">
            {[1, 2, 3, 4].map(i => <Skeleton.Cover key={i} />)}
          </div>
        </div>
      ) : <FavoritesSection
        favorites={favorites}
        isOwner={isOwnProfile}
        username={profile?.username}
        go={go}
        onAdd={pos => {
          openSearchFor(async (book) => {
            const bookId = book._supabase?.id || book.id;
            await setFavorite(pos, bookId);
          });
        }}
        onRemove={removeFavorite}
        onSwap={swapPositions}
        onUpdateNote={updateNote}
      />}

      {/* En cours */}
      <div className="border-t border-border-light py-6">
        <Label>En cours de lecture</Label>
        {readingBooks.length > 0 ? (
          readingBooks.map(b => (
            <ReadingItem key={b.id} book={b} go={go} onFinish={removeFromReading} initialPage={b._currentPage || 0} statusId={b._statusId} isOwner={isOwnProfile} />
          ))
        ) : (
          <EmptyState>
            <div className="text-sm font-body" style={{ color: "var(--text-tertiary)" }}>Rien en cours.</div>
            <div className="text-xs font-body mt-1" style={{ color: "var(--text-tertiary)" }}>
              Que lis-tu en ce moment ?{" "}
              <span role="button" tabIndex={0} onClick={onSearch} onKeyDown={e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onSearch(); } }} className="underline cursor-pointer hover:opacity-80 transition-colors duration-150">Chercher</span>
            </div>
          </EmptyState>
        )}
      </div>

      {/* Tu pourrais aimer — owner only */}
      {isOwnProfile && <RecommendationsSection userId={user.id} />}

      {/* Tabs */}
      <div className="border-t border-border-light">
        <div className="flex">
          {[
            ["journal", "Journal", "tab-journal"],
            ["bibliothèque", "Bibliothèque", "tab-bibliotheque"],
            ["à lire", wantToReadBooks.length > 0 ? `À lire (${wantToReadBooks.length})` : "À lire", "tab-a-lire"],
            ["mes critiques", isOwnProfile ? "Mes critiques" : "Ses critiques", "tab-critiques"],
            ["mes citations", isOwnProfile ? "Mes citations" : "Ses citations", "tab-citations"],
            ["mes listes", isOwnProfile ? "Mes listes" : "Ses listes", "tab-listes"],
            ["bilan", "Bilan", "tab-bilan"],
          ].map(([value, label, onboardingKey]) => (
            <button
              key={value}
              data-onboarding={onboardingKey}
              onClick={() => setTab(value)}
              className={`flex-1 py-3 bg-transparent border-none cursor-pointer font-body border-b-2 ${
                tab === value
                  ? "font-semibold"
                  : "font-normal border-b-transparent"
              }`}
              style={tab === value
                ? { color: "var(--text-primary)", borderBottomColor: "var(--text-primary)" }
                : { color: "var(--text-tertiary)" }
              }
            >
              <div className="text-xs">{label}</div>
              {showHints && tab === value && (
                <div style={{ opacity: hintsOpacity, transition: "opacity 150ms", color: "var(--text-tertiary)" }} className="text-[11px] font-normal mt-0.5 leading-tight">
                  {TAB_SUBTITLES[value]}
                </div>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Journal/diary */}
      {tab === "journal" && (
        <div className="py-4">
          {profileData.loading ? (
            <div className="flex gap-1.5 flex-wrap">
              {[1, 2, 3, 4, 5].map(i => <Skeleton.Cover key={i} w={80} h={120} />)}
            </div>
          ) : diaryMonths.length > 0 ? (
            diaryMonths.map(([monthLabel, entries]) => (
              <div key={monthLabel} className="mb-6">
                <div className="text-[11px] font-semibold uppercase tracking-[1.5px] mb-3 pb-2 border-b border-border-light font-body" style={{ color: "var(--text-tertiary)" }}>
                  {monthLabel}
                </div>
                <div className="flex gap-1.5 flex-wrap">
                  {entries.map((e, i) => (
                    <div key={`${monthLabel}-${e.b.id}-${i}`} role="button" tabIndex={0} className="relative cursor-pointer" onClick={() => go(e.b)} onKeyDown={ev => { if (ev.key === "Enter" || ev.key === " ") { ev.preventDefault(); go(e.b); } }}>
                      <Img book={e.b} w={80} h={120} />
                      <div className="absolute bottom-1 left-1 right-1 flex justify-between items-center">
                        <span className="text-[8px] bg-black/60 text-white px-1 py-[2px] rounded-sm font-body">{e.d}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))
          ) : (
            <EmptyState>
              {isOwnProfile ? (
                <>
                  <div className="text-sm font-body" style={{ color: "var(--text-tertiary)" }}>Ton journal de lecture est vide.</div>
                  <div className="text-[13px] font-body mt-1" style={{ color: "var(--text-tertiary)" }}>Ajoute ton premier livre.</div>
                  <button onClick={onSearch} className="mt-4 px-5 py-2.5 rounded-[20px] text-[13px] font-medium font-body border-none cursor-pointer hover:opacity-80 transition-colors duration-150" style={{ backgroundColor: "var(--text-primary)", color: "var(--bg-primary)" }}>Chercher un livre</button>
                </>
              ) : (
                <div className="text-sm font-body" style={{ color: "var(--text-tertiary)" }}>Aucune lecture enregistrée pour l'instant.</div>
              )}
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
                      ? "shadow-[0_1px_3px_rgba(0,0,0,0.08)]"
                      : "bg-transparent"
                  }`}
                  style={libView === k
                    ? { backgroundColor: "var(--bg-elevated)", color: "var(--text-primary)" }
                    : { color: "var(--text-tertiary)" }
                  }
                >
                  {l}
                </button>
              ))}
            </div>
            <span className="text-[11px] font-body" style={{ color: "var(--text-tertiary)" }}>{libraryBooks.length} livres</span>
          </div>

          {libraryBooks.length === 0 ? (
            isOwnProfile ? (
              <div className="py-14 flex flex-col items-center text-center px-4">
                <h2 className="font-display text-[22px] font-normal mb-3" style={{ color: "var(--text-primary)" }}>
                  Ta bibliothèque t'attend.
                </h2>
                <p className="text-[14px] font-body leading-relaxed mb-7" style={{ maxWidth: 360, color: "var(--text-secondary)" }}>
                  Reliure garde la trace de tout ce que tu lis — tes critiques, tes citations, tes coups de cœur. Commence par importer ta bibliothèque Goodreads ou ajoute ton premier livre.
                </p>
                <div className="flex flex-col sm:flex-row gap-3 items-center">
                  <button
                    onClick={() => navigate("/backfill")}
                    className="px-5 py-2.5 rounded-[20px] text-[13px] font-medium font-body border-none cursor-pointer hover:opacity-80 transition-colors duration-150"
                    style={{ backgroundColor: "var(--text-primary)", color: "var(--bg-primary)" }}
                  >
                    📥 Importer depuis Goodreads
                  </button>
                  <button
                    onClick={() => navigate("/")}
                    className="px-5 py-2.5 rounded-[20px] text-[13px] font-medium font-body bg-transparent cursor-pointer transition-colors duration-150"
                    style={{ color: "var(--text-primary)", border: "1px solid var(--border-default)" }}
                  >
                    Parcourir les livres
                  </button>
                </div>
                <p className="text-[11px] font-body mt-5" style={{ color: "var(--text-tertiary)" }}>
                  Tu peux aussi{" "}
                  <button onClick={() => navigate("/backfill")} className="bg-transparent border-none cursor-pointer text-[11px] font-body underline p-0 hover:opacity-80 transition-colors duration-100" style={{ color: "var(--text-tertiary)" }}>
                    importer
                  </button>
                  {" "}depuis Babelio ou Livraddict.
                </p>
              </div>
            ) : (
              <EmptyState>
                <div className="text-sm font-body" style={{ color: "var(--text-tertiary)" }}>Aucun livre dans la bibliothèque.</div>
              </EmptyState>
            )
          ) : <>

          {/* Grille */}
          {libView === "grille" && (
            <div className="grid grid-cols-5 sm:grid-cols-8 gap-2.5">
              {libraryBooks.map(b => (
                <Img key={b.id} book={b} w={999} h={999} onClick={() => go(b)} className="w-full h-auto aspect-[2/3]" />
              ))}
            </div>
          )}

          {/* Liste */}
          {libView === "liste" && (
            <div>
              {libraryBooks.map(b => (
                <div
                  key={b.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => go(b)}
                  onKeyDown={e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); go(b); } }}
                  className="flex items-center gap-3 py-2.5 cursor-pointer hover:bg-surface transition-colors duration-100"
                  style={{ borderBottom: "0.5px solid var(--border-subtle)" }}
                >
                  <Img book={b} w={36} h={54} />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium font-body truncate">{b.t}</div>
                    <div className="text-xs font-body" style={{ color: "var(--text-tertiary)" }}>{b.a} · {b.y}</div>
                  </div>
                  {(b._rating || b.r) > 0 && <Stars r={b._rating || b.r} s={11} />}
                </div>
              ))}
            </div>
          )}

          {/* Étagère */}
          {libView === "étagère" && (() => {
            const shelfSize = typeof window !== "undefined" && window.innerWidth < 640 ? 5 : 8;
            const shelves = [];
            for (let i = 0; i < libraryBooks.length; i += shelfSize) {
              shelves.push(libraryBooks.slice(i, i + shelfSize));
            }
            return (
              <div className="bg-surface rounded-lg p-3 sm:p-4 flex flex-col gap-0">
                {shelves.map((shelf, si) => (
                  <div key={si} className="mb-1">
                    {/* Books */}
                    <div className="flex items-end gap-1.5 px-1">
                      {shelf.map((b, bi) => (
                        <div
                          key={b.id}
                          className="shrink-0"
                          style={{ transform: `rotate(${bi % 2 === 0 ? -1.5 : 1}deg)` }}
                        >
                          <Img book={b} w={80} h={120} onClick={() => go(b)} />
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

          </>}
        </div>
      )}

      {/* À lire */}
      {tab === "à lire" && (
        <div className="py-4">
          {wantToReadBooks.length === 0 ? (
            <EmptyState>
              <div className="text-sm font-body" style={{ color: "var(--text-tertiary)" }}>
                {isOwnProfile ? "Ta liste de lecture est vide." : "Aucun livre en liste de lecture."}
              </div>
              {isOwnProfile && (
                <button
                  onClick={() => navigate("/")}
                  className="mt-3 px-4 py-2 rounded-[20px] text-[12px] font-medium font-body bg-transparent cursor-pointer transition-colors duration-150"
                  style={{ color: "var(--text-primary)", border: "1px solid var(--border-default)" }}
                >
                  Parcourir les livres
                </button>
              )}
            </EmptyState>
          ) : (
            <div className="grid grid-cols-5 sm:grid-cols-8 gap-2.5">
              {wantToReadBooks.map(b => (
                <Img key={b.id} book={b} w={999} h={999} onClick={() => go(b)} className="w-full h-auto aspect-[2/3]" />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Critiques */}
      {tab === "mes critiques" && (
        <div className="py-3">
          {myReviews.length > 0 ? myReviews.map(rv => {
            const b = rv.books;
            if (!b) return null;
            const bookObj = { id: b.id, t: b.title, a: Array.isArray(b.authors) ? b.authors.join(", ") : "", c: b.cover_url, y: b.publication_date ? parseInt(b.publication_date) : null, slug: b.slug, _supabase: b };
            return (
              <div key={rv.id} className="group py-5 border-b border-border-light relative">
                <div className="flex gap-4">
                  <Img book={bookObj} w={72} h={108} onClick={() => go(bookObj)} />
                  <div className="flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="text-base font-medium font-body mb-0.5">{b.title}</div>
                        <div className="text-xs mb-2 font-body" style={{ color: "var(--text-tertiary)" }}>{bookObj.a}{bookObj.y ? `, ${bookObj.y}` : ""}</div>
                      </div>
                      <ContentMenu type="review" item={rv} onDelete={() => refetchReviews()} onEdit={() => refetchReviews()} />
                    </div>
                    {rv.rating > 0 && <Stars r={rv.rating} s={12} />}
                    {rv.contains_spoilers ? (
                      <details className="mt-2.5">
                        <summary className="text-[11px] text-spoiler cursor-pointer font-medium font-body">Cette critique contient des spoilers</summary>
                        <p className="text-[15px] leading-[1.7] mt-2.5 font-body" style={{ color: "var(--text-body)" }}>{rv.body}</p>
                      </details>
                    ) : (
                      <p className="text-[15px] leading-[1.7] mt-2.5 font-body" style={{ color: "var(--text-body)" }}>{rv.body}</p>
                    )}
                  </div>
                </div>
              </div>
            );
          }) : (
            <EmptyState>
              {isOwnProfile ? (
                <>
                  <div className="text-sm font-body" style={{ color: "var(--text-tertiary)" }}>Tu n'as pas encore écrit de critique.</div>
                  <button onClick={() => navigate("/")} className="mt-4 px-5 py-2.5 rounded-[20px] text-[13px] font-medium font-body border-none cursor-pointer hover:opacity-80 transition-colors duration-150" style={{ backgroundColor: "var(--text-primary)", color: "var(--bg-primary)" }}>Explorer des livres</button>
                </>
              ) : (
                <div className="text-sm font-body" style={{ color: "var(--text-tertiary)" }}>Aucune critique pour l'instant.</div>
              )}
            </EmptyState>
          )}
        </div>
      )}

      {/* Citations */}
      {tab === "mes citations" && (
        <div className="py-3">
          {myQuotes.length > 0 ? myQuotes.map(q => {
            const b = q.books;
            const bookObj = b ? { id: q.book_id, t: b.title, a: Array.isArray(b.authors) ? b.authors.join(", ") : "", c: b.cover_url, slug: b.slug, _supabase: b } : null;
            return (
              <div key={q.id} className="group py-5 border-b border-border-light relative">
                <div className="flex items-start justify-between gap-2">
                  <div className="text-[15px] leading-[1.7] border-l-[3px] border-l-cover-fallback pl-4 mb-3 font-display flex-1" style={{ color: "var(--text-primary)" }}>
                    « {q.text} »
                  </div>
                  <ContentMenu type="quote" item={q} onDelete={() => refetchQuotes()} onEdit={() => refetchQuotes()} />
                </div>
                {bookObj && (
                  <div className="flex items-center gap-2.5">
                    <Img book={bookObj} w={28} h={40} onClick={() => go(bookObj)} />
                    <Link to={`/livre/${bookObj.slug}`} className="text-[13px] font-medium font-body no-underline hover:opacity-80 transition-colors duration-100" style={{ color: "var(--text-primary)" }}>{bookObj.t}</Link>
                    <span className="text-xs font-body" style={{ color: "var(--text-tertiary)" }}>· {bookObj.a}</span>
                  </div>
                )}
              </div>
            );
          }) : (
            <EmptyState>
              <div className="text-sm font-body" style={{ color: "var(--text-tertiary)" }}>
                {isOwnProfile ? "Tu n'as pas encore sauvegardé de citation." : "Aucune citation pour l'instant."}
              </div>
              {isOwnProfile && (
                <button
                  onClick={() => navigate("/citations")}
                  className="mt-3 px-4 py-2 rounded-[20px] text-[12px] font-medium font-body bg-transparent cursor-pointer transition-colors duration-150"
                  style={{ color: "var(--text-primary)", border: "1px solid var(--border-default)" }}
                >
                  Explorer les citations
                </button>
              )}
            </EmptyState>
          )}
        </div>
      )}

      {/* Listes */}
      {tab === "mes listes" && (
        <div className="py-3">
          {isOwnProfile && (
            <button
              onClick={() => setShowCreateList(true)}
              className="w-full py-3 mb-4 border-[1.5px] border-dashed border-[var(--border-default)] rounded-lg text-[13px] font-body bg-transparent cursor-pointer hover:opacity-80 transition-colors duration-150"
              style={{ color: "var(--text-tertiary)" }}
            >
              + Nouvelle liste
            </button>
          )}
          {myLists.length === 0 && (
            <EmptyState>
              <div className="text-sm font-body" style={{ color: "var(--text-tertiary)" }}>
                {isOwnProfile ? "Tu n'as pas encore créé de liste." : "Aucune liste publique pour l'instant."}
              </div>
              {isOwnProfile && (
                <button onClick={() => setShowCreateList(true)} className="mt-4 px-5 py-2.5 rounded-[20px] text-[13px] font-medium font-body border-none cursor-pointer hover:opacity-80 transition-colors duration-150" style={{ backgroundColor: "var(--text-primary)", color: "var(--bg-primary)" }}>+ Nouvelle liste</button>
              )}
            </EmptyState>
          )}
          {myLists.length > 0 && myLists.map(l => {
            const items = (l.list_items || []).sort((a, b) => a.position - b.position);
            const covers = items.slice(0, 4).map(i => i.books).filter(Boolean);
            const totalItems = items.length;
            return (
              <div
                key={l.id}
                role="button"
                tabIndex={0}
                onClick={() => navigate(`/${profile?.username}/listes/${l.slug || l.id}`)}
                onKeyDown={e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); navigate(`/${profile?.username}/listes/${l.slug || l.id}`); } }}
                className="py-5 border-b border-border-light cursor-pointer hover:bg-surface transition-colors duration-100"
              >
                {covers.length > 0 && (
                  <div className="flex gap-2 mb-3.5 p-3 px-3.5 bg-surface rounded-lg overflow-x-auto">
                    {covers.map(b => {
                      const bookObj = { id: b.id, t: b.title, c: b.cover_url, slug: b.slug, _supabase: b };
                      return <Img key={b.id} book={bookObj} w={60} h={90} />;
                    })}
                    {totalItems > 4 && (
                      <div className="w-[60px] h-[90px] rounded-[3px] bg-avatar-bg flex items-center justify-center text-[11px] shrink-0 font-body" style={{ color: "var(--text-tertiary)" }}>
                        +{totalItems - 4}
                      </div>
                    )}
                  </div>
                )}
                <div className="text-[15px] font-medium font-body">{l.title}</div>
                <div className="text-xs mt-1 font-body flex items-center gap-1.5" style={{ color: "var(--text-tertiary)" }}>
                  <span>{totalItems} livre{totalItems !== 1 ? "s" : ""}</span>
                  <span>·</span>
                  <span>{l.is_public ? "Publique" : "Privée"}</span>
                  <span>·</span>
                  <LikeButton
                    count={l.likes_count || 0}
                    liked={listLikedSet.has(l.id)}
                    initialLiked={listInitialSet.has(l.id)}
                    onToggle={() => toggleListLike(l.id, () => showToast("Une erreur est survenue"))}
                    className="text-xs"
                  />
                </div>
              </div>
            );
          })}
          <CreateListModal
            open={showCreateList}
            onClose={() => setShowCreateList(false)}
            onCreate={handleCreateList}
          />
        </div>
      )}

      {/* Bilan */}
      {tab === "bilan" && (() => {
        const yr = new Date().getFullYear();
        const s = profileData.stats || {};
        const chrono = profileData.chronology || Array(12).fill(0);
        const top = profileData.topRated || [];
        return (
        <div className="py-5">
          {s.thisYear >= 5 ? (
            <>
              <div className="text-center mb-7">
                <Label>Bilan de l'année</Label>
                <div className="text-[40px] font-bold tracking-tight font-body">{yr}</div>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-px rounded-lg overflow-hidden mb-7" style={{ backgroundColor: "var(--border-default)" }}>
                {[
                  { l: "Livres lus", v: String(s.thisYear) },
                  { l: "Pages tournées", v: s.pagesThisYear?.toLocaleString("fr-FR") || "0" },
                  { l: "Note moyenne", v: s.avgRating > 0 ? `${s.avgRating} ★` : "—" },
                  { l: "Critiques", v: String(s.reviewsCount || 0) },
                  { l: "Citations", v: "0" },
                  { l: "Listes", v: "0" },
                ].map((st, i) => (
                  <div key={i} className="p-5 text-center" style={{ backgroundColor: "var(--bg-elevated)" }}>
                    <div className="text-[22px] font-semibold font-body">{st.v}</div>
                    <div className="text-[10px] mt-[3px] uppercase tracking-[0.5px] font-body" style={{ color: "var(--text-tertiary)" }}>{st.l}</div>
                  </div>
                ))}
              </div>
              <Label>Chronologie de lecture</Label>
              {(() => {
                const max = Math.max(...chrono, 1);
                const barH = 100;
                return (
                  <div className="flex items-end gap-1.5 mt-2 mb-7" style={{ height: barH + 24 }}>
                    {chrono.map((v, i) => (
                      <div key={i} className="flex-1 flex flex-col items-center gap-1">
                        {v > 0 && <div className="text-[9px] font-body" style={{ color: "var(--text-tertiary)" }}>{v}</div>}
                        <div className={`w-full rounded-[3px] ${v ? "" : "bg-avatar-bg"}`} style={{ height: v ? (v / max) * barH : 4, ...(v ? { backgroundColor: "var(--text-primary)" } : {}) }} />
                        <span className="text-[9px] font-body" style={{ color: "var(--text-tertiary)" }}>{["J", "F", "M", "A", "M", "J", "J", "A", "S", "O", "N", "D"][i]}</span>
                      </div>
                    ))}
                  </div>
                );
              })()}
              {top.length > 0 && (
                <>
                  <Label>Les mieux notés</Label>
                  <div className="flex gap-2.5">
                    {top.map(b => (
                      <div key={b.id} className="text-center flex-1">
                        <Img book={b} w={999} h={999} onClick={() => go(b)} className="w-full h-auto aspect-[2/3]" />
                        <div className="text-[10px] font-medium mt-1.5 overflow-hidden text-ellipsis whitespace-nowrap font-body">{b.t}</div>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </>
          ) : (
            <EmptyState>
              <div className="font-display text-[18px] mb-5" style={{ color: "var(--text-primary)" }}>
                Encore {5 - (s.thisYear || 0)} livre{(5 - (s.thisYear || 0)) > 1 ? "s" : ""} pour débloquer ton bilan {yr}
              </div>
              <div className="flex justify-center mb-2">
                <div className="w-[200px] h-1.5 bg-avatar-bg rounded overflow-hidden">
                  <div className="h-full rounded transition-all duration-400" style={{ width: `${((s.thisYear || 0) / 5) * 100}%`, backgroundColor: "var(--text-primary)" }} />
                </div>
              </div>
              <div className="text-xs font-body mb-3" style={{ color: "var(--text-tertiary)" }}>{s.thisYear || 0}/5</div>
              <div className="text-xs font-body" style={{ color: "var(--text-tertiary)" }}>Seuls les livres marqués Lu avec une date en {yr} comptent.</div>
              {s.readNoDate > 0 && (
                <button
                  onClick={() => setTab("bibliothèque")}
                  className="mt-1.5 text-xs font-medium font-body bg-transparent border-none cursor-pointer underline underline-offset-2 hover:opacity-80 transition-colors duration-150"
                  style={{ color: "var(--text-primary)" }}
                >
                  Ajouter des dates à tes lectures →
                </button>
              )}
            </EmptyState>
          )}
        </div>
        );
      })()}

      {/* Badge selection modal */}
      {false && badgeModal && isOwnProfile && (
        <>
          <div onClick={() => setBadgeModal(null)} style={{ position: "fixed", inset: 0, zIndex: 9998, backgroundColor: "rgba(0,0,0,0.4)" }} />
          <div style={{ position: "fixed", inset: 0, zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center", padding: "0 20px" }}>
            <div
              onClick={e => e.stopPropagation()}
              style={{ position: "relative", backgroundColor: "var(--bg-primary)", border: "1px solid var(--border-subtle)", borderRadius: 16, padding: 24, boxShadow: "0 8px 40px rgba(0,0,0,0.16)", maxWidth: 380, width: "100%", maxHeight: "70vh", overflow: "hidden", display: "flex", flexDirection: "column" }}
            >
              <button
                onClick={() => setBadgeModal(null)}
                className="group"
                style={{ position: "absolute", top: 16, right: 16, width: 28, height: 28, borderRadius: "50%", border: "none", backgroundColor: "transparent", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", transition: "background-color 150ms, color 150ms" }}
                onMouseEnter={e => { e.currentTarget.style.backgroundColor = "var(--bg-surface)"; e.currentTarget.querySelector("span").style.color = "var(--text-primary)"; }}
                onMouseLeave={e => { e.currentTarget.style.backgroundColor = "transparent"; e.currentTarget.querySelector("span").style.color = "var(--text-muted)"; }}
                aria-label="Fermer"
              >
                <span style={{ fontSize: 18, color: "var(--text-muted)", lineHeight: 1, transition: "color 150ms" }}>×</span>
              </button>
              {badgeModal === "pick" ? (
                <>
                  <h2 className="font-display font-normal text-center" style={{ fontSize: 18, color: "var(--text-primary)", margin: "0 0 4px" }}>
                    Mes badges
                  </h2>
                  <p className="text-center text-[12px] font-body" style={{ color: "var(--text-tertiary)", margin: "0 0 20px" }}>
                    Clique sur un badge pour l'épingler ou le retirer
                  </p>
                  <div className="overflow-y-auto flex-1">
                    <div className="grid grid-cols-3 gap-4">
                      {badges.filter(b => !b.expired).map(b => {
                        const d = b.badge_definitions;
                        const color = (d?.tier && TIER_COLORS[d.tier]) || CATEGORY_COLORS[d?.category] || "var(--text-tertiary)";
                        const isPinned = pinnedBadges.some(p => p.badge_id === b.badge_id);
                        return (
                          <Tooltip
                            key={b.badge_id}
                            multiline
                            strategy="fixed"
                            text={
                              <>
                                <div style={{ fontWeight: 600, fontSize: 12, whiteSpace: "nowrap" }}>{d?.name}</div>
                                {d?.description && <div style={{ fontSize: 11, opacity: 0.7, marginTop: 2 }}>{d.description}</div>}
                              </>
                            }
                          >
                            <button
                              onClick={() => pinBadgeFromModal(b.badge_id)}
                              className="flex flex-col items-center gap-1.5 bg-transparent border-none cursor-pointer hover:opacity-70 transition-opacity duration-150 p-1"
                            >
                              <div style={isPinned ? { outline: `2px solid ${color}`, outlineOffset: 2, borderRadius: "50%" } : undefined}>
                                <BadgeIcon badgeId={d?.id} iconKey={d?.icon_key} category={d?.category} tier={d?.tier} size={44} />
                              </div>
                              <div className="text-[11px] font-body font-medium text-center leading-tight" style={{ color: "var(--text-secondary)", maxWidth: 72 }}>
                                {d?.name}
                                {isPinned && <span className="block text-[10px] font-normal" style={{ color }}>Épinglé ✓</span>}
                              </div>
                            </button>
                          </Tooltip>
                        );
                      })}
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <h2 className="font-display font-normal text-center" style={{ fontSize: 18, color: "var(--text-primary)", margin: "0 0 20px" }}>
                    Quel badge remplacer ?
                  </h2>
                  <div className="flex justify-center gap-6">
                    {pinnedBadges.map(b => {
                      const d = b.badge_definitions;
                      return (
                        <Tooltip
                          key={b.badge_id}
                          multiline
                          strategy="fixed"
                          text={
                            <>
                              <div style={{ fontWeight: 600, fontSize: 12, whiteSpace: "nowrap" }}>{d?.name}</div>
                              {d?.description && <div style={{ fontSize: 11, opacity: 0.7, marginTop: 2 }}>{d.description}</div>}
                            </>
                          }
                        >
                          <button
                            onClick={() => swapBadgeFromModal(b.badge_id)}
                            className="flex flex-col items-center gap-1.5 bg-transparent border-none cursor-pointer hover:opacity-70 transition-opacity duration-150 p-0"
                          >
                            <BadgeIcon badgeId={d?.id} iconKey={d?.icon_key} category={d?.category} tier={d?.tier} size={48} />
                            <span className="text-[11px] font-body font-medium text-center" style={{ color: "var(--text-secondary)", maxWidth: 72, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                              {d?.name}
                            </span>
                          </button>
                        </Tooltip>
                      );
                    })}
                  </div>
                </>
              )}
              <button
                onClick={() => setBadgeModal(null)}
                className="block w-full mt-5 text-[12px] font-body bg-transparent border-none cursor-pointer hover:opacity-70 transition-opacity duration-150"
                style={{ color: "var(--text-muted)" }}
              >
                Annuler
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
