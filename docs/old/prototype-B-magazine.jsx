import { useState } from "react";

/*
 * PROTOTYPE B — « Magazine éditorial »
 * Inspiré par Sabzian / Cahiers du Cinéma / revue littéraire
 * Layout asymétrique avec couverture dominante à gauche,
 * typographie serif imposante, beaucoup de blanc,
 * la notation et les actions sont discrètes et textuelles.
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
  description: "Cinq parties, cinq mondes reliés par un fil invisible. Des critiques littéraires européens obsédés par un auteur allemand disparu, une jeune femme à Santa Teresa, une ville ravagée par les féminicides, et la grande spirale de la violence du XXe siècle. Bolaño tisse une fresque où chaque personnage porte le poids de l'histoire.",
};

const REVIEWS = [
  { user: "Margaux L.", initials: "ML", rating: 5, text: "Un chef-d'oeuvre absolu. Bolaño construit un labyrinthe dont on ne veut jamais sortir. Chaque partie est un roman en soi.", likes: 24, date: "26 mars" },
  { user: "Théo B.", initials: "TB", rating: 5, text: "Le livre qui a changé ma façon de lire. Chaque phrase est un piège tendu au lecteur.", likes: 18, date: "20 mars" },
  { user: "Camille D.", initials: "CD", rating: 4, text: "Magistral mais éreintant. La partie des crimes est presque insoutenable. On en sort changé.", likes: 31, date: "15 mars" },
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
];

function RatingDots({ rating }) {
  const full = Math.floor(rating);
  return (
    <span style={{ display: "inline-flex", gap: 3, alignItems: "center" }}>
      {[1,2,3,4,5].map(i => (
        <span key={i} style={{
          width: 8, height: 8, borderRadius: "50%",
          background: i <= full ? "#D4883A" : i === full + 1 && rating % 1 >= 0.25 ? "#D4883A" : "#e0dcd6",
          opacity: i === full + 1 && rating % 1 >= 0.25 ? 0.5 : 1,
          display: "inline-block",
        }} />
      ))}
    </span>
  );
}

function CoverFallback({ title, w, h }) {
  return (
    <div style={{ width: w, height: h, background: "#e8e4de", borderRadius: 3, display: "flex", alignItems: "center", justifyContent: "center", padding: 8 }}>
      <span style={{ fontFamily: "'Instrument Serif', Georgia, serif", fontStyle: "italic", fontSize: 11, color: "#666", textAlign: "center" }}>{title}</span>
    </div>
  );
}

export default function PrototypeB() {
  const [status, setStatus] = useState(null);
  const [userRating, setUserRating] = useState(0);
  const [hoverStar, setHoverStar] = useState(0);
  const [showAllReviews, setShowAllReviews] = useState(false);

  const serif = "'Instrument Serif', Georgia, serif";
  const sans = "'Geist', -apple-system, sans-serif";

  return (
    <div style={{ fontFamily: sans, color: "#1a1a1a", background: "#fff", minHeight: "100vh" }}>

      {/* ── Nav ── */}
      <nav style={{ position: "sticky", top: 0, zIndex: 50, background: "rgba(255,255,255,0.9)", backdropFilter: "blur(12px)", borderBottom: "1px solid #f0f0f0", padding: "0 24px", display: "flex", alignItems: "center", height: 52 }}>
        <span style={{ fontWeight: 800, fontSize: 16, letterSpacing: "-0.3px" }}>reliure <span style={{ fontSize: 9, background: "#1a1a1a", color: "#fff", padding: "2px 5px", borderRadius: 3, verticalAlign: "middle", marginLeft: 4, fontWeight: 600 }}>BETA</span></span>
      </nav>

      <div style={{ maxWidth: 820, margin: "0 auto", padding: "32px 24px 80px" }}>

        {/* ── Breadcrumb ── */}
        <div style={{ fontSize: 12, color: "#767676", marginBottom: 32 }}>
          <span style={{ cursor: "pointer" }}>Explorer</span> <span style={{ margin: "0 6px", opacity: 0.4 }}>/</span> <span>{BOOK.author}</span> <span style={{ margin: "0 6px", opacity: 0.4 }}>/</span> <span style={{ color: "#1a1a1a" }}>{BOOK.title}</span>
        </div>

        {/* ── Hero split ── */}
        <div style={{ display: "grid", gridTemplateColumns: "280px 1fr", gap: 48, alignItems: "start" }}>

          {/* Left — Cover */}
          <div style={{ position: "sticky", top: 72 }}>
            <img
              src={BOOK.cover}
              alt={BOOK.title}
              style={{ width: "100%", borderRadius: 4, boxShadow: "0 4px 24px rgba(0,0,0,0.1)" }}
            />

            {/* Actions under cover */}
            <div style={{ marginTop: 20, display: "flex", flexDirection: "column", gap: 8 }}>
              {["En cours", "Lu", "À lire"].map(s => (
                <button
                  key={s}
                  onClick={() => setStatus(status === s ? null : s)}
                  style={{
                    padding: "10px 0", borderRadius: 6, fontSize: 13, cursor: "pointer",
                    fontFamily: sans, fontWeight: 500, textAlign: "center",
                    border: status === s ? "none" : "1px solid #e0dcd6",
                    background: status === s ? "#1a1a1a" : "#fff",
                    color: status === s ? "#fff" : "#1a1a1a",
                    transition: "all 0.15s",
                  }}
                >{s}</button>
              ))}
              <button
                onClick={() => setStatus(status === "Abandonné" ? null : "Abandonné")}
                style={{
                  padding: "8px 0", border: "none", background: "none", cursor: "pointer",
                  fontSize: 12, color: "#767676", fontFamily: sans, textAlign: "center",
                }}
              >Abandonné</button>
            </div>

            {/* Où lire */}
            <div style={{ marginTop: 24, paddingTop: 16, borderTop: "1px solid #f0f0f0" }}>
              <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", color: "#767676", marginBottom: 8 }}>Où lire</div>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                {["Fnac", "Amazon", "Bibliothèque", "Kindle", "Audible"].map(s => (
                  <span key={s} style={{ padding: "5px 10px", borderRadius: 4, fontSize: 11, background: "#fafaf8", border: "1px solid #eee", color: "#666", cursor: "pointer" }}>{s}</span>
                ))}
              </div>
            </div>
          </div>

          {/* Right — Content */}
          <div>
            {/* Title block */}
            <div>
              {BOOK.award && (
                <div style={{ fontSize: 11, color: "#D4883A", fontWeight: 500, marginBottom: 8, display: "flex", alignItems: "center", gap: 4 }}>
                  <span>★</span> {BOOK.award}
                </div>
              )}

              <h1 style={{ margin: 0, fontFamily: serif, fontStyle: "italic", fontSize: 42, fontWeight: 400, lineHeight: 1.1, letterSpacing: "-0.5px" }}>
                {BOOK.title}
              </h1>
              <div style={{ marginTop: 10, fontSize: 18, color: "#333", fontFamily: serif }}>
                {BOOK.author}
              </div>
              <div style={{ marginTop: 6, fontSize: 13, color: "#767676" }}>
                {BOOK.year} · {BOOK.pages} pages
              </div>
            </div>

            {/* Rating bar */}
            <div style={{ marginTop: 20, display: "flex", alignItems: "center", gap: 16, paddingBottom: 20, borderBottom: "1px solid #f0f0f0" }}>
              <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
                <span style={{ fontSize: 28, fontWeight: 700, letterSpacing: "-0.5px" }}>{BOOK.rating}</span>
                <RatingDots rating={BOOK.rating} />
              </div>
              <span style={{ fontSize: 12, color: "#767676" }}>{BOOK.ratingCount.toLocaleString("fr-FR")} évaluations</span>

              <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontSize: 12, color: "#767676" }}>Ta note</span>
                <div style={{ display: "flex", gap: 2 }}>
                  {[1,2,3,4,5].map(n => (
                    <span
                      key={n}
                      onMouseEnter={() => setHoverStar(n)}
                      onMouseLeave={() => setHoverStar(0)}
                      onClick={() => setUserRating(n === userRating ? 0 : n)}
                      style={{
                        cursor: "pointer", fontSize: 16, transition: "transform 0.15s",
                        color: n <= (hoverStar || userRating) ? "#D4883A" : "#ddd",
                        display: "inline-block",
                      }}
                    >★</span>
                  ))}
                </div>
              </div>
            </div>

            {/* Description */}
            <div style={{ marginTop: 24 }}>
              <p style={{ fontSize: 15, lineHeight: 1.8, color: "#333", margin: 0 }}>
                {BOOK.description}
              </p>
            </div>

            {/* Themes */}
            <div style={{ marginTop: 20, display: "flex", gap: 6, flexWrap: "wrap" }}>
              {BOOK.themes.map(t => (
                <span key={t} style={{ padding: "5px 12px", borderRadius: 20, fontSize: 12, background: "#f5f3f0", border: "1px solid #eee", color: "#666", cursor: "pointer" }}>{t}</span>
              ))}
            </div>

            {/* ── Pull quote (first citation) ── */}
            {QUOTES.length > 0 && (
              <div style={{ margin: "36px 0", padding: "24px 0", borderTop: "1px solid #f0f0f0", borderBottom: "1px solid #f0f0f0" }}>
                <div style={{ fontFamily: serif, fontStyle: "italic", fontSize: 20, lineHeight: 1.6, color: "#1a1a1a", maxWidth: 500 }}>
                  « {QUOTES[0].text} »
                </div>
                <div style={{ marginTop: 12, fontSize: 12, color: "#767676" }}>
                  — cité par {QUOTES[0].user} · ♥ {QUOTES[0].likes}
                </div>
              </div>
            )}

            {/* ── Critiques ── */}
            <div>
              <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 16 }}>
                <h2 style={{ margin: 0, fontFamily: serif, fontStyle: "italic", fontSize: 22, fontWeight: 400 }}>Critiques</h2>
                <span style={{ fontSize: 12, color: "#767676" }}>{REVIEWS.length} critiques</span>
              </div>

              {(showAllReviews ? REVIEWS : REVIEWS.slice(0, 2)).map((rv, i) => (
                <div key={i} style={{ padding: "20px 0", borderTop: "1px solid #f5f5f5" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
                    <div style={{ width: 30, height: 30, borderRadius: "50%", background: "#f0ede8", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 600, color: "#666" }}>{rv.initials}</div>
                    <div>
                      <span style={{ fontSize: 13, fontWeight: 600 }}>{rv.user}</span>
                      <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 2 }}>
                        <RatingDots rating={rv.rating} />
                        <span style={{ fontSize: 11, color: "#767676" }}>{rv.date}</span>
                      </div>
                    </div>
                  </div>
                  <p style={{ fontSize: 15, color: "#333", lineHeight: 1.75, margin: 0 }}>{rv.text}</p>
                  <div style={{ marginTop: 10, display: "flex", gap: 16, fontSize: 12, color: "#767676" }}>
                    <span style={{ cursor: "pointer" }}>♥ {rv.likes}</span>
                    <span style={{ cursor: "pointer" }}>Répondre</span>
                  </div>
                </div>
              ))}

              {REVIEWS.length > 2 && !showAllReviews && (
                <button onClick={() => setShowAllReviews(true)} style={{ width: "100%", padding: "12px", border: "1px solid #eee", borderRadius: 8, background: "none", cursor: "pointer", fontSize: 13, color: "#666", fontFamily: sans, marginTop: 8 }}>
                  Voir toutes les critiques ({REVIEWS.length})
                </button>
              )}
            </div>

            {/* ── Aussi aimé ── */}
            <div style={{ marginTop: 40, paddingTop: 24, borderTop: "1px solid #f0f0f0" }}>
              <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", color: "#767676", marginBottom: 14 }}>Les lecteurs ont aussi aimé</div>
              <div style={{ display: "flex", gap: 14, overflowX: "auto" }}>
                {SIMILAR.map((b, i) => (
                  <div key={i} style={{ textAlign: "center", flexShrink: 0 }}>
                    <CoverFallback title={b.title} w={88} h={132} />
                    <div style={{ fontSize: 11, fontWeight: 500, marginTop: 6, maxWidth: 88 }}>{b.title}</div>
                    <div style={{ fontSize: 10, color: "#767676" }}>{b.author}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
