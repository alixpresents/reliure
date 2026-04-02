import { useState, useRef } from "react";

const SHARED_STYLES = {
  backgroundColor: "rgba(0,0,0,0.88)",
  color: "#fff",
  fontSize: 11,
  fontFamily: "var(--font-body)",
  lineHeight: 1.4,
  whiteSpace: "nowrap",
  pointerEvents: "none",
  zIndex: 99999,
  animation: "tooltipIn 120ms ease both",
};

// Arrow pointing downward (tooltip is above the trigger)
const ARROW_DOWN = {
  position: "absolute",
  top: "100%",
  left: "50%",
  transform: "translateX(-50%)",
  borderLeft: "5px solid transparent",
  borderRight: "5px solid transparent",
  borderTop: "5px solid rgba(0,0,0,0.88)",
};

export default function Tooltip({ text, children, multiline = false, strategy = "absolute" }) {
  const [show, setShow] = useState(false);
  const [fixedPos, setFixedPos] = useState(null);
  const triggerRef = useRef(null);

  if (!text) return children;

  const handleShow = () => {
    if (strategy === "fixed" && triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      setFixedPos({
        left: rect.left + rect.width / 2,
        bottom: window.innerHeight - rect.top + 8,
      });
    }
    setShow(true);
  };

  const handleHide = () => {
    setShow(false);
    setFixedPos(null);
  };

  const tooltipStyle =
    strategy === "fixed" && fixedPos
      ? {
          position: "fixed",
          left: fixedPos.left,
          bottom: fixedPos.bottom,
          transform: "translateX(-50%)",
          padding: multiline ? "8px 14px" : "4px 8px",
          borderRadius: multiline ? 8 : 6,
          ...SHARED_STYLES,
        }
      : {
          position: "absolute",
          bottom: "100%",
          left: "50%",
          transform: "translateX(-50%)",
          marginBottom: 8,
          padding: multiline ? "8px 14px" : "4px 8px",
          borderRadius: multiline ? 8 : 6,
          ...SHARED_STYLES,
        };

  return (
    <div
      ref={triggerRef}
      style={{ position: "relative", display: "inline-flex" }}
      onMouseEnter={handleShow}
      onMouseLeave={handleHide}
    >
      {children}
      {show && (
        <div role="tooltip" style={tooltipStyle}>
          {text}
          <div style={ARROW_DOWN} />
        </div>
      )}
    </div>
  );
}
