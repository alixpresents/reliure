import { useState } from "react";

export default function Pill({ children, active, onClick }) {
  const [popping, setPopping] = useState(false);

  const handleClick = () => {
    if (!active) {
      setPopping(true);
    }
    onClick?.();
  };

  return (
    <button
      onClick={handleClick}
      onAnimationEnd={() => setPopping(false)}
      className={`px-4 py-[7px] min-h-[44px] sm:min-h-0 rounded-[20px] text-xs cursor-pointer font-medium font-body transition-all duration-200 active:scale-95 ${
        active
          ? "border"
          : "bg-transparent border-[1.5px]"
      } ${popping ? "animate-confirm-pop" : ""}`}
      style={active
        ? { backgroundColor: "var(--text-primary)", color: "var(--bg-primary)", borderColor: "var(--text-primary)" }
        : { color: "var(--text-secondary)", borderColor: "var(--border-default)" }
      }
    >
      {children}
    </button>
  );
}
