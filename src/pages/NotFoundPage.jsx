export function meta() {
  return [
    { title: "Page introuvable — Reliure" },
  ];
}

import { Link } from "react-router-dom";

export default function NotFoundPage() {
  return (
    <div className="py-20 text-center">
      <div className="text-[15px] font-body" style={{ color: "var(--text-tertiary)" }}>Page introuvable.</div>
      <Link to="/" className="text-[13px] font-medium font-body mt-3 inline-block hover:opacity-80 hover:underline transition-colors duration-150" style={{ color: "var(--text-secondary)" }}>
        Retour à l'accueil
      </Link>
    </div>
  );
}
