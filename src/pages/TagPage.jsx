export function meta({ params }) {
  const tag = decodeURIComponent(params.tag || "");
  return [
    { title: `${tag} — Reliure` },
    { name: "description", content: `Découvrez les meilleurs livres de ${tag} sélectionnés par la communauté Reliure.` },
    { property: "og:title", content: `${tag} — Reliure` },
    { property: "og:description", content: `Découvrez les meilleurs livres de ${tag} sélectionnés par la communauté Reliure.` },
    { property: "og:type", content: "website" },
    { property: "og:site_name", content: "Reliure" },
    { name: "twitter:card", content: "summary_large_image" },
    { tagName: "link", rel: "canonical", href: `${import.meta.env.VITE_SITE_URL || "https://www.reliure.page"}/explorer/theme/${params.tag}` },
  ];
}

import { useParams, useNavigate, Link } from "react-router-dom";
import Img from "../components/Img";
import Label from "../components/Label";
import { useNav } from "../lib/NavigationContext";
import { useBooksByGenre } from "../hooks/useExplore";

export default function TagPage() {
  const { tag } = useParams();
  const decodedTag = decodeURIComponent(tag || "");
  const navigate = useNavigate();
  const { goToBook: go } = useNav();
  const { books, loading } = useBooksByGenre(decodedTag);

  const sparse = !loading && books.length > 0 && books.length < 5;

  return (
    <div className="pt-6">
      <button onClick={() => navigate(-1)} className="bg-transparent border-none cursor-pointer text-[13px] pb-4 font-body" style={{ color: "var(--text-tertiary)" }}>
        ← Retour
      </button>
      <Label>Thème</Label>
      <div className="flex items-baseline gap-2 mb-1">
        <h2 className="text-[22px] font-normal font-display">{decodedTag}</h2>
        {!loading && books.length > 0 && (
          <span className="text-[13px] font-body" style={{ color: "var(--text-tertiary)" }}>{books.length} livre{books.length > 1 ? "s" : ""}</span>
        )}
      </div>
      {!loading && books.length > 0 && (
        <p className="text-[14px] font-body mb-4" style={{ color: "var(--text-tertiary)" }}>
          Les meilleurs livres de {decodedTag} sélectionnés par la communauté Reliure.
        </p>
      )}

      {loading ? (
        <div className="py-8 text-center text-[13px] font-body" style={{ color: "var(--text-tertiary)" }}>Chargement...</div>
      ) : books.length === 0 ? (
        <div className="py-12 text-center">
          <div className="text-[15px] font-body" style={{ color: "var(--text-tertiary)" }}>Aucun livre pour ce thème pour l'instant.</div>
          <div className="text-[13px] font-body mt-2 mb-6" style={{ color: "var(--text-tertiary)" }}>La communauté grandit — reviens bientôt.</div>
          <Link to="/" className="text-[13px] font-medium font-body no-underline border-b pb-px hover:opacity-60 transition-opacity duration-150" style={{ color: "var(--text-primary)", borderColor: "var(--text-primary)" }}>
            Explorer tous les livres →
          </Link>
        </div>
      ) : (
        <>
          {sparse && (
            <p className="text-[13px] font-body mt-1 mb-4 bg-surface rounded-lg px-4 py-3 border" style={{ color: "var(--text-tertiary)", borderColor: "var(--border-default)" }}>
              Seulement {books.length} livre{books.length > 1 ? "s" : ""} pour ce thème pour l'instant. La communauté grandit — reviens bientôt.
            </p>
          )}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {books.map(book => (
              <div key={book.id} className="text-center">
                <Img book={book} w={120} h={180} onClick={() => go(book)} className="w-full h-auto aspect-[2/3]" />
                <div className="text-xs font-medium mt-2 overflow-hidden text-ellipsis whitespace-nowrap font-body">{book.t}</div>
                <div className="text-[11px] mt-0.5 font-body" style={{ color: "var(--text-tertiary)" }}>{(book.a || "").split(" ").pop()}</div>
              </div>
            ))}
          </div>
          {sparse && (
            <div className="mt-8 text-center">
              <Link to="/" className="text-[13px] font-medium font-body no-underline border-b pb-px hover:opacity-60 transition-opacity duration-150" style={{ color: "var(--text-primary)", borderColor: "var(--text-primary)" }}>
                Explorer tous les livres →
              </Link>
            </div>
          )}
        </>
      )}
    </div>
  );
}
