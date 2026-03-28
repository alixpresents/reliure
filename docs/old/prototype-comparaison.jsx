import { useState } from "react";
import PrototypeA from "./prototype-A-cinematographique";
import PrototypeB from "./prototype-B-magazine";
import PrototypeC from "./prototype-C-minimal";

/*
 * Composant de comparaison — permet de naviguer entre les 3 prototypes
 * Usage : importer ce fichier dans App.jsx ou le rendre directement
 */

export default function PrototypeComparison() {
  const [active, setActive] = useState("A");

  const tabs = [
    { id: "A", label: "A — Cinématographique", desc: "Hero flou + cover flottante" },
    { id: "B", label: "B — Magazine éditorial", desc: "Split cover/contenu + serif dominant" },
    { id: "C", label: "C — Minimal centré", desc: "Cover centré + accordéons" },
  ];

  return (
    <div style={{ fontFamily: "'Geist', -apple-system, sans-serif" }}>
      {/* Selector bar */}
      <div style={{
        position: "fixed", bottom: 0, left: 0, right: 0, zIndex: 100,
        background: "rgba(26,26,26,0.95)", backdropFilter: "blur(12px)",
        padding: "12px 20px", display: "flex", gap: 8, justifyContent: "center",
        borderTop: "1px solid rgba(255,255,255,0.1)",
      }}>
        {tabs.map(t => (
          <button
            key={t.id}
            onClick={() => setActive(t.id)}
            style={{
              padding: "8px 20px", borderRadius: 8, cursor: "pointer",
              fontSize: 12, fontFamily: "'Geist', sans-serif", fontWeight: 500,
              border: active === t.id ? "none" : "1px solid rgba(255,255,255,0.2)",
              background: active === t.id ? "#D4883A" : "transparent",
              color: "#fff",
              transition: "all 0.15s",
            }}
            title={t.desc}
          >{t.label}</button>
        ))}
      </div>

      {/* Content */}
      <div style={{ paddingBottom: 60 }}>
        {active === "A" && <PrototypeA />}
        {active === "B" && <PrototypeB />}
        {active === "C" && <PrototypeC />}
      </div>
    </div>
  );
}
