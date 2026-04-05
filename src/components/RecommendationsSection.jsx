import { useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import Img from "./Img";
import Skeleton from "./Skeleton";
import Toast from "./Toast";
import { useToast } from "../hooks/useToast";
import { useRecommendations } from "../hooks/useRecommendations";
import { supabase } from "../lib/supabase";

export default function RecommendationsSection({ userId }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { toast, showToast } = useToast();
  const [selectedBookId, setSelectedBookId] = useState(null);
  const [addingId, setAddingId] = useState(null);

  const {
    recommendations,
    notEnough,
    rateLimited,
    isLoading,
    isError,
    generateRecommendations,
    dismissRecommendation,
  } = useRecommendations(userId);

  const handleAddToRead = useCallback(async (bookId) => {
    if (addingId) return;
    setAddingId(bookId);
    try {
      // Check if a status row already exists
      const { data: existing } = await supabase
        .from("reading_status")
        .select("id, status")
        .eq("user_id", userId)
        .eq("book_id", bookId)
        .limit(1)
        .maybeSingle();

      if (existing) {
        await supabase
          .from("reading_status")
          .update({ status: "want_to_read" })
          .eq("id", existing.id);
      } else {
        await supabase
          .from("reading_status")
          .insert({ user_id: userId, book_id: bookId, status: "want_to_read" });
      }
      queryClient.invalidateQueries({ queryKey: ["recommendations", userId] });
      queryClient.invalidateQueries({ queryKey: ["profileData", userId] });
      dismissRecommendation(bookId);
      showToast("Ajouté à ta liste");
    } catch {
      showToast("Une erreur est survenue");
    } finally {
      setAddingId(null);
    }
  }, [userId, addingId, queryClient, dismissRecommendation, showToast]);

  const handleDismiss = useCallback((bookId) => {
    dismissRecommendation(bookId);
    if (selectedBookId === bookId) setSelectedBookId(null);
  }, [dismissRecommendation, selectedBookId]);

  const handleBookClick = useCallback((bookId) => {
    setSelectedBookId(prev => prev === bookId ? null : bookId);
  }, []);

  // State 0 — not enough books
  if (notEnough) return null;

  // State 4 — error: toast only, section hidden
  if (isError) return (
    <>{toast.visible && <Toast message={toast.message} />}</>
  );

  // State 1 — loading
  if (isLoading) {
    return (
      <div className="border-t border-border-light py-6">
        <div className="text-[10px] font-semibold uppercase font-body mb-3" style={{ letterSpacing: "2px", color: "var(--text-muted)" }}>
          Tu pourrais aimer
        </div>
        <div className="flex gap-3.5 overflow-hidden">
          {[1, 2, 3, 4, 5].map(i => (
            <div key={i} className="shrink-0">
              <Skeleton.Cover w={110} h={165} />
            </div>
          ))}
        </div>
      </div>
    );
  }

  // State 0 — recommendations resolved to empty (all dismissed or edge returned empty)
  if (recommendations.length === 0) return null;

  const selectedReco = recommendations.find(r => r.book_id === selectedBookId);

  return (
    <div className="border-t border-border-light py-6">
      {toast.visible && <Toast message={toast.message} />}

      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div
          className="text-[10px] font-semibold uppercase font-body"
          style={{ letterSpacing: "2px", color: "var(--text-muted)" }}
        >
          Tu pourrais aimer
        </div>
        <button
          onClick={generateRecommendations}
          disabled={rateLimited}
          title={rateLimited ? "Nouvelles suggestions demain" : "Rafraîchir les suggestions"}
          className="bg-transparent border-none cursor-pointer p-1 transition-colors duration-150 disabled:cursor-default"
          style={{ color: rateLimited ? "var(--text-tertiary)" : "var(--text-muted)" }}
          aria-label="Rafraîchir les suggestions"
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <polyline points="23 4 23 10 17 10" />
            <polyline points="1 20 1 14 7 14" />
            <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
          </svg>
        </button>
      </div>

      {/* Covers scroll */}
      <div
        className="flex gap-3.5"
        style={{ overflowX: "auto", scrollbarWidth: "none", paddingBottom: 4 }}
      >
        {recommendations.map(reco => {
          const book = {
            id: reco.book_id,
            t: reco.title,
            a: Array.isArray(reco.authors) ? reco.authors.join(", ") : (reco.authors || ""),
            c: reco.cover_url,
            slug: reco.slug,
          };
          const isSelected = selectedBookId === reco.book_id;
          return (
            <div key={reco.book_id} className="shrink-0">
              <div
                style={{
                  outline: isSelected ? "2px solid var(--text-primary)" : "none",
                  outlineOffset: 2,
                  borderRadius: 4,
                }}
              >
                <Img
                  book={book}
                  w={110}
                  h={165}
                  onClick={() => handleBookClick(reco.book_id)}
                />
              </div>
              <div
                className="mt-1.5 text-[12px] font-body leading-snug"
                style={{
                  color: "var(--text-primary)",
                  width: 110,
                  display: "-webkit-box",
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: "vertical",
                  overflow: "hidden",
                  cursor: "pointer",
                }}
                onClick={() => navigate(`/livre/${reco.slug}`)}
              >
                {reco.title}
              </div>
            </div>
          );
        })}
      </div>

      {/* Expanded reason */}
      {selectedReco && (
        <div
          className="mt-4"
          style={{
            borderLeft: "2px solid var(--border-default)",
            paddingLeft: 16,
          }}
        >
          <p
            className="font-display italic text-[14px] leading-relaxed m-0 mb-3"
            style={{ color: "var(--text-secondary)" }}
          >
            « {selectedReco.reason} »
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => handleAddToRead(selectedReco.book_id)}
              disabled={!!addingId}
              className="font-body border-none cursor-pointer disabled:opacity-50 transition-opacity duration-150"
              style={{
                fontSize: 11,
                fontWeight: 500,
                backgroundColor: "var(--text-primary)",
                color: "var(--bg-primary)",
                borderRadius: 16,
                padding: "4px 12px",
              }}
            >
              {addingId === selectedReco.book_id ? "..." : "＋ À lire"}
            </button>
            <button
              onClick={() => handleDismiss(selectedReco.book_id)}
              className="font-body bg-transparent cursor-pointer transition-colors duration-150"
              style={{
                fontSize: 11,
                fontWeight: 400,
                color: "var(--text-tertiary)",
                border: "1px solid var(--border-default)",
                borderRadius: 16,
                padding: "4px 12px",
              }}
            >
              Pas intéressé
            </button>
            <button
              onClick={() => navigate(`/livre/${selectedReco.slug}`)}
              className="font-body bg-transparent border-none cursor-pointer underline transition-opacity duration-150 hover:opacity-70"
              style={{ fontSize: 11, color: "var(--text-muted)", padding: 0 }}
            >
              Voir le livre
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
