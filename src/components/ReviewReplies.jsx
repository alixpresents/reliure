import { useState, useCallback, useRef, memo } from "react";
import { useAuth } from "../lib/AuthContext";
import { useProfile } from "../hooks/useProfile";
import { useReviewReplies } from "../hooks/useReviewReplies";
import { useLikes } from "../hooks/useLikes";
import { useCreatorIds } from "../hooks/useUserBadges";
import { formatRelativeTime } from "../lib/formatTime";
import Avatar from "./Avatar";
import UserName from "./UserName";
import LikeButton from "./LikeButton";
import { useNavigate } from "react-router-dom";

const ReplyItem = memo(function ReplyItem({ reply, liked, initialLiked, toggleLike, isOwner, onDelete, showToast, creatorIds }) {
  const [confirmDelete, setConfirmDelete] = useState(false);
  const navigate = useNavigate();
  const displayName = reply.display_name || reply.username || "?";
  const initials = displayName.split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2);

  const handleDelete = async () => {
    try {
      await onDelete(reply.id);
    } catch {
      showToast("Une erreur est survenue");
    }
    setConfirmDelete(false);
  };

  return (
    <div className="flex gap-2.5 pb-3">
      <div className={reply.username ? "cursor-pointer shrink-0" : "shrink-0"} onClick={() => reply.username && navigate(`/${reply.username}`)}>
        <Avatar i={initials} s={28} src={reply.avatar_url} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <UserName user={{ username: reply.username, display_name: reply.display_name }} className="text-[12px]" isCreator={creatorIds?.has(reply.user_id)} />
          <span className="text-[11px] font-body" style={{ color: "var(--text-tertiary)" }}>{formatRelativeTime(reply.created_at)}</span>
        </div>
        <p className="text-[13px] leading-[1.5] font-body m-0 mt-0.5" style={{ color: "var(--text-body)" }}>{reply.body}</p>
        <div className="flex items-center gap-3 mt-1 text-[11px] font-body">
          <LikeButton
            count={reply.likes_count || 0}
            liked={liked}
            initialLiked={initialLiked}
            onToggle={() => toggleLike(reply.id, () => showToast("Une erreur est survenue"))}
          />
          {isOwner && !confirmDelete && (
            <span
              role="button"
              tabIndex={0}
              onClick={() => setConfirmDelete(true)}
              onKeyDown={e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setConfirmDelete(true); } }}
              className="cursor-pointer transition-colors duration-150"
              style={{ color: "var(--text-tertiary)" }}
              onMouseEnter={e => { e.currentTarget.style.color = "var(--color-error)"; }}
              onMouseLeave={e => { e.currentTarget.style.color = "var(--text-tertiary)"; }}
            >
              Supprimer
            </span>
          )}
          {isOwner && confirmDelete && (
            <span className="font-body" style={{ color: "var(--text-tertiary)" }}>
              Supprimer ?{" "}
              <span role="button" tabIndex={0} onClick={handleDelete} onKeyDown={e => { if (e.key === "Enter") handleDelete(); }} className="cursor-pointer font-medium" style={{ color: "var(--color-error)" }}>Oui</span>
              {" / "}
              <span role="button" tabIndex={0} onClick={() => setConfirmDelete(false)} onKeyDown={e => { if (e.key === "Enter") setConfirmDelete(false); }} className="cursor-pointer">Annuler</span>
            </span>
          )}
        </div>
      </div>
    </div>
  );
});

