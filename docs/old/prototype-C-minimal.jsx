import { useState } from "react";

/*
 * PROTOTYPE C — « Minimal & centré »
 * Inspiré par The StoryGraph / Apple Books
 * Tout centré, couverture héro en haut,
 * actions horizontales compactes,
 * sections en accordéon pour densité sans encombrement,
 * palette réduite, beaucoup d'air.
 */

const BOOK = {
  title: "2666",
  author: "Roberto Bolaño",
  year: 2004,
  pages: 898,
  rating: 4.5,
  ratingCount: 1247,
  cover: "https://images-na.ssl-images-amazon.com/images/S/compressed.photo.goodreads.com/books/1266413928i/63032.jpg",
  award: "National Book Critics Circle Award 2008",
  themes: ["maximalisme", "violence", "désert", "Mexique", "postmoderne"],
  description: "Cinq parties, cinq mondes reliés par un fil invisible. Des critiques littéraires européens obsédés par un auteur allemand disparu, une jeune femme à Santa Teresa, une ville ravagée par les féminicides, et la grande spirale de la violence du XXe siècle.",
};

const REVIEWS = [
  { user: "Margaux L.", initials: "ML", rating: 5, text: "Un chef-d'oeuvre absolu. Bolaño construit un labyrinthe dont on ne veut jamais sortir.", likes: 24 },
  { user: "Théo B.", initials: "TB", rating: 5, text: "Le livre qui a changé ma façon de lire. Chaque phrase est un piège tendu au lecteur.", likes: 18 },
  { user: "Camille D.", initials: "CD", rating: 4, text: "Magistral mais éreintant. La partie des crimes est presque insoutenable.", likes: 31 },
];

const QUOTES = [
  { text: "Personne ne fait attention à ces meurtres, mais en eux se cache le secret du monde.", user: "Théo B.", likes: 42 },
];

const SIMILAR = [
  { title: "Les Détectives sauvages", author: "Bolaño" },
  { title: "Beloved", author: "Morrison" },
  { title: "L'Étranger", author: "Camus" },
  { title: "Pedro Páramo", author: "Rulfo" },
  { title: "Ficciones", author: "Borges" },
  { title: "Molloy", author: "Beckett" },
];

function RatingBar({ rating, max = 5 }) {
  const pct = (rating / max) * 100;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, width: "100%" }}>
      <div style={{ flex: 1, height: 4, background: "#f0ede8", borderRadius: 2, overflow: "hidden" }}>
        <div style={{ width: `${pct}%`, height: "100%", background: "#D4883A", borderRadius: 2 }} />
      </div>
      <span style={{ fontSize: 13, fontWeight: 600, color: "#1a1a1a", minWidth: 24 }}>{rating}</span>
    </div>
  );
}

function CoverFallback({ title, w, h }) {
  return (
    <div style={{ width: w, height: h, background: "#e8e4de", borderRadius: 3, display: "flex", alignItems: "center", justifyContent: "center", padding: 8 }}>
      <span style={{ fontFamily: "'Instrument Serif', Georgia, serif", fontStyle: "italic", fontSize: 11, color: "#666", textAlign: "center" }}>{title}</span>
    </div>
  );
}

function Section({ title, defaultOpen = false, children }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div style={{ borderBottom: "1px solid #f0f0f0" }}>
      <button
        onClick={() => setOpen(!open)}
        style={{
          width: "100%", padding: "16px 0", display: "flex", alignItems: "center", justifyContent: "space-between",
          background: "none", border: "none", cursor: "pointer",
          fontFamily: "'Geist', sans-serif", fontSize: 13, fontWeight: 600, color: "#1a1a1a",
        }}
      >
        {title}
        <span style={{ fontSize: 16, color: "#767676", transition: "transform 0.2s", transform: open ? "rotate(180deg)" : "rotate(0)" }}>▾</span>
      </button>
      <div style={{
        maxHeight: open ? 1000 : 0, overflow: "hidden", transition: "max-height 0.3s ease",
      }}>
        <div style={{ paddingBottom: 20 }}>{children}</div>
      </div>
    </div>
  );
}

