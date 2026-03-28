import { useState } from "react";

export default function LikeButton({ count, className = "" }) {
  const [liked, setLiked] = useState(false);
  const [pop, setPop] = useState(false);

  const toggle = () => {
    setLiked(l => !l);
    setPop(true);
    setTimeout(() => setPop(false), 200);
  };

  return (
    <span
      role="button"
      tabIndex={0}
      onClick={toggle}
      onKeyDown={e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); toggle(); } }}
      aria-label={liked ? "Retirer le like" : "Liker"}
      className={`cursor-pointer select-none inline-flex items-center gap-[3px] transition-colors duration-200 ${liked ? "text-spoiler" : ""} ${className}`}
    >
      <span className={`inline-block transition-transform duration-200 ${pop ? "scale-125" : "scale-100"}`}>♥</span>
      {count != null && <span>{liked ? count + 1 : count}</span>}
    </span>
  );
}
