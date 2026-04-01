import { useState, useRef, useEffect, memo } from "react";

/**
 * @param {number} count - likes_count from DB (stale, not updated optimistically)
 * @param {boolean} liked - whether current user has liked (from useLikes Set)
 * @param {boolean} initialLiked - whether user had liked at fetch time (from useLikes initial Set)
 * @param {function} onToggle - toggle callback
 */
// TODO: onToggle is often an inline arrow in callers — memo only helps if callers wrap it in useCallback
export default memo(function LikeButton({ count = 0, liked = false, initialLiked = false, onToggle, className = "" }) {
  const [pop, setPop] = useState(false);
  const popTimer = useRef(null);

  useEffect(() => () => clearTimeout(popTimer.current), []);

  // Compute optimistic count: adjust DB count based on local toggle vs initial state
  let displayCount = count;
  if (liked && !initialLiked) displayCount += 1;
  if (!liked && initialLiked) displayCount = Math.max(0, displayCount - 1);

  const toggle = () => {
    if (!onToggle) return;
    onToggle();
    setPop(true);
    clearTimeout(popTimer.current);
    popTimer.current = setTimeout(() => setPop(false), 200);
  };

  return (
    <span
      role="button"
      tabIndex={0}
      onClick={e => { e.stopPropagation(); toggle(); }}
      onKeyDown={e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); toggle(); } }}
      aria-label={liked ? "Retirer le like" : "Liker"}
      className={`cursor-pointer select-none inline-flex items-center gap-[3px] transition-colors duration-200 ${liked ? "text-spoiler" : ""} ${className}`}
      style={liked ? undefined : { color: "var(--text-tertiary)" }}
    >
      <span className={`inline-block transition-transform duration-200 ease-out ${pop ? "scale-[1.2]" : "scale-100"}`}>♥</span>
      {displayCount > 0 && <span>{displayCount}</span>}
    </span>
  );
});