export default function PrototypeC() {
  const [status, setStatus] = useState(null);
  const [userRating, setUserRating] = useState(0);
  const [hoverStar, setHoverStar] = useState(0);

  const serif = "'Instrument Serif', Georgia, serif";
  const sans = "'Geist', -apple-system, sans-serif";

  return (
    <div style={{ fontFamily: sans, color: "#1a1a1a", background: "#fff", minHeight: "100vh" }}>

      {/* ── Nav ── */}
      <nav style={{ position: "sticky", top: 0, zIndex: 50, background: "rgba(255,255,255,0.9)", backdropFilter: "blur(12px)", borderBottom: "1px solid #f0f0f0", padding: "0 24px", display: "flex", alignItems: "center", height: 52 }}>
        <span style={{ fontWeight: 800, fontSize: 16 }}>reliure <span style={{ fontSize: 9, background: "#1a1a1a", color: "#fff", padding: "2px 5px", borderRadius: 3, verticalAlign: "middle", marginLeft: 4, fontWeight: 600 }}>BETA</span></span>
      </nav>

      <div style={{ maxWidth: 560, margin: "0 auto", padding: "24px 20px 80px", textAlign: "center" }}>

        {/* ── Back ── */}
        <div style={{ textAlign: "left", marginBottom: 24 }}>
          <span style={{ fontSize: 13, color: "#767676", cursor: "pointer" }}>← Retour</span>
        </div>

        {/* ── Cover — large centered ── */}
        <div style={{ display: "flex", justifyContent: "center" }}>
          <img
            src={BOOK.cover}
            alt={BOOK.title}
            style={{ width: 200, height: 300, objectFit: "cover", borderRadius: 6, boxShadow: "0 6px 28px rgba(0,0,0,0.12)" }}
          />
        </div>

        {/* ── Title ── */}
        <h1 style={{ margin: "24px 0 0", fontFamily: serif, fontStyle: "italic", fontSize: 32, fontWeight: 400, lineHeight: 1.15 }}>
          {BOOK.title}
        </h1>
        <div style={{ marginTop: 6, fontSize: 16, color: "#333" }}>{BOOK.author}</div>
        <div style={{ marginTop: 4, fontSize: 13, color: "#767676" }}>{BOOK.year} · {BOOK.pages} pages</div>

        {BOOK.award && (
          <div style={{ marginTop: 12, display: "inline-flex", alignItems: "center", gap: 5, padding: "5px 14px", borderRadius: 20, background: "#faf6f0", border: "1px solid #e8dfd2", fontSize: 11, fontWeight: 500, color: "#8B6914" }}>
            <span style={{ color: "#D4883A" }}>★</span> {BOOK.award}
          </div>
        )}

        {/* ── Rating block ── */}
        <div style={{ marginTop: 24, padding: "20px 24px", background: "#fafaf8", borderRadius: 12, textAlign: "left" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div>
              <div style={{ fontSize: 11, color: "#767676", textTransform: "uppercase", letterSpacing: "0.05em", fontWeight: 600 }}>Note communautaire</div>
              <div style={{ marginTop: 8 }}>
                <RatingBar rating={BOOK.rating} />
              </div>
              <div style={{ fontSize: 11, color: "#767676", marginTop: 4 }}>{BOOK.ratingCount.toLocaleString("fr-FR")} évaluations</div>
            </div>
            <div style={{ textAlign: "center", paddingLeft: 24, borderLeft: "1px solid #eee" }}>
              <div style={{ fontSize: 11, color: "#767676", marginBottom: 8 }}>Ta note</div>
              <div style={{ display: "flex", gap: 3 }}>
                {[1,2,3,4,5].map(n => (
                  <span
                    key={n}
                    onMouseEnter={() => setHoverStar(n)}
                    onMouseLeave={() => setHoverStar(0)}
                    onClick={() => setUserRating(n === userRating ? 0 : n)}
                    style={{
                      cursor: "pointer", fontSize: 20, transition: "all 0.15s",
                      color: n <= (hoverStar || userRating) ? "#D4883A" : "#ddd",
                      transform: n <= (hoverStar || 0) ? "scale(1.1)" : "scale(1)",
                      display: "inline-block",
                    }}
                  >★</span>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* ── Action buttons — horizontal ── */}
        <div style={{ marginTop: 16, display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8 }}>
          {["En cours", "Lu", "À lire", "Abandonné"].map(s => (
            <button
              key={s}
              onClick={() => setStatus(status === s ? null : s)}
              style={{
                padding: "10px 0", borderRadius: 8, fontSize: 12, cursor: "pointer",
                fontFamily: sans, fontWeight: 500,
                border: status === s ? "none" : "1px solid #e0dcd6",
                background: status === s ? "#1a1a1a" : "#fff",
                color: status === s ? "#fff" : "#666",
                transition: "all 0.15s",
              }}
            >{s}</button>
          ))}
        </div>

        {/* ── Description ── */}
        <div style={{ marginTop: 28, textAlign: "left" }}>
          <p style={{ fontSize: 15, lineHeight: 1.8, color: "#333", margin: 0 }}>
            {BOOK.description}
          </p>
        </div>

        {/* ── Themes ── */}
        <div style={{ marginTop: 16, display: "flex", gap: 6, flexWrap: "wrap", justifyContent: "flex-start" }}>
          {BOOK.themes.map(t => (
            <span key={t} style={{ padding: "5px 12px", borderRadius: 20, fontSize: 12, background: "#f5f3f0", border: "1px solid #eee", color: "#666", cursor: "pointer" }}>{t}</span>
          ))}
        </div>

        {/* ── Accordion sections ── */}
        <div style={{ marginTop: 28, textAlign: "left" }}>

          <Section title={`Critiques (${REVIEWS.length})`} defaultOpen={true}>
            {REVIEWS.map((rv, i) => (
              <div key={i} style={{ padding: "14px 0", borderBottom: i < REVIEWS.length - 1 ? "1px solid #f5f5f5" : "none" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                  <div style={{ width: 26, height: 26, borderRadius: "50%", background: "#f0ede8", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 600, color: "#666" }}>{rv.initials}</div>
                  <span style={{ fontSize: 13, fontWeight: 600 }}>{rv.user}</span>
                  <span style={{ fontSize: 12, color: "#D4883A" }}>{"★".repeat(rv.rating)}{"☆".repeat(5 - rv.rating)}</span>
                </div>
                <p style={{ fontSize: 14, color: "#333", lineHeight: 1.7, margin: 0 }}>{rv.text}</p>
                <div style={{ marginTop: 8, fontSize: 12, color: "#767676" }}>♥ {rv.likes}</div>
              </div>
            ))}
          </Section>

          <Section title={`Citations (${QUOTES.length})`}>
            {QUOTES.map((q, i) => (
              <div key={i} style={{ padding: "14px 0" }}>
                <div style={{ fontFamily: serif, fontStyle: "italic", fontSize: 16, lineHeight: 1.7, color: "#1a1a1a", borderLeft: "3px solid #e8e4de", paddingLeft: 14 }}>
                  « {q.text} »
                </div>
                <div style={{ marginTop: 8, fontSize: 12, color: "#767676" }}>
                  {q.user} · ♥ {q.likes}
                </div>
              </div>
            ))}
            <button style={{ width: "100%", padding: "10px", borderRadius: 8, border: "1.5px dashed #ddd", background: "transparent", cursor: "pointer", fontSize: 13, color: "#767676", fontFamily: sans }}>
              + Ajouter une citation
            </button>
          </Section>

          <Section title="Éditions">
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {[{ l: "Poche", p: "Folio", y: "2008" }, { l: "Relié", p: "Gallimard", y: "2004" }, { l: "Audio", p: "Audible", y: "2019" }].map((e, i) => (
                <div key={i} style={{ flex: 1, minWidth: 100, padding: "12px 14px", background: "#fafaf8", borderRadius: 8, cursor: "pointer" }}>
                  <div style={{ fontSize: 13, fontWeight: 600 }}>{e.l}</div>
                  <div style={{ fontSize: 11, color: "#767676", marginTop: 2 }}>{e.p} · {e.y}</div>
                </div>
              ))}
            </div>
          </Section>

          <Section title="Où lire">
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {["Fnac", "Amazon", "Bibliothèque", "Kindle", "Audible"].map(s => (
                <span key={s} style={{ padding: "8px 16px", borderRadius: 6, fontSize: 12, background: "#fafaf8", border: "1px solid #eee", color: "#666", cursor: "pointer" }}>{s}</span>
              ))}
            </div>
          </Section>
        </div>

        {/* ── Les lecteurs ont aussi aimé ── */}
        <div style={{ marginTop: 32, paddingTop: 24, borderTop: "1px solid #f0f0f0", textAlign: "left" }}>
          <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", color: "#767676", marginBottom: 14 }}>Les lecteurs ont aussi aimé</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12 }}>
            {SIMILAR.map((b, i) => (
              <div key={i} style={{ textAlign: "center" }}>
                <CoverFallback title={b.title} w="100%" h={140} />
                <div style={{ fontSize: 11, fontWeight: 500, marginTop: 6 }}>{b.title}</div>
                <div style={{ fontSize: 10, color: "#767676" }}>{b.author}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
