import { useState } from "react";
import { safeMutation } from "../lib/safeMutation";
import Toast from "./Toast";
import { useToast } from "../hooks/useToast";

export default function CreateListModal({ open, onClose, onCreate }) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [isPublic, setIsPublic] = useState(true);
  const [isRanked, setIsRanked] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const { toast, showToast } = useToast();

  if (!open) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    const t = title.trim();
    if (!t) return;
    setSubmitting(true);
    await safeMutation({
      mutate: () => onCreate({ title: t, description: description.trim() || null, isPublic, isRanked }),
      onSuccess: () => {
        setSubmitting(false);
        setTitle("");
        setDescription("");
        setIsPublic(true);
        setIsRanked(false);
        onClose();
      },
      onError: () => { setSubmitting(false); showToast("Une erreur est survenue"); },
      errorMessage: "create list error",
    });
  };

  return (
    <>
      {toast.visible && <Toast message={toast.message} />}
      <div
        onClick={onClose}
        className="fixed inset-0 bg-black/30 transition-opacity duration-150"
        style={{ zIndex: 9998 }}
      />
      <div
        className="fixed inset-0 flex items-center justify-center p-4"
        style={{ zIndex: 9999 }}
      >
        <div
          onClick={e => e.stopPropagation()}
          className="relative rounded-xl shadow-[0_8px_32px_rgba(0,0,0,0.12)] w-full max-w-[400px] p-6"
          style={{ backgroundColor: "var(--bg-elevated)" }}
        >
          <button
            type="button"
            onClick={onClose}
            className="absolute top-3 right-3 w-6 h-6 flex items-center justify-center bg-transparent border-none cursor-pointer rounded transition-colors duration-150 hover:opacity-80"
            style={{ color: "var(--text-tertiary)" }}
            aria-label="Fermer"
          >
            ×
          </button>
          <h2 className="text-[18px] font-normal font-display m-0 mb-5">Nouvelle liste</h2>

          <form onSubmit={handleSubmit}>
            <div className="mb-4">
              <label className="block text-[11px] font-semibold uppercase tracking-[1.5px] mb-1.5 font-body" style={{ color: "var(--text-tertiary)" }}>
                Titre
              </label>
              <input
                autoFocus
                value={title}
                onChange={e => setTitle(e.target.value)}
                placeholder="Romans latino-américains essentiels"
                className="w-full text-base bg-transparent rounded-lg px-3 py-2.5 outline-none font-body transition-colors duration-150"
                style={{ border: "1px solid var(--border-default)", color: "var(--text-primary)" }}
              />
            </div>

            <div className="mb-4">
              <label className="block text-[11px] font-semibold uppercase tracking-[1.5px] mb-1.5 font-body" style={{ color: "var(--text-tertiary)" }}>
                Description <span className="font-normal normal-case tracking-normal">(optionnelle)</span>
              </label>
              <textarea
                value={description}
                onChange={e => setDescription(e.target.value)}
                placeholder="Une sélection de..."
                rows={2}
                className="w-full text-[14px] bg-transparent rounded-lg px-3 py-2.5 outline-none font-body resize-none transition-colors duration-150"
                style={{ border: "1px solid var(--border-default)", color: "var(--text-primary)" }}
              />
            </div>

            <div className="flex items-center gap-5 mb-5">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isPublic}
                  onChange={e => setIsPublic(e.target.checked)}
                  className="accent-[#1a1a1a]"
                />
                <span className="text-[13px] font-body" style={{ color: "var(--text-secondary)" }}>Publique</span>
                <span className="relative group/tip inline-flex">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="var(--border-subtle)" strokeWidth="2" className="cursor-help">
                    <circle cx="12" cy="12" r="10" /><path d="M12 16v-4" /><path d="M12 8h.01" />
                  </svg>
                  <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2.5 py-1.5 rounded-md text-[11px] font-body whitespace-nowrap opacity-0 scale-95 group-hover/tip:opacity-100 group-hover/tip:scale-100 transition-all duration-150 pointer-events-none" style={{ backgroundColor: "var(--text-primary)", color: "var(--bg-primary)" }}>
                    Visible sur ton profil et dans l'Explorer. Les autres utilisateurs peuvent la liker.
                    <span className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent" style={{ borderTopColor: "var(--text-primary)" }} />
                  </span>
                </span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isRanked}
                  onChange={e => setIsRanked(e.target.checked)}
                  className="accent-[#1a1a1a]"
                />
                <span className="text-[13px] font-body" style={{ color: "var(--text-secondary)" }}>Classement</span>
                <span className="relative group/tip inline-flex">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="var(--border-subtle)" strokeWidth="2" className="cursor-help">
                    <circle cx="12" cy="12" r="10" /><path d="M12 16v-4" /><path d="M12 8h.01" />
                  </svg>
                  <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2.5 py-1.5 rounded-md text-[11px] font-body whitespace-nowrap opacity-0 scale-95 group-hover/tip:opacity-100 group-hover/tip:scale-100 transition-all duration-150 pointer-events-none" style={{ backgroundColor: "var(--text-primary)", color: "var(--bg-primary)" }}>
                    Les livres sont numérotés et ordonnés. Idéal pour un top ou un palmarès.
                    <span className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent" style={{ borderTopColor: "var(--text-primary)" }} />
                  </span>
                </span>
              </label>
            </div>

            <div className="flex gap-3 justify-end">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 rounded-[20px] text-[13px] font-medium font-body bg-transparent cursor-pointer hover:opacity-80 transition-colors duration-150"
                style={{ color: "var(--text-secondary)", border: "1.5px solid var(--border-default)" }}
              >
                Annuler
              </button>
              <button
                type="submit"
                disabled={!title.trim() || submitting}
                className="px-5 py-2.5 rounded-[20px] text-[13px] font-medium font-body border-none cursor-pointer hover:opacity-80 transition-colors duration-150 disabled:opacity-40 disabled:cursor-not-allowed"
                style={{ backgroundColor: "var(--text-primary)", color: "var(--bg-primary)" }}
              >
                {submitting ? "Création..." : "Créer"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </>
  );
}
