import { useState, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import Img from "../components/Img";
import Pill from "../components/Pill";
import Label from "../components/Label";
import { useBoussole } from "../hooks/useBoussole";

export function meta() {
  return [
    { title: "Boussole — Reliure" },
    { name: "description", content: "Trouve ton prochain livre par ambiance, type d'intrigue ou personnage." },
    { property: "og:title", content: "Boussole — Reliure" },
    { property: "og:description", content: "Trouve ton prochain livre par ambiance, type d'intrigue ou personnage." },
    { property: "og:site_name", content: "Reliure" },
  ];
}

const MOODS = [
  { v: "réconfortant", label: "Réconfortant", e: "☕" },
  { v: "sombre", label: "Sombre", e: "🌑" },
  { v: "drôle", label: "Drôle", e: "😏" },
  { v: "mélancolique", label: "Mélancolique", e: "🍂" },
  { v: "haletant", label: "Haletant", e: "⚡" },
  { v: "contemplatif", label: "Contemplatif", e: "🪷" },
  { v: "dérangeant", label: "Dérangeant", e: "🔪" },
  { v: "lumineux", label: "Lumineux", e: "✦" },
  { v: "sensuel", label: "Sensuel", e: "🌹" },
  { v: "poétique", label: "Poétique", e: "🕊" },
];

const INTRIGUES = [
  { v: "quête", label: "Quête", e: "🗺" },
  { v: "famille", label: "Famille", e: "🏠" },
  { v: "amour", label: "Amour", e: "💌" },
  { v: "deuil", label: "Deuil", e: "🕯" },
  { v: "identité", label: "Identité", e: "🪞" },
  { v: "voyage", label: "Voyage", e: "✈" },
  { v: "guerre", label: "Guerre", e: "⚔" },
  { v: "société", label: "Société", e: "🏛" },
  { v: "survie", label: "Survie", e: "🔥" },
  { v: "amitié", label: "Amitié", e: "🤝" },
];

const RYTHMES = [
  { v: "lent", label: "Lent" },
  { v: "rapide", label: "Rapide" },
];

const REGISTRES = [
  { v: "léger", label: "Léger" },
  { v: "grave", label: "Grave" },
  { v: "ironique", label: "Ironique" },
];

const PROTAG_AGES = [
  { v: "enfant", label: "Enfant" },
  { v: "ado", label: "Ado" },
  { v: "jeune_adulte", label: "Jeune adulte" },
  { v: "age_mur", label: "Âge mûr" },
  { v: "senior", label: "Senior" },
];

const PROTAG_GENRES = [
  { v: "femme", label: "Femme" },
  { v: "homme", label: "Homme" },
  { v: "non_binaire", label: "Non-binaire" },
  { v: "collectif", label: "Collectif" },
];

const SHORTCUTS = [
  { label: "☕ Cosy & réconfortant", filters: { moods: ["réconfortant"], rythme: "lent", registre: "léger" } },
  { label: "⚡ Page-turner sombre", filters: { moods: ["haletant", "sombre"], rythme: "rapide" } },
  { label: "🧠 Intellectuel & contemplatif", filters: { moods: ["contemplatif"], registre: "grave" } },
  { label: "😏 Acide & drôle", filters: { moods: ["drôle"], registre: "ironique" } },
  { label: "🌹 Passion amoureuse", filters: { moods: ["sensuel"], intrigues: ["amour"] } },
  { label: "🪞 Récit d'apprentissage", filters: { protag_age: "ado", intrigues: ["identité"] } },
];

const INITIAL_FILTERS = {
  moods: [],
  rythme: null,
  registre: null,
  protag_age: null,
  protag_genre: null,
  intrigues: [],
};

function normalizeBook(b) {
  return {
    id: b.book_id,
    t: b.title,
    a: Array.isArray(b.authors) ? b.authors.join(", ") : (b.authors || ""),
    c: b.cover_url,
    slug: b.slug,
  };
}

export default function BoussolePage() {
  const [tab, setTab] = useState("ambiance");
  const [filters, setFilters] = useState(INITIAL_FILTERS);
  const navigate = useNavigate();

  const { books, isLoading, hasAnyFilter } = useBoussole(filters);

  const activeCount =
    (filters.moods?.length || 0) +
    (filters.rythme ? 1 : 0) +
    (filters.registre ? 1 : 0) +
    (filters.protag_age ? 1 : 0) +
    (filters.protag_genre ? 1 : 0) +
    (filters.intrigues?.length || 0);

  const toggleMood = useCallback((v) => {
    setFilters(f => {
      const has = f.moods.includes(v);
      if (has) return { ...f, moods: f.moods.filter(m => m !== v) };
      if (f.moods.length >= 3) return f;
      return { ...f, moods: [...f.moods, v] };
    });
  }, []);

  const toggleIntrigue = useCallback((v) => {
    setFilters(f => {
      const has = f.intrigues.includes(v);
      if (has) return { ...f, intrigues: f.intrigues.filter(i => i !== v) };
      if (f.intrigues.length >= 2) return f;
      return { ...f, intrigues: [...f.intrigues, v] };
    });
  }, []);

  const toggleScalar = useCallback((key, v) => {
    setFilters(f => ({ ...f, [key]: f[key] === v ? null : v }));
  }, []);

  const applyShortcut = useCallback((s) => {
    setFilters({ ...INITIAL_FILTERS, ...s.filters });
  }, []);

  const reset = useCallback(() => setFilters(INITIAL_FILTERS), []);

  return (
    <div className="sk-fade pb-16">
      {/* Breadcrumb */}
      <div className="pt-5 pb-1 text-[12px] font-body" style={{ color: "var(--text-muted)" }}>
        <Link to="/" className="no-underline hover:underline" style={{ color: "var(--text-muted)" }}>Explorer</Link>
        <span className="mx-1.5">/</span>
        <span style={{ color: "var(--text-secondary)" }}>Boussole</span>
      </div>

      {/* Header */}
      <h1 className="font-display text-[28px] font-normal mt-2 mb-1" style={{ color: "var(--text-primary)" }}>
        🧭 Boussole
      </h1>
      <p className="text-[14px] font-body mb-6" style={{ color: "var(--text-secondary)" }}>
        Quel livre pour toi en ce moment ? Choisis une ambiance, un type d'intrigue, un personnage.
      </p>

      {/* Tabs + counter + reset */}
      <div className="flex items-center gap-0 mb-5" style={{ borderBottom: "1px solid var(--border-subtle)" }}>
        <button
          onClick={() => setTab("ambiance")}
          className="bg-transparent border-none cursor-pointer pb-2.5 px-0 mr-6 text-[14px] font-body transition-colors duration-150"
          style={{
            color: tab === "ambiance" ? "var(--text-primary)" : "var(--text-muted)",
            fontWeight: tab === "ambiance" ? 600 : 400,
            borderBottom: tab === "ambiance" ? "2px solid var(--text-primary)" : "2px solid transparent",
            marginBottom: -1,
          }}
        >
          ✦ Ambiance
        </button>
        <button
          onClick={() => setTab("personnage")}
          className="bg-transparent border-none cursor-pointer pb-2.5 px-0 mr-auto text-[14px] font-body transition-colors duration-150"
          style={{
            color: tab === "personnage" ? "var(--text-primary)" : "var(--text-muted)",
            fontWeight: tab === "personnage" ? 600 : 400,
            borderBottom: tab === "personnage" ? "2px solid var(--text-primary)" : "2px solid transparent",
            marginBottom: -1,
          }}
        >
          👤 Personnage & Intrigue
        </button>
        {activeCount > 0 && (
          <div className="flex items-center gap-2 pb-2.5">
            <span className="text-[12px] font-body" style={{ color: "var(--text-muted)" }}>
              {activeCount} filtre{activeCount > 1 ? "s" : ""}
            </span>
            <button
              onClick={reset}
              className="bg-transparent border-none cursor-pointer text-[12px] font-body p-0 underline"
              style={{ color: "var(--text-tertiary)" }}
            >
              Réinitialiser
            </button>
          </div>
        )}
      </div>

      {/* Filters */}
      {tab === "ambiance" && (
        <div className="mb-6">
          <Label>Ambiance</Label>
          <div className="flex flex-wrap gap-2 mb-5">
            {MOODS.map(m => (
              <Pill key={m.v} active={filters.moods.includes(m.v)} onClick={() => toggleMood(m.v)}>
                {m.e} {m.label}
              </Pill>
            ))}
          </div>

          <Label>Rythme</Label>
          <div className="flex flex-wrap gap-2 mb-5">
            {RYTHMES.map(r => (
              <Pill key={r.v} active={filters.rythme === r.v} onClick={() => toggleScalar("rythme", r.v)}>
                {r.label}
              </Pill>
            ))}
          </div>

          <Label>Registre</Label>
          <div className="flex flex-wrap gap-2">
            {REGISTRES.map(r => (
              <Pill key={r.v} active={filters.registre === r.v} onClick={() => toggleScalar("registre", r.v)}>
                {r.label}
              </Pill>
            ))}
          </div>
        </div>
      )}

      {tab === "personnage" && (
        <div className="mb-6">
          <Label>Âge du protagoniste</Label>
          <div className="flex flex-wrap gap-2 mb-5">
            {PROTAG_AGES.map(a => (
              <Pill key={a.v} active={filters.protag_age === a.v} onClick={() => toggleScalar("protag_age", a.v)}>
                {a.label}
              </Pill>
            ))}
          </div>

          <Label>Genre du protagoniste</Label>
          <div className="flex flex-wrap gap-2 mb-5">
            {PROTAG_GENRES.map(g => (
              <Pill key={g.v} active={filters.protag_genre === g.v} onClick={() => toggleScalar("protag_genre", g.v)}>
                {g.label}
              </Pill>
            ))}
          </div>

          <Label>Type d'intrigue</Label>
          <div className="flex flex-wrap gap-2">
            {INTRIGUES.map(i => (
              <Pill key={i.v} active={filters.intrigues.includes(i.v)} onClick={() => toggleIntrigue(i.v)}>
                {i.e} {i.label}
              </Pill>
            ))}
          </div>
        </div>
      )}

      {/* Results */}
      {!hasAnyFilter && (
        <div className="py-12 text-center">
          <div className="text-[36px] mb-3">🧭</div>
          <p className="text-[15px] font-body mb-8" style={{ color: "var(--text-tertiary)" }}>
            Choisis une ambiance ou un type d'intrigue pour commencer.
          </p>
          <Label>Raccourcis</Label>
          <div className="flex flex-wrap gap-2 justify-center">
            {SHORTCUTS.map(s => (
              <button
                key={s.label}
                onClick={() => applyShortcut(s)}
                className="px-4 py-2.5 rounded-[20px] text-[13px] font-body bg-transparent cursor-pointer transition-colors duration-150 hover:opacity-80"
                style={{ color: "var(--text-secondary)", border: "1.5px solid var(--border-default)" }}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {hasAnyFilter && isLoading && (
        <div className="py-12 text-center">
          <div className="text-[14px] font-body" style={{ color: "var(--text-muted)" }}>Recherche...</div>
        </div>
      )}

      {hasAnyFilter && !isLoading && books.length === 0 && (
        <div className="py-12 text-center">
          <div className="text-[36px] mb-3">🔭</div>
          <p className="text-[15px] font-body mb-1" style={{ color: "var(--text-tertiary)" }}>
            Aucun livre ne correspond à cette combinaison.
          </p>
          <p className="text-[13px] font-body" style={{ color: "var(--text-muted)" }}>
            Essaie de retirer un filtre pour élargir les résultats.
          </p>
        </div>
      )}

      {hasAnyFilter && !isLoading && books.length > 0 && (
        <div>
          <div className="flex items-baseline justify-between mb-4">
            <span className="font-display italic text-[22px]" style={{ color: "var(--text-primary)" }}>
              {books.length} livre{books.length > 1 ? "s" : ""} trouvé{books.length > 1 ? "s" : ""}
            </span>
            <span className="text-[12px] font-body" style={{ color: "var(--text-muted)" }}>par pertinence</span>
          </div>
          <div
            className="grid gap-y-6 gap-x-5"
            style={{ gridTemplateColumns: "repeat(auto-fill, 110px)" }}
          >
            {books.map((b, i) => {
              const book = normalizeBook(b);
              return (
                <div
                  key={book.id}
                  className="cursor-pointer"
                  style={{ animation: `boussoleCardIn 300ms ease-out ${i * 60}ms both` }}
                  onClick={() => navigate(`/livre/${book.slug}`)}
                >
                  <Img book={book} w={110} h={165} />
                  <div
                    className="mt-1.5 text-[13.5px] font-display leading-snug"
                    style={{
                      color: "var(--text-primary)",
                      display: "-webkit-box",
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: "vertical",
                      overflow: "hidden",
                    }}
                  >
                    {book.t}
                  </div>
                  <div
                    className="text-[11px] font-body mt-0.5 truncate"
                    style={{ color: "var(--text-tertiary)" }}
                  >
                    {book.a}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
