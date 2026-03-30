import { useState, useRef, useEffect } from "react";

export default function InteractiveStars({ value = 0, onChange, size = "text-xl" }) {
  const [hv, setHv] = useState(0);
  const [pop, setPop] = useState(0);
  const popTimer = useRef(null);

  useEffect(() => () => clearTimeout(popTimer.current), []);

  const handleClick = n => {
    const next = n === value ? 0 : n;
    onChange(next);
    setHv(0);
    setPop(n);
    clearTimeout(popTimer.current);
    popTimer.current = setTimeout(() => setPop(0), 200);
  };

  return (
    <div className="flex gap-[3px]">
      {[1, 2, 3, 4, 5].map(n => (
        <span
          key={n}
          role="button"
          tabIndex={0}
          aria-label={`${n} étoile${n > 1 ? "s" : ""}`}
          onMouseEnter={() => setHv(n)}
          onMouseLeave={() => setHv(0)}
          onClick={() => handleClick(n)}
          onKeyDown={e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); handleClick(n); } }}
          className={`cursor-pointer ${size} transition-all duration-200 inline-block ${n <= (hv || 0) ? "scale-110" : "scale-100"} ${pop === n ? "scale-125" : ""}`}
          style={{ color: n <= (hv || value) ? "var(--color-star)" : "var(--star-empty)" }}
        >
          ★
        </span>
      ))}
    </div>
  );
}
