import { useState, useRef, useEffect, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useListBySlug, deleteList } from "../hooks/useLists";
import { useLikes } from "../hooks/useLikes";
import { useAuth } from "../lib/AuthContext";
import { useNav } from "../lib/NavigationContext";
import { supabase } from "../lib/supabase";
import Img from "../components/Img";
import LikeButton from "../components/LikeButton";

const SORT_OPTIONS = [
  { key: "manual", label: "Ordre manuel" },
  { key: "rating", label: "Par note" },
  { key: "date", label: "Par date de lecture" },
  { key: "author", label: "Par auteur" },
  { key: "title", label: "Par titre" },
];

export default function ListPage() {
  const { slug } = useParams();
  const { list, loading, addBook, removeBook, reorderItems, updateList, updateItemNote } = useListBySlug(slug);
  const { user } = useAuth();
  const { goToBook, openSearchFor } = useNav();
  const navigate = useNavigate();
  const [editing, setEditing] = useState(false);
  const [editingTitle, setEditingTitle] = useState(false);
  const [editingDesc, setEditingDesc] = useState(false);
  const [titleDraft, setTitleDraft] = useState("");
  const [descDraft, setDescDraft] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [editingNote, setEditingNote] = useState(null);
  const [noteDraft, setNoteDraft] = useState("");
  const [sortBy, setSortBy] = useState("manual");
  const [readingDates, setReadingDates] = useState({});
  const noteRef = useRef(null);

  // Drag state
  const [dragIdx, setDragIdx] = useState(null);
  const [dragOverIdx, setDragOverIdx] = useState(null);

  // Likes
  const listIds = list ? [list.id] : [];
  const { likedSet, initialSet, toggle: toggleLike } = useLikes(listIds, "list");

  // Fetch reading dates for the list owner's books (for "Par date" sort)
  useEffect(() => {
    if (!list || !list.user_id || !list.list_items?.length) return;
    const bookIds = list.list_items.map(i => i.book_id).filter(Boolean);
    if (!bookIds.length) return;
    supabase
      .from("reading_status")
      .select("book_id, finished_at")
      .eq("user_id", list.user_id)
      .in("book_id", bookIds)
      .not("finished_at", "is", null)
      .order("finished_at", { ascending: false })
      .then(({ data }) => {
        if (!data) return;
        // Keep most recent finished_at per book
        const map = {};
        for (const row of data) {
          if (!map[row.book_id]) map[row.book_id] = row.finished_at;
        }
        setReadingDates(map);
      });
  }, [list?.id, list?.user_id, list?.list_items?.length]);

  const rawItems = useMemo(
    () => [...(list?.list_items || [])].sort((a, b) => a.position - b.position),
    [list?.list_items]
  );

  const sortedItems = useMemo(() => {
    if (sortBy === "manual") return rawItems;
    return [...rawItems].sort((a, b) => {
      const ba = a.books, bb = b.books;
      if (!ba || !bb) return 0;
      if (sortBy === "rating") return (bb.avg_rating || 0) - (ba.avg_rating || 0);
      if (sortBy === "date") {
        const da = readingDates[a.book_id] || "";
        const db = readingDates[b.book_id] || "";
        return db.localeCompare(da);
      }
      if (sortBy === "author") {
        const aa = Array.isArray(ba.authors) ? ba.authors[0] || "" : "";
        const ab = Array.isArray(bb.authors) ? bb.authors[0] || "" : "";
        return aa.localeCompare(ab, "fr");
      }
      if (sortBy === "title") return ba.title.localeCompare(bb.title, "fr");
      return 0;
    });
  }, [rawItems, sortBy, readingDates]);

  if (loading) return <div className="py-8 text-center text-[13px] font-body" style={{ color: "var(--text-tertiary)" }}>Chargement...</div>;
  if (!list) return <div className="py-8 text-center text-[13px] font-body" style={{ color: "var(--text-tertiary)" }}>Liste introuvable.</div>;

  const isOwner = user?.id === list.user_id;
  const items = sortedItems;

  const username = list.users?.username || "";

  // Book IDs already in the list — for multi-add checkmarks
  const bookIdsInList = new Set(rawItems.map(i => i.book_id));

  const handleAddBook = () => {
    openSearchFor(async (book) => {
      const bookId = book._supabase?.id || book.id;
      if (bookIdsInList.has(bookId)) return;
      await addBook(bookId);
      bookIdsInList.add(bookId);
      return { keepOpen: true };
    });
  };

  const handleDelete = async () => {
    await deleteList(list.id);
    navigate(-1);
  };

  const commitTitle = () => {
    setEditingTitle(false);
    const t = titleDraft.trim();
    if (t && t !== list.title) updateList({ title: t });
  };

  const commitDesc = () => {
    setEditingDesc(false);
    const d = descDraft.trim();
    if (d !== (list.description || "")) updateList({ description: d || null });
  };

  const commitNote = (itemId) => {
    setEditingNote(null);
    updateItemNote(itemId, noteDraft.trim() || null);
  };

  const normalizeBook = (b) => ({
    id: b.id,
    t: b.title,
    a: Array.isArray(b.authors) ? b.authors.join(", ") : "",
    c: b.cover_url,
    slug: b.slug,
    _supabase: b,
  });

  return (
    <div className="py-6">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1">
            {editingTitle ? (
              <input
                autoFocus
                value={titleDraft}
                onChange={e => setTitleDraft(e.target.value)}
                onBlur={commitTitle}
                onKeyDown={e => { if (e.key === "Enter") commitTitle(); if (e.key === "Escape") setEditingTitle(false); }}
                className="text-[22px] font-normal font-display w-full bg-transparent border-none outline-none border-b pb-1"
                style={{ borderColor: "var(--border-default)" }}
              />
            ) : (
              <h1
                className={`text-[22px] font-normal font-display m-0 ${isOwner ? "cursor-text" : ""}`}
                onClick={isOwner ? () => { setTitleDraft(list.title); setEditingTitle(true); } : undefined}
              >
                {list.title}
              </h1>
            )}

            {editingDesc ? (
              <textarea
                autoFocus
                value={descDraft}
                onChange={e => setDescDraft(e.target.value)}
                onBlur={commitDesc}
                onKeyDown={e => { if (e.key === "Escape") setEditingDesc(false); }}
                rows={2}
                className="w-full text-[13px] font-body bg-transparent border-none outline-none border-b mt-2 resize-none"
                style={{ color: "var(--text-secondary)", borderColor: "var(--border-default)" }}
              />
            ) : (
              <div
                className={`text-[13px] font-body mt-1.5 ${isOwner ? "cursor-text" : ""}`}
                style={{ color: "var(--text-secondary)" }}
                onClick={isOwner ? () => { setDescDraft(list.description || ""); setEditingDesc(true); } : undefined}
              >
                {list.description || (isOwner ? <span style={{ color: "var(--text-tertiary)" }}>Ajouter une description...</span> : null)}
              </div>
            )}
          </div>

          {isOwner && (
            <div className="flex items-center gap-2 shrink-0 mt-1">
              <button
                onClick={() => setEditing(!editing)}
                className={`text-[12px] font-body bg-transparent border-none cursor-pointer transition-colors duration-150 ${editing ? "font-medium hover:opacity-80" : "hover:opacity-80"}`}
                style={{ color: editing ? "var(--text-primary)" : "var(--text-tertiary)" }}
              >
                {editing ? "Terminé" : "Modifier"}
              </button>
            </div>
          )}
        </div>

        {/* Meta row */}
        <div className="flex items-center gap-2 mt-3 text-xs font-body" style={{ color: "var(--text-tertiary)" }}>
          <span
            className="hover:underline cursor-pointer"
            onClick={() => navigate(`/${username}`)}
          >
            @{username}
          </span>
          <span>·</span>
          <span>{rawItems.length} livre{rawItems.length !== 1 ? "s" : ""}</span>
          <span>·</span>
          <span>{list.is_public ? "Publique" : "Privée"}</span>
          <span>·</span>
          <LikeButton
            count={list.likes_count || 0}
            liked={likedSet.has(list.id)}
            initialLiked={initialSet.has(list.id)}
            onToggle={() => toggleLike(list.id)}
          />
          {isOwner && editing && (
            <>
              <span>·</span>
              <button
                onClick={() => updateList({ is_public: !list.is_public })}
                className="text-xs bg-transparent border-none cursor-pointer hover:opacity-80 font-body transition-colors duration-150"
                style={{ color: "var(--text-tertiary)" }}
              >
                Rendre {list.is_public ? "privée" : "publique"}
              </button>
            </>
          )}
        </div>
      </div>

      {/* Sort selector */}
      {rawItems.length > 1 && (
        <div className="flex items-center gap-1.5 flex-wrap mb-4">
          {SORT_OPTIONS.map(opt => (
            <button
              key={opt.key}
              onClick={() => setSortBy(opt.key)}
              className={`px-3 py-1 rounded-full text-[11px] font-body border transition-colors duration-150 ${
                sortBy === opt.key
                  ? "border-transparent"
                  : "bg-transparent hover:opacity-80"
              }`}
              style={sortBy === opt.key
                ? { backgroundColor: "var(--text-primary)", color: "var(--bg-primary)", borderColor: "var(--text-primary)" }
                : { color: "var(--text-tertiary)", borderColor: "var(--border-default)" }
              }
            >
              {opt.label}
            </button>
          ))}
        </div>
      )}

      {/* Add book button */}
      {isOwner && editing && (
        <button
          onClick={handleAddBook}
          className="w-full py-3 mb-4 border-[1.5px] border-dashed rounded-lg text-[13px] font-body bg-transparent cursor-pointer hover:opacity-80 transition-colors duration-150"
          style={{ borderColor: "var(--border-default)", color: "var(--text-tertiary)" }}
        >
          + Ajouter des livres
        </button>
      )}

      {/* Items */}
      <div>
        {items.map((item, idx) => {
          if (!item.books) return null;
          const book = normalizeBook(item.books);
          const isDragging = dragIdx === idx;
          const isOver = dragOverIdx === idx && dragIdx !== idx;
          const canDrag = editing && sortBy === "manual";

          return (
            <div
              key={item.id}
              className={`flex items-start gap-3.5 py-3 transition-colors duration-100 ${isOver ? "bg-surface" : ""}`}
              style={{
                borderBottom: "0.5px solid var(--border-subtle)",
                opacity: isDragging ? 0.5 : 1,
              }}
              draggable={canDrag}
              onDragStart={canDrag ? () => setDragIdx(idx) : undefined}
              onDragOver={canDrag ? e => { e.preventDefault(); setDragOverIdx(idx); } : undefined}
              onDrop={canDrag ? () => {
                if (dragIdx !== null && dragIdx !== idx) {
                  reorderItems(items[dragIdx].position, items[idx].position);
                }
                setDragIdx(null);
                setDragOverIdx(null);
              } : undefined}
              onDragEnd={() => { setDragIdx(null); setDragOverIdx(null); }}
            >
              {/* Position number for ranked lists */}
              {list.is_ranked && sortBy === "manual" && (
                <span className="text-[13px] font-body w-5 text-right shrink-0 mt-[14px]" style={{ color: "var(--text-tertiary)" }}>{idx + 1}</span>
              )}

              {/* Drag handle */}
              {canDrag && (
                <div className="cursor-grab active:cursor-grabbing shrink-0 transition-colors duration-150 mt-[14px]" style={{ color: "var(--text-tertiary)" }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                    <circle cx="9" cy="6" r="1.5" /><circle cx="15" cy="6" r="1.5" />
                    <circle cx="9" cy="12" r="1.5" /><circle cx="15" cy="12" r="1.5" />
                    <circle cx="9" cy="18" r="1.5" /><circle cx="15" cy="18" r="1.5" />
                  </svg>
                </div>
              )}

              <Img book={book} w={44} h={66} onClick={editing ? undefined : () => goToBook(book)} className="shrink-0" />

              <div className="flex-1 min-w-0">
                <div
                  className={`text-sm font-medium font-body truncate ${editing ? "" : "cursor-pointer hover:underline"}`}
                  onClick={editing ? undefined : () => goToBook(book)}
                >
                  {book.t}
                </div>
                <div className="text-[11px] font-body truncate" style={{ color: "var(--text-tertiary)" }}>{book.a}</div>

                {/* Item note */}
                {editingNote === item.id ? (
                  <div className="mt-1.5">
                    <textarea
                      ref={noteRef}
                      autoFocus
                      value={noteDraft}
                      onChange={e => setNoteDraft(e.target.value)}
                      onBlur={() => commitNote(item.id)}
                      onKeyDown={e => {
                        if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); commitNote(item.id); }
                        if (e.key === "Escape") setEditingNote(null);
                      }}
                      placeholder="Pourquoi ce livre est dans cette liste..."
                      maxLength={200}
                      rows={2}
                      className="text-[12px] font-body bg-transparent border-none outline-none border-b w-full resize-none leading-relaxed"
                      style={{ color: "var(--text-secondary)", borderColor: "var(--border-default)" }}
                    />
                    <div className="text-[10px] font-body text-right mt-0.5" style={{ color: "var(--text-tertiary)" }}>
                      {noteDraft.length}/200
                    </div>
                  </div>
                ) : item.note ? (
                  <div
                    className={`text-[12px] font-display mt-1 leading-relaxed ${isOwner && editing ? "cursor-text" : ""}`}
                    style={{ color: "var(--text-secondary)" }}
                    onClick={isOwner && editing ? () => { setEditingNote(item.id); setNoteDraft(item.note || ""); } : undefined}
                  >
                    {item.note}
                  </div>
                ) : isOwner && editing ? (
                  <div
                    className="text-[11px] font-body mt-0.5 cursor-text"
                    style={{ color: "var(--text-tertiary)" }}
                    onClick={() => { setEditingNote(item.id); setNoteDraft(""); }}
                  >
                    + note
                  </div>
                ) : null}
              </div>

              {/* Remove button */}
              {editing && (
                <button
                  onClick={() => removeBook(item.id)}
                  className="shrink-0 w-7 h-7 rounded-full flex items-center justify-center bg-transparent border-[1.5px] cursor-pointer transition-colors duration-150 mt-[6px]"
                  style={{ borderColor: "var(--border-default)", color: "var(--text-tertiary)" }}
                  aria-label="Retirer de la liste"
                >
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              )}
            </div>
          );
        })}
      </div>

      {rawItems.length === 0 && (
        <div className="py-10 text-center">
          <div className="text-sm font-body" style={{ color: "var(--text-tertiary)" }}>Cette liste est vide.</div>
          <div className="text-[13px] font-body mt-1" style={{ color: "var(--text-tertiary)" }}>Ajoute des livres pour commencer.</div>
          {isOwner && (
            <button
              onClick={handleAddBook}
              className="mt-4 px-5 py-2.5 rounded-[20px] text-[13px] font-medium font-body border-none cursor-pointer hover:opacity-80 transition-colors duration-150"
              style={{ backgroundColor: "var(--text-primary)", color: "var(--bg-primary)" }}
            >
              + Ajouter des livres
            </button>
          )}
        </div>
      )}

      {/* Delete */}
      {isOwner && editing && (
        <div className="mt-8 pt-6 border-t border-border-light">
          {confirmDelete ? (
            <div className="flex items-center gap-3">
              <span className="text-[13px] font-body" style={{ color: "var(--text-secondary)" }}>Supprimer cette liste ?</span>
              <button
                onClick={handleDelete}
                className="px-4 py-2 rounded-[16px] text-[12px] font-medium font-body bg-spoiler text-white border-none cursor-pointer hover:opacity-90 transition-opacity duration-150"
              >
                Supprimer
              </button>
              <button
                onClick={() => setConfirmDelete(false)}
                className="px-4 py-2 rounded-[16px] text-[12px] font-body bg-transparent border-[1.5px] cursor-pointer hover:opacity-80 transition-colors duration-150"
                style={{ color: "var(--text-secondary)", borderColor: "var(--border-default)" }}
              >
                Annuler
              </button>
            </div>
          ) : (
            <button
              onClick={() => setConfirmDelete(true)}
              className="text-[12px] font-body bg-transparent border-none cursor-pointer hover:text-spoiler transition-colors duration-150"
              style={{ color: "var(--text-tertiary)" }}
            >
              Supprimer la liste
            </button>
          )}
        </div>
      )}
    </div>
  );
}
