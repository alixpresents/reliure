import { useState, useRef, useEffect } from "react";
import { supabase } from "../lib/supabase";
import { useAuth } from "../lib/AuthContext";
import InteractiveStars from "./InteractiveStars";

export default function ContentMenu({ type, item, onDelete, onEdit }) {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editBody, setEditBody] = useState("");
  const [editRating, setEditRating] = useState(0);
  const [editSpoiler, setEditSpoiler] = useState(false);
  const [saving, setSaving] = useState(false);
  const menuRef = useRef(null);

  const isOwner = user?.id && user.id === item.user_id;

  // Close on outside click
  useEffect(() => {
    if (!open && !editing) return;
    const handler = e => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setOpen(false);
        setConfirm(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open, editing]);

  if (!isOwner) return null;

  const handleDelete = async () => {
    const table = type === "review" ? "reviews" : "quotes";
    await supabase.from(table).delete().eq("id", item.id);
    await supabase.from("activity").delete().eq("target_id", item.id).eq("target_type", type);
    setOpen(false);
    setConfirm(false);
    onDelete?.(item.id);
  };

  const openEdit = () => {
    setEditBody((type === "quote" ? item.text : item.body) || "");
    if (type === "review") {
      setEditRating(item.rating || 0);
      setEditSpoiler(item.contains_spoilers || false);
    }
    setOpen(false);
    setEditing(true);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const table = type === "review" ? "reviews" : "quotes";
      const updates = { [type === "quote" ? "text" : "body"]: editBody.trim() };
      if (type === "review") {
        updates.rating = editRating || null;
        updates.contains_spoilers = editSpoiler;
      }
      await supabase.from(table).update(updates).eq("id", item.id);
      setEditing(false);
      onEdit?.({ ...item, ...updates });
    } finally {
      setSaving(false);
    }
  };

  // Edit modal
  if (editing) {
    return (
      <div className="mt-3 p-4 bg-surface rounded-lg border" style={{ borderColor: "var(--border-default)" }} ref={menuRef}>
        <textarea
          value={editBody}
          onChange={e => setEditBody(e.target.value)}
          className={`w-full min-h-[80px] p-3 border rounded-lg outline-none text-[15px] leading-[1.7] resize-y transition-[border] duration-150 ${type === "quote" ? "font-display" : "font-body"}`}
          style={{ backgroundColor: "var(--bg-elevated)", borderColor: "var(--border-default)", color: "var(--text-primary)" }}
        />
        {type === "review" && (
          <div className="flex items-center gap-3 mt-3">
            <InteractiveStars value={editRating} onChange={setEditRating} />
            <label className="flex items-center gap-1.5 text-[12px] font-body cursor-pointer select-none" style={{ color: "var(--text-tertiary)" }}>
              <input
                type="checkbox"
                checked={editSpoiler}
                onChange={e => setEditSpoiler(e.target.checked)}
                className="accent-[#1a1a1a]"
              />
              Contient des spoilers
            </label>
          </div>
        )}
        <div className="flex gap-2 mt-3">
          <button
            onClick={handleSave}
            disabled={saving || !editBody.trim()}
            className="px-4 py-2 text-[13px] font-medium font-body rounded-full border-none cursor-pointer hover:opacity-80 transition-colors duration-150 disabled:opacity-50 disabled:cursor-not-allowed"
            style={{ backgroundColor: "var(--text-primary)", color: "var(--bg-primary)" }}
          >
            {saving ? "Enregistrement..." : "Enregistrer"}
          </button>
          <button
            onClick={() => setEditing(false)}
            className="px-4 py-2 text-[13px] font-body bg-transparent border-none cursor-pointer hover:opacity-80 transition-colors duration-150"
            style={{ color: "var(--text-tertiary)" }}
          >
            Annuler
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="relative inline-block" ref={menuRef}>
      <button
        onClick={e => { e.stopPropagation(); setOpen(!open); setConfirm(false); }}
        className="text-[14px] font-body bg-transparent border-none cursor-pointer px-2 py-1 rounded hover:bg-tag-bg transition-colors duration-100 opacity-0 group-hover:opacity-100 sm:group-hover:opacity-100 max-sm:opacity-100"
        style={{ color: "var(--text-tertiary)" }}
        aria-label="Options"
      >
        ···
      </button>
      {open && (
        <div
          className="absolute right-0 top-full mt-1 border rounded-lg z-10 min-w-[140px] py-1"
          style={{ backgroundColor: "var(--bg-elevated)", borderColor: "var(--border-subtle)", boxShadow: "0 2px 8px rgba(0,0,0,0.08)" }}
        >
          {!confirm ? (
            <>
              <button
                onClick={openEdit}
                className="w-full text-left px-3 py-2 text-[13px] font-body bg-transparent border-none cursor-pointer hover:bg-surface transition-colors duration-100"
              >
                ✏️ Modifier
              </button>
              <button
                onClick={() => setConfirm(true)}
                className="w-full text-left px-3 py-2 text-[13px] font-body bg-transparent border-none cursor-pointer hover:bg-surface transition-colors duration-100"
                style={{ color: "var(--color-spoiler)" }}
              >
                🗑 Supprimer
              </button>
            </>
          ) : (
            <div className="px-3 py-2">
              <div className="text-[13px] font-body mb-2" style={{ color: "var(--text-body)" }}>Confirmer ?</div>
              <div className="flex gap-2">
                <button
                  onClick={handleDelete}
                  className="px-3 py-1.5 text-[12px] font-medium font-body rounded-full text-white border-none cursor-pointer hover:opacity-90 transition-colors duration-150"
                  style={{ backgroundColor: "var(--color-spoiler)" }}
                >
                  Oui
                </button>
                <button
                  onClick={() => { setConfirm(false); setOpen(false); }}
                  className="px-3 py-1.5 text-[12px] font-body bg-transparent border-none cursor-pointer hover:opacity-80 transition-colors duration-150"
                  style={{ color: "var(--text-tertiary)" }}
                >
                  Annuler
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
