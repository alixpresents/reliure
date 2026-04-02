import { useNavigate } from "react-router-dom";
import Img from "./Img";
import Avatar from "./Avatar";
import Label from "./Label";

const dateFmt = new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "long" });

export default function CuratedSelectionCard({ selection, variant = "compact" }) {
  const navigate = useNavigate();
  const s = selection;
  const covers = (s.covers || []).slice(0, variant === "featured" ? 5 : 4);
  const initials = (s.curator_name || "?").split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2);
  const go = () => navigate(`/selections/${s.slug}`);

  if (variant === "featured") {
    const pullExcerpt = s.curator_pull_quote
      ? s.curator_pull_quote.length > 100
        ? `« ${s.curator_pull_quote.slice(0, 100)}… »`
        : `« ${s.curator_pull_quote} »`
      : null;

    return (
      <div
        role="button"
        tabIndex={0}
        onClick={go}
        onKeyDown={e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); go(); } }}
        className="cursor-pointer transition-all duration-150 hover:-translate-y-0.5"
        style={{
          padding: 24,
          backgroundColor: "var(--bg-surface)",
          border: "1px solid var(--border-subtle)",
          borderRadius: 12,
        }}
      >
        <Label>Sélection</Label>
        <div className="mt-3 mb-1">
          <span className="text-[14px] font-body" style={{ color: "var(--text-secondary)" }}>La Bibliothèque de</span>
        </div>
        <div className="font-display italic text-[20px] font-normal leading-tight mb-1" style={{ color: "var(--text-primary)" }}>
          {s.curator_name}
        </div>
        <div className="text-[13px] font-body mb-4" style={{ color: "var(--text-tertiary)" }}>
          {s.curator_role}
        </div>

        {pullExcerpt && (
          <p className="font-display italic text-[14px] leading-relaxed mb-4" style={{ color: "var(--text-secondary)" }}>
            {pullExcerpt}
          </p>
        )}

        {covers.length > 0 && (
          <div className="flex gap-1.5 mb-4">
            {covers.map((c, i) => (
              <Img key={i} book={{ c: c.cover_url, t: c.title }} w={56} h={84} />
            ))}
          </div>
        )}

        <div className="text-[12px] font-body" style={{ color: "var(--text-muted)" }}>
          {s.book_count} livre{s.book_count !== 1 ? "s" : ""}
          {s.published_at && (
            <> · Publié le {dateFmt.format(new Date(s.published_at))}</>
          )}
        </div>
      </div>
    );
  }

  // Compact variant
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={go}
      onKeyDown={e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); go(); } }}
      className="cursor-pointer transition-all duration-150 hover:-translate-y-0.5 shrink-0"
      style={{
        minWidth: 280,
        maxWidth: 320,
        padding: 20,
        backgroundColor: "var(--bg-surface)",
        border: "1px solid var(--border-subtle)",
        borderRadius: 12,
      }}
    >
      <div className="flex items-center gap-3 mb-4">
        {s.curator_avatar_url ? (
          <img
            src={s.curator_avatar_url}
            alt=""
            style={{ width: 56, height: 56, borderRadius: "50%", objectFit: "cover", flexShrink: 0 }}
          />
        ) : (
          <Avatar i={initials} s={56} />
        )}
        <div className="min-w-0">
          <div className="text-[12px] font-body mb-0.5" style={{ color: "var(--text-tertiary)" }}>La Bibliothèque de</div>
          <div className="font-display italic text-[16px] font-normal leading-tight truncate" style={{ color: "var(--text-primary)" }}>
            {s.curator_name}
          </div>
          <div className="text-[12px] font-body truncate" style={{ color: "var(--text-tertiary)" }}>
            {s.curator_role}
          </div>
          <div className="text-[12px] font-body" style={{ color: "var(--text-muted)" }}>
            {s.book_count} livre{s.book_count !== 1 ? "s" : ""}
          </div>
        </div>
      </div>

      {covers.length > 0 && (
        <div className="flex gap-1.5">
          {covers.map((c, i) => (
            <Img key={i} book={{ c: c.cover_url, t: c.title }} w={40} h={60} />
          ))}
        </div>
      )}
    </div>
  );
}
