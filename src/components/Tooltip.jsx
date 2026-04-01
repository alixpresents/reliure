import { useState } from "react";

export default function Tooltip({ text, children }) {
  const [visible, setVisible] = useState(false);

  return (
    <span
      className="relative inline-block"
      onMouseEnter={() => setVisible(true)}
      onMouseLeave={() => setVisible(false)}
      onFocus={() => setVisible(true)}
      onBlur={() => setVisible(false)}
    >
      {children}
      {visible && (
        <span
          role="tooltip"
          style={{
            position: "absolute",
            bottom: "calc(100% + 6px)",
            left: "50%",
            transform: "translateX(-50%)",
            backgroundColor: "var(--text-primary)",
            color: "var(--bg-primary)",
            fontSize: 11,
            fontFamily: "var(--font-body)",
            whiteSpace: "nowrap",
            padding: "4px 8px",
            borderRadius: 6,
            pointerEvents: "none",
            zIndex: 100,
            animation: "tooltipIn 120ms ease both",
          }}
        >
          {text}
          <span
            style={{
              position: "absolute",
              top: "100%",
              left: "50%",
              transform: "translateX(-50%)",
              width: 0,
              height: 0,
              borderLeft: "4px solid transparent",
              borderRight: "4px solid transparent",
              borderTop: "4px solid var(--text-primary)",
            }}
          />
        </span>
      )}
    </span>
  );
}