export default function ReviewReplies({ reviewId, initialReplyCount = 0, showToast, onRequireLogin }) {
  const { user } = useAuth();
  const { profile } = useProfile();
  const creatorIds = useCreatorIds();
  const [expanded, setExpanded] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [body, setBody] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const textareaRef = useRef(null);

  // Always call hook — query only fires when reviewId truthy
  const { replies, isLoading, submitReply, deleteReply } = useReviewReplies(expanded ? reviewId : null);

  const replyIds = replies.map(r => r.id);
  const { likedSet, initialSet, toggle: toggleReplyLike } = useLikes(replyIds, "reply");

  const handleReply = useCallback(() => {
    if (!user) {
      onRequireLogin?.();
      return;
    }
    setShowForm(true);
    if (!expanded) setExpanded(true);
    setTimeout(() => textareaRef.current?.focus(), 50);
  }, [user, expanded, onRequireLogin]);

  const handleSubmit = useCallback(async () => {
    if (!body.trim() || submitting) return;
    setSubmitting(true);
    try {
      await submitReply(body);
      setBody("");
    } catch {
      showToast?.("Une erreur est survenue");
    }
    setSubmitting(false);
  }, [body, submitting, submitReply, showToast]);

  const handleKeyDown = useCallback((e) => {
    if (e.key === "Escape") {
      setBody("");
      setShowForm(false);
      return;
    }
    if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
      e.preventDefault();
      handleSubmit();
    }
  }, [handleSubmit]);

  const handleCancel = useCallback(() => {
    setBody("");
    setShowForm(false);
  }, []);

  // Derive displayed count: prefer live data if expanded, else initialReplyCount
  const displayCount = expanded ? replies.length : initialReplyCount;

  return (
    <div className="mt-1.5">
      {/* Reply + expand links */}
      <div className="flex items-center gap-3 text-[11px] font-body" style={{ color: "var(--text-tertiary)" }}>
        <span
          role="button"
          tabIndex={0}
          onClick={handleReply}
          onKeyDown={e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); handleReply(); } }}
          className="cursor-pointer hover:opacity-70 transition-opacity duration-150"
        >
          Répondre
        </span>
        {displayCount > 0 && (
          <span
            role="button"
            tabIndex={0}
            onClick={() => setExpanded(!expanded)}
            onKeyDown={e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setExpanded(!expanded); } }}
            className="cursor-pointer hover:opacity-70 transition-opacity duration-150"
          >
            {expanded
              ? "Masquer les réponses"
              : displayCount === 1
                ? "Voir la réponse"
                : `Voir les ${displayCount} réponses`}
          </span>
        )}
      </div>

      {/* Expanded replies */}
      {expanded && (
        <div className="mt-3 ml-0">
          {isLoading ? (
            <div className="text-[12px] font-body py-2" style={{ color: "var(--text-tertiary)" }}>Chargement...</div>
          ) : (
            replies.map(reply => (
              <ReplyItem
                key={reply.id}
                reply={reply}
                liked={likedSet.has(reply.id)}
                initialLiked={initialSet.has(reply.id)}
                toggleLike={toggleReplyLike}
                isOwner={user?.id === reply.user_id}
                onDelete={deleteReply}
                showToast={showToast}
                creatorIds={creatorIds}
              />
            ))
          )}
        </div>
      )}

      {/* Reply form */}
      {showForm && user && (
        <div className="flex gap-2.5 mt-2">
          <div className="shrink-0">
            <Avatar
              i={(profile?.display_name || profile?.username || "?").split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2)}
              s={28}
              src={profile?.avatar_url}
            />
          </div>
          <div className="flex-1">
            <textarea
              ref={textareaRef}
              value={body}
              onChange={e => setBody(e.target.value.slice(0, 2000))}
              onKeyDown={handleKeyDown}
              placeholder="Écrire une réponse..."
              maxLength={2000}
              className="w-full text-[13px] font-body leading-[1.5] bg-transparent resize-vertical outline-none transition-colors duration-150"
              style={{
                color: "var(--text-body)",
                border: "1px solid var(--border-default)",
                borderRadius: 8,
                padding: "10px 12px",
                minHeight: 40,
                maxHeight: 120,
              }}
              onFocus={e => { e.target.style.borderColor = "var(--text-tertiary)"; }}
              onBlur={e => { e.target.style.borderColor = "var(--border-default)"; }}
            />
            {body.trim() && (
              <div className="flex items-center justify-between mt-1.5">
                <div className="text-[11px] font-body" style={{ color: "var(--text-tertiary)" }}>
                  {body.length > 1500 && `${body.length}/2000`}
                </div>
                <div className="flex items-center gap-2">
                  <span
                    role="button"
                    tabIndex={0}
                    onClick={handleCancel}
                    onKeyDown={e => { if (e.key === "Enter") handleCancel(); }}
                    className="text-[11px] font-body cursor-pointer"
                    style={{ color: "var(--text-tertiary)" }}
                  >
                    Annuler
                  </span>
                  <button
                    onClick={handleSubmit}
                    disabled={!body.trim() || submitting}
                    className="text-[11px] font-medium font-body border-none cursor-pointer transition-opacity duration-150 hover:opacity-80 disabled:opacity-40 disabled:cursor-default"
                    style={{
                      backgroundColor: "var(--text-primary)",
                      color: "var(--bg-primary)",
                      padding: "5px 14px",
                      borderRadius: 14,
                    }}
                  >
                    {submitting ? "..." : "Publier"}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
