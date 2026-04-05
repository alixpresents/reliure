import { useState, useCallback, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import Img from "./Img";
import Skeleton from "./Skeleton";
import Toast from "./Toast";
import { useToast } from "../hooks/useToast";
import { useRecommendations } from "../hooks/useRecommendations";
import { supabase } from "../lib/supabase";

// Spinner icon for refresh button
function SpinnerIcon() {
  return (
    <div
      style={{
        width: 14,
        height: 14,
        border: "2px solid var(--border-default)",
        borderTopColor: "var(--text-muted)",
        borderRadius: "50%",
        animation: "spin 0.7s linear infinite",
      }}
    />
  );
}

export default function RecommendationsSection({ userId }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { toast, showToast } = useToast();
  const [selectedBookId, setSelectedBookId] = useState(null);
  const [addingId, setAddingId] = useState(null);
  // bookIds currently in exit animation
  const [dismissingIds, setDismissingIds] = useState(new Set());
  // track whether user triggered a refresh (to show spinner)
  const [refreshPending, setRefreshPending] = useState(false);
  const prevFetchingRef = useRef(false);

  const {
    recommendations,
    notEnough,
    rateLimited,
    isLoading,
    isFetching,
    isError,
    generateRecommendations,
    dismissRecommendation,
  } = useRecommendations(userId);

  // Clear refreshPending once the fetch completes
  useEffect(() => {
    if (prevFetchingRef.current && !isFetching) {
      setRefreshPending(false);
    }
    prevFetchingRef.current = isFetching;
  }, [isFetching]);

  const handleRefresh = useCallback(() => {
    if (rateLimited || isFetching) return;
    setRefreshPending(true);
    generateRecommendations();
  }, [rateLimited, isFetching, generateRecommendations]);

  const handleAddToRead = useCallback(async (bookId) => {
    if (addingId) return;
    setAddingId(bookId);
    try {
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
      // animate out then dismiss
      setDismissingIds(prev => new Set([...prev, bookId]));
      setTimeout(() => {
        dismissRecommendation(bookId);
        setDismissingIds(prev => { const n = new Set(prev); n.delete(bookId); return n; });
        if (selectedBookId === bookId) setSelectedBookId(null);
      }, 200);
      showToast("Ajouté à ta liste");
    } catch {
      showToast("Une erreur est survenue");
    } finally {
      setAddingId(null);
    }
  }, [userId, addingId, queryClient, dismissRecommendation, selectedBookId, showToast]);

  const handleDismiss = useCallback((bookId) => {
    setDismissingIds(prev => new Set([...prev, bookId]));
    setTimeout(() => {
      dismissRecommendation(bookId);
      setDismissingIds(prev => { const n = new Set(prev); n.delete(bookId); return n; });
      if (selectedBookId === bookId) setSelectedBookId(null);
    }, 200);
  }, [dismissRecommendation, selectedBookId]);

  const handleBookClick = useCallback((bookId) => {
    setSelectedBookId(prev => prev === bookId ? null : bookId);
  }, []);

  // State 0 — not enough books
  if (notEnough) return null;

  // Error — toast only, section hidden
  if (isError) return <>{toast.visible && <Toast message={toast.message} />}</>;

  // Loading (initial fetch only — not refetch with existing data)
  if (isLoading) {
    return (
      <div className="border-t border-border-light py-6 sk-fade">
        <div
          className="text-[10px] font-semibold uppercase font-body mb-3"
          style={{ letterSpacing: "2px", color: "var(--text-muted)" }}
        >
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

  // All dismissed
  if (recommendations.length === 0) {
    return (
      <div className="border-t border-border-light py-6">
        {toast.visible && <Toast message={toast.message} />}
        <div
          className="text-center font-body"
          style={{ fontSize: 13, color: "var(--text-muted)", padding: "20px 0" }}
        >
          Tu as masqué toutes les suggestions.{" "}
          <button
            onClick={handleRefresh}
            disabled={rateLimited}
            className="bg-transparent border-none cursor-pointer underline disabled:cursor-default disabled:opacity-50 font-body"
            style={{ fontSize: 13, color: "var(--text-muted)", padding: 0 }}
          >
            Voir de nouvelles suggestions
          </button>
        </div>
      </div>
    );
  }

  const selectedReco = recommendations.find(r => r.book_id === selectedBookId);
  const showRefreshSpinner = refreshPending && isFetching;

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
          onClick={handleRefresh}
          disabled={rateLimited || isFetching}
          title={rateLimited ? "Nouvelles suggestions disponibles toutes les 24h" : "Rafraîchir les suggestions"}
          className="bg-transparent border-none cursor-pointer p-1 flex items-center gap-1.5 transition-colors duration-150 disabled:cursor-default"
          style={{
            color: rateLimited ? "var(--text-tertiary)" : "var(--text-muted)",
            opacity: rateLimited ? 0.5 : 1,
          }}
          aria-label={rateLimited ? "Nouvelles suggestions demain" : "Rafraîchir les suggestions"}
        >
          {showRefreshSpinner ? (
            <SpinnerIcon />
          ) : rateLimited ? (
            <span className="font-body" style={{ fontSize: 11 }}>↻ Demain</span>
          ) : (
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
          )}
        </button>
      </div>

      {/* Covers scroll */}
      <div
        className="flex gap-3.5"
        style={{
          overflowX: "auto",
          scrollbarWidth: "none",
          WebkitOverflowScrolling: "touch",
          paddingBottom: 4,
        }}
      >
        {recommendations.map(reco => {
          const coverW = "clamp(90px, 24vw, 110px)";
          const coverH = "clamp(135px, 36vw, 165px)";
          const isDismissing = dismissingIds.has(reco.book_id);
          const isSelected = selectedBookId === reco.book_id;
          const slug = reco.slug || reco.book_id;
          const book = {
            id: reco.book_id,
            t: reco.title,
            a: Array.isArray(reco.authors) ? reco.authors.join(", ") : (reco.authors || ""),
            c: reco.cover_url || null,
            slug,
          };

          return (
            <div
              key={reco.book_id}
              className="shrink-0"
              style={{
                transition: "opacity 200ms ease, transform 200ms ease",
                opacity: isDismissing ? 0 : 1,
                transform: isDismissing ? "scale(0.95)" : "scale(1)",
              }}
            >
              <div
                style={{
                  outline: isSelected ? "2px solid var(--text-primary)" : "none",
                  outlineOffset: 2,
                  borderRadius: 4,
                  width: coverW,
                  height: coverH,
                  overflow: "hidden",
                }}
              >
                <Img
                  book={book}
                  w={110}
                  h={165}
                  className="w-full"
                  onClick={() => handleBookClick(reco.book_id)}
                />
              </div>
              <div
                className="mt-1.5 font-body leading-snug cursor-pointer"
                style={{
                  fontSize: "clamp(11px, 2.8vw, 12px)",
                  color: "var(--text-primary)",
                  width: coverW,
                  display: "-webkit-box",
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: "vertical",
                  overflow: "hidden",
                }}
                onClick={() => navigate(`/livre/${slug}`)}
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
          key={selectedReco.book_id}
          className="mt-4"
          style={{
            borderLeft: "2px solid var(--border-default)",
            paddingLeft: 16,
            maxWidth: "100%",
            wordBreak: "break-word",
            animation: "recoReasonIn 200ms ease both",
          }}
        >
          <p
            className="font-display italic leading-relaxed m-0 mb-3"
            style={{ fontSize: 14, color: "var(--text-secondary)" }}
          >
            « {selectedReco.reason} »
          </p>
          <div className="flex items-center gap-2 flex-wrap">
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
              onClick={() => navigate(`/livre/${selectedReco.slug || selectedReco.book_id}`)}
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
