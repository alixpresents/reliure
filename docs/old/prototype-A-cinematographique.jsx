import { useState } from "react";

/*
 * PROTOTYPE A — « Cinématographique »
 * Inspiré par Letterboxd / MUBI
 * Hero avec fond flou extrait de la couverture,
 * couverture flottante en overlay, rating prominent,
 * séparation claire entre espace perso et espace communautaire.
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
  { user: "Margaux L.", initials: "ML", rating: 5, text: "Un chef-d'oeuvre absolu. Bolaño construit un labyrinthe dont on ne veut jamais sortir.", likes: 24, date: "26 mars 2026" },
  { user: "Théo B.", initials: "TB", rating: 5, text: "Le livre qui a changé ma façon de lire. Chaque partie est un roman en soi, chaque phrase un piège tendu au lecteur.", likes: 18, date: "20 mars 2026" },
  { user: "Camille D.", initials: "CD", rating: 4, text: "Magistral mais éreintant. La partie des crimes est presque insoutenable. On en sort changé.", likes: 31, date: "15 mars 2026" },
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

function Stars({ rating, size = 14, color = "#D4883A" }) {
  const full = Math.floor(rating);
  const half = rating % 1 >= 0.25;
  return (
    <span style={{ display: "inline-flex", gap: 1, fontSize: size }}>
      {[1,2,3,4,5].map(i => (
        <span key={i} style={{ color: i <= full ? color : i === full + 1 && half ? color : "#ddd", opacity: i === full + 1 && half ? 0.5 : 1 }}>★</span>
      ))}
    </span>
  );
}

function CoverFallback({ title, w, h }) {
  return (
    <div style={{ width: w, height: h, background: "#e8e4de", borderRadius: 3, display: "flex", alignItems: "center", justifyContent: "center", padding: 12 }}>
      <span style={{ fontFamily: "'Instrument Serif', Georgia, serif", fontStyle: "italic", fontSize: 14, color: "#666", textAlign: "center" }}>{title}</span>
    </div>
  );
}

export default function PrototypeA() {
  const [status, setStatus] = useState(null);
  const [userRating, setUserRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [activeTab, setActiveTab] = useState("critiques");
  const [expanded, setExpanded] = useState(false);

  return (
    <div style={{ fontFamily: "'Geist', -apple-system, sans-serif", color: "#1a1a1a", background: "#fff", minHeight: "100vh" }}>

      {/* ── Nav ── */}
      <nav style={{ position: "sticky", top: 0, zIndex: 50, background: "rgba(255,255,255,0.85)", backdropFilter: "blur(12px)", borderBottom: "1px solid #f0f0f0", padding: "0 24px", display: "flex", alignItems: "center", height: 52 }}>
        <span style={{ fontWeight: 800, fontSize: 16, letterSpacing: "-0.3px" }}>reliure <span style={{ fontSize: 9, background: "#1a1a1a", color: "#fff", padding: "2px 5px", borderRadius: 3, verticalAlign: "middle", marginLeft: 4, fontWeight: 600 }}>BETA</span></span>
        <div style={{ display: "flex", gap: 24, marginLeft: 32, fontSize: 13, color: "#666" }}>
          <span>Explorer</span><span>Citations</span><span>Fil</span><span style={{ fontWeight: 600, color: "#1a1a1a" }}>Profil</span>
          <span style={{ fontFamily: "'Instrument Serif', Georgia, serif", fontStyle: "italic", color: "#666" }}>La Revue</span>
        </div>
      </nav>

      {/* ── Hero backdrop ── */}
      <div style={{ position: "relative", overflow: "hidden", background: "#1a1a1a" }}>
        {/* Blurred background */}
        <div style={{
          position: "absolute", inset: 0,
          backgroundImage: `url(${BOOK.cover})`,
          backgroundSize: "cover", backgroundPosition: "center",
          filter: "blur(40px) brightness(0.4) saturate(1.3)",
          transform: "scale(1.2)",
        }} />

        <div style={{ position: "relative", maxWidth: 760, margin: "0 auto", padding: "48px 24px 0", display: "flex", gap: 32, alignItems: "flex-end" }}>

          {/* Cover — float down */}
          <div style={{ flexShrink: 0, marginBottom: -40, zIndex: 2 }}>
            <img
              src={BOOK.cover}
              alt={BOOK.title}
              style={{ width: 180, height: 270, objectFit: "cover", borderRadius: 4, boxShadow: "0 8px 32px rgba(0,0,0,0.4)" }}
            />
          </div>

          {/* Meta on dark */}
          <div style={{ flex: 1, paddingBottom: 24, color: "#fff" }}>
            <h1 style={{ margin: 0, fontFamily: "'Instrument Serif', Georgia, serif", fontStyle: "italic", fontSize: 32, fontWeight: 400, lineHeight: 1.15 }}>
              {BOOK.title}
            </h1>
            <div style={{ marginTop: 6, fontSize: 15, opacity: 0.8 }}>{BOOK.author}</div>
            <div style={{ marginTop: 4, fontSize: 12, opacity: 0.5 }}>{BOOK.year} · {BOOK.pages} pages</div>

            {BOOK.award && (
              <div style={{ marginTop: 12, display: "inline-flex", alignItems: "center", gap: 6, padding: "5px 12px", borderRadius: 20, background: "rgba(212,136,58,0.15)", border: "1px solid rgba(212,136,58,0.3)", fontSize: 11, color: "#D4883A" }}>
                <span>★</span> {BOOK.award}
              </div>
            )}

            {/* Big rating */}
            <div style={{ marginTop: 16, display: "flex", alignItems: "baseline", gap: 10 }}>
              <span style={{ fontSize: 36, fontWeight: 700, letterSpacing: "-1px" }}>{BOOK.rating}</span>
              <div>
                <Stars rating={BOOK.rating} size={14} />
                <div style={{ fontSize: 11, opacity: 0.5, marginTop: 2 }}>{BOOK.ratingCount.toLocaleString("fr-FR")} évaluations</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Content ── */}
      <div style={{ maxWidth: 760, margin: "0 auto", padding: "0 24px" }}>

        {/* Spacer for floating cover */}
        <div style={{ height: 56 }} />

        {/* ── Action bar ── */}
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
          {["En cours", "Lu", "À lire", "Abandonné"].map(s => (
            <button
              key={s}
              onClick={() => setStatus(status === s ? null : s)}
              style={{
                padding: "8px 18px", borderRadius: 20, fontSize: 13, cursor: "pointer",
                fontFamily: "'Geist', sans-serif", fontWeight: 500,
                border: status === s ? "none" : "1px solid #ddd",
                background: status === s ? "#1a1a1a" : "transparent",
                color: status === s ? "#fff" : "#666",
                transition: "all 0.15s ease",
              }}
            >{s}</button>
          ))}

          {/* Separator */}
          <div style={{ width: 1, height: 24, background: "#eee", margin: "0 8px" }} />

          {/* Personal rating inline */}
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ fontSize: 12, color: "#767676" }}>Ta note</span>
            <div style={{ display: "flex", gap: 2 }}>
              {[1,2,3,4,5].map(n => (
                <span
                  key={n}
                  onMouseEnter={() => setHoverRating(n)}
                  onMouseLeave={() => setHoverRating(0)}
                  onClick={() => setUserRating(n === userRating ? 0 : n)}
                  style={{
                    cursor: "pointer", fontSize: 18, transition: "transform 0.15s",
                    color: n <= (hoverRating || userRating) ? "#D4883A" : "#ddd",
                    transform: n <= (hoverRating || 0) ? "scale(1.15)" : "scale(1)",
                    display: "inline-block",
                  }}
                >★</span>
              ))}
            </div>
          </div>
        </div>

        {/* ── Synopsis ── */}
        <div style={{ marginTop: 32 }}>
          <p style={{ fontSize: 15, lineHeight: 1.75, color: "#333", margin: 0 }}>
            {expanded ? BOOK.description : BOOK.description.slice(0, 150) + "..."}
            <button onClick={() => setExpanded(!expanded)} style={{ background: "none", border: "none", color: "#767676", cursor: "pointer", fontSize: 13, marginLeft: 4, padding: 0, fontFamily: "'Geist', sans-serif" }}>
              {expanded ? "Moins" : "Lire la suite"}
            </button>
          </p>
        </div>

        {/* ── Thèmes ── */}
        <div style={{ marginTop: 20, display: "flex", gap: 6, flexWrap: "wrap" }}>
          {BOOK.themes.map(t => (
            <span key={t} style={{ padding: "5px 12px", borderRadius: 20, fontSize: 12, background: "#f5f3f0", border: "1px solid #eee", color: "#666", cursor: "pointer" }}>{t}</span>
          ))}
        </div>

        {/* ── Où lire ── */}
        <div style={{ marginTop: 28, paddingTop: 20, borderTop: "1px solid #f0f0f0" }}>
          <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", color: "#767676", marginBottom: 10 }}>Où lire</div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {["Fnac", "Amazon", "Bibliothèque", "Kindle", "Audible"].map(s => (
              <span key={s} style={{ padding: "6px 14px", borderRadius: 6, fontSize: 12, background: "#fafaf8", border: "1px solid #eee", color: "#666", cursor: "pointer" }}>{s}</span>
            ))}
          </div>
        </div>

        {/* ── Tabs ── */}
        <div style={{ marginTop: 32, borderTop: "1px solid #f0f0f0" }}>
          <div style={{ display: "flex" }}>
            {["critiques", "citations", "éditions"].map(t => (
              <button
                key={t}
                onClick={() => setActiveTab(t)}
                style={{
                  flex: 1, padding: "14px 0", background: "none", border: "none", cursor: "pointer",
                  fontSize: 13, fontFamily: "'Geist', sans-serif",
                  fontWeight: activeTab === t ? 600 : 400,
                  color: activeTab === t ? "#1a1a1a" : "#767676",
                  borderBottom: activeTab === t ? "2px solid #1a1a1a" : "2px solid transparent",
                  textTransform: "capitalize",
                }}
              >
                {t}{t === "citations" ? ` (${QUOTES.length})` : ""}
              </button>
            ))}
          </div>

          {activeTab === "critiques" && (
            <div style={{ paddingTop: 8 }}>
              {REVIEWS.map((rv, i) => (
                <div key={i} style={{ padding: "20px 0", borderBottom: "1px solid #f5f5f5" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
                    <div style={{ width: 28, height: 28, borderRadius: "50%", background: "#f0ede8", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 600, color: "#666" }}>{rv.initials}</div>
                    <span style={{ fontSize: 13, fontWeight: 600 }}>{rv.user}</span>
                    <Stars rating={rv.rating} size={11} />
                    <span style={{ marginLeft: "auto", fontSize: 11, color: "#767676" }}>{rv.date}</span>
                  </div>
                  <p style={{ fontSize: 15, color: "#333", lineHeight: 1.7, margin: 0 }}>{rv.text}</p>
                  <div style={{ marginTop: 8, display: "flex", alignItems: "center", gap: 16, fontSize: 12, color: "#767676" }}>
                    <span style={{ cursor: "pointer" }}>♥ {rv.likes}</span>
                    <span style={{ cursor: "pointer" }}>Répondre</span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {activeTab === "citations" && (
            <div style={{ paddingTop: 8 }}>
              {QUOTES.map((q, i) => (
                <div key={i} style={{ padding: "20px 0", borderBottom: "1px solid #f5f5f5" }}>
                  <div style={{ fontSize: 16, fontFamily: "'Instrument Serif', Georgia, serif", fontStyle: "italic", color: "#1a1a1a", lineHeight: 1.7, borderLeft: "3px solid #e8e4de", paddingLeft: 16 }}>
                    « {q.text} »
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 10, fontSize: 12, color: "#767676" }}>
                    <span>{q.user}</span>
                    <span style={{ marginLeft: "auto" }}>♥ {q.likes}</span>
                  </div>
                </div>
              ))}
              <button style={{ width: "100%", marginTop: 12, padding: "10px", borderRadius: 8, border: "1.5px dashed #ddd", background: "transparent", cursor: "pointer", fontSize: 13, color: "#767676", fontFamily: "'Geist', sans-serif" }}>
                + Ajouter une citation
              </button>
            </div>
          )}

          {activeTab === "éditions" && (
            <div style={{ display: "flex", gap: 10, paddingTop: 16, flexWrap: "wrap" }}>
              {[{ l: "Poche", p: "Folio", y: "2008" }, { l: "Relié", p: "Gallimard", y: "2004" }, { l: "Audio", p: "Audible", y: "2019" }].map((e, i) => (
                <div key={i} style={{ flex: 1, minWidth: 120, padding: "14px 16px", background: "#fafaf8", borderRadius: 8, cursor: "pointer" }}>
                  <div style={{ fontSize: 13, fontWeight: 600 }}>{e.l}</div>
                  <div style={{ fontSize: 12, color: "#767676", marginTop: 3 }}>{e.p} · {e.y}</div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ── Les lecteurs ont aussi aimé ── */}
        <div style={{ marginTop: 40, paddingTop: 24, borderTop: "1px solid #f0f0f0", paddingBottom: 60 }}>
          <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", color: "#767676", marginBottom: 14 }}>Les lecteurs ont aussi aimé</div>
          <div style={{ display: "flex", gap: 16, overflowX: "auto" }}>
            {SIMILAR.map((b, i) => (
              <div key={i} style={{ textAlign: "center", flexShrink: 0 }}>
                <CoverFallback title={b.title} w={100} h={150} />
                <div style={{ fontSize: 11, fontWeight: 500, marginTop: 6, maxWidth: 100, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{b.title}</div>
                <div style={{ fontSize: 10, color: "#767676", marginTop: 2 }}>{b.author}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
