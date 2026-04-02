import { Link } from "react-router-dom";
import Img from "../components/Img";
import Label from "../components/Label";
import HScroll from "../components/HScroll";
import LikeButton from "../components/LikeButton";
import CuratedSelectionCard from "../components/CuratedSelectionCard";
import { useCuratedSelections } from "../hooks/useCuratedSelections";
import { useLikes } from "../hooks/useLikes";
import { useAuth } from "../lib/AuthContext";

const dateFmt = new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "long", year: "numeric" });

export default function SelectionPage({ selection }) {
  const s = selection;
  const items = s.items || [];
  const { user } = useAuth();
  const { data: selectionsAll } = useCuratedSelections();
  const others = (selectionsAll || []).filter(o => o.id !== s.id);

  const listIds = s.id ? [s.id] : [];
  const { likedSet: likedLists, initialSet: initLikedLists, toggle: toggleListLike } = useLikes(listIds, "list");

  const authorsStr = (authors) => {
    if (!authors) return "";
    return Array.isArray(authors) ? authors.join(", ") : authors;
  };

  return (
    <div className="sk-fade pb-16">
      {/* Breadcrumb */}
      <div className="py-6">
        <Link
          to="/selections"
          className="text-[13px] font-body no-underline hover:opacity-70 transition-opacity duration-150"
          style={{ color: "var(--text-tertiary)" }}
        >
          ← Sélections
        </Link>
      </div>

      {/* Header éditorial */}
      <Label>Sélections</Label>
      <div className="mt-3 mb-1">
        <span className="text-[15px] font-body" style={{ color: "var(--text-secondary)" }}>La Bibliothèque de</span>
      </div>
      <h1 className="font-display text-[32px] font-normal leading-tight mb-1" style={{ color: "var(--text-primary)" }}>
        {s.curator_name}
      </h1>
      {s.curator_role && (
        <p className="text-[14px] font-body m-0" style={{ color: "var(--text-tertiary)" }}>
          {s.curator_role}
        </p>
      )}

      {/* Portrait */}
      {s.curator_avatar_url && (
        <div className="my-5">
          <img
            src={s.curator_avatar_url}
            alt={s.curator_name}
            style={{
              width: "100%",
              maxHeight: 280,
              objectFit: "cover",
              borderRadius: 6,
              backgroundColor: "var(--cover-fallback)",
              display: "block",
            }}
          />
        </div>
      )}

      {/* Pull quote */}
      {s.curator_pull_quote && (
        <p
          className="text-center"
          style={{ fontSize: 20, lineHeight: 1.6, color: "var(--text-primary)", padding: "8px 0 24px", fontFamily: "var(--font-body)" }}
        >
          <span style={{ fontFamily: "var(--font-display)" }}>«</span>
          {" "}{s.curator_pull_quote}{" "}
          <span style={{ fontFamily: "var(--font-display)" }}>»</span>
        </p>
      )}

      {/* Intro */}
      {s.description && (
        <div
          className="font-body"
          style={{ fontSize: 15, lineHeight: 1.8, color: "var(--text-secondary)", paddingBottom: 32 }}
        >
          {s.description.split("\n").map((line, i) => (
            <span key={i}>
              {line}
              {i < s.description.split("\n").length - 1 && <br />}
            </span>
          ))}
        </div>
      )}

      {/* Séparateur */}
      <div style={{ borderTop: "1px solid var(--border-subtle)", marginBottom: 32 }} />

      {/* Items */}
      {items.map((item, idx) => {
        const bookObj = { c: item.cover_url, t: item.title };
        const bookUrl = `/livre/${item.slug || item.book_id}`;
        const authors = authorsStr(item.authors);
        const meta = [
          item.publication_date ? new Date(item.publication_date).getFullYear() : null,
          item.page_count ? `${item.page_count} pages` : null,
        ].filter(Boolean).join(" · ");

        return (
          <div
            key={item.book_id}
            style={{
              padding: "28px 0",
              borderBottom: idx < items.length - 1 ? "1px solid var(--border-subtle)" : "none",
            }}
          >
            {/* Numéro */}
            <div
              className="font-body"
              style={{ fontSize: 12, fontWeight: 600, color: "var(--text-muted)", marginBottom: 12 }}
            >
              {String(idx + 1).padStart(2, "0")}
            </div>

            {/* Cover + infos */}
            <div className="flex gap-5">
              <Link to={bookUrl} className="shrink-0">
                <Img book={bookObj} w={90} h={135} />
              </Link>
              <div className="flex-1 min-w-0">
                <Link to={bookUrl} className="no-underline">
                  <div className="font-display text-[18px] font-normal leading-snug mb-1" style={{ color: "var(--text-primary)" }}>
                    {item.title}
                  </div>
                </Link>
                {authors && (
                  <div className="text-[13px] font-body mb-1" style={{ color: "var(--text-tertiary)" }}>
                    {authors}
                  </div>
                )}
                {meta && (
                  <div className="text-[12px] font-body" style={{ color: "var(--text-muted)" }}>
                    {meta}
                  </div>
                )}
              </div>
            </div>

            {/* Note (citation de l'invité) */}
            {item.note && (
              <div
                style={{
                  fontSize: 15,
                  lineHeight: 1.75,
                  color: "var(--text-primary)",
                  borderLeft: "2px solid var(--border-default)",
                  paddingLeft: 16,
                  marginTop: 14,
                  fontFamily: "var(--font-body)",
                }}
              >
                <span style={{ fontFamily: "var(--font-display)" }}>«</span>
                {" "}{item.note}{" "}
                <span style={{ fontFamily: "var(--font-display)" }}>»</span>
              </div>
            )}
          </div>
        );
      })}

      {/* Pied de page */}
      <div style={{ borderTop: "1px solid var(--border-subtle)", padding: "24px 0" }}>
        <div className="flex items-center justify-between">
          <div>
            <div className="text-[13px] font-body italic" style={{ color: "var(--text-tertiary)" }}>
              Propos recueillis par Reliure
            </div>
            {s.published_at && (
              <div className="text-[13px] font-body mt-1" style={{ color: "var(--text-muted)" }}>
                Publié le {dateFmt.format(new Date(s.published_at))}
              </div>
            )}
          </div>
          {user && (
            <LikeButton
              count={s.likes_count || 0}
              liked={likedLists.has(s.id)}
              initialLiked={initLikedLists.has(s.id)}
              onToggle={() => toggleListLike(s.id)}
            />
          )}
        </div>
      </div>

      {/* Autres sélections */}
      {others.length > 0 && (
        <div style={{ borderTop: "1px solid var(--border-subtle)", paddingTop: 28 }}>
          <Label>Autres sélections</Label>
          <div className="mt-4">
            <HScroll>
              {others.map(o => (
                <CuratedSelectionCard key={o.id} selection={o} variant="compact" />
              ))}
            </HScroll>
          </div>
        </div>
      )}
    </div>
  );
}
