import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useSearchParams, useNavigate, Link } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { searchBooks } from "../lib/googleBooks";
import { extractYear } from "../utils/extractYear";
import { importBook } from "../lib/importBook";
import Avatar from "../components/Avatar";

export default function SearchPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const query = searchParams.get("q") || "";

  const [localQuery, setLocalQuery] = useState(query);
  const [results, setResults] = useState([]);
  const [dilicomPage, setDilicomPage] = useState(1);
  const [dilicomTotal, setDilicomTotal] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [activeFilter, setActiveFilter] = useState("all");
  const [activeTab, setActiveTab] = useState("livres");
  const [users, setUsers] = useState([]);
  const [importing, setImporting] = useState(null);
  const inputRef = useRef(null);
  const navigate = useNavigate();

  // Sync localQuery when searchParams change (back/forward nav)
  useEffect(() => {
    setLocalQuery(query);
  }, [query]);

  // Initial search when query changes
  useEffect(() => {
    if (!query || query.length < 2) {
      setResults([]);
      setUsers([]);
      return;
    }

    setResults([]);
    setDilicomPage(1);
    setDilicomTotal(0);
    setHasMore(false);
    setLoading(true);
    setActiveFilter("all");

    searchBooks(query).then(books => {
      setResults(books);
      setLoading(false);
      // Check if Dilicom might have more
      const hasDilicom = books.some(b => b._source === "dilicom");
      if (hasDilicom) setHasMore(true);
    });

    // Search users in parallel
    supabase
      .from("users")
      .select("id, username, display_name, avatar_url, bio")
      .or(`username.ilike.%${query}%,display_name.ilike.%${query}%`)
      .limit(10)
      .then(({ data }) => setUsers(data || []));
  }, [query]);

  // Load more Dilicom results
  const loadMoreDilicom = useCallback(async () => {
    if (loadingMore || !hasMore) return;
    setLoadingMore(true);

    const nextPage = dilicomPage + 1;
    const { data, error } = await supabase.functions.invoke("dilicom-search", {
      body: { query, page: nextPage, limit: 30 },
    });

    if (!error && data?.results?.length > 0) {
      const existingIsbns = new Set(results.map(r => r.isbn13).filter(Boolean));
      const existingTitles = new Set(
        results.map(r => (r.title || "").toLowerCase().trim())
      );

      const newResults = data.results
        .filter(r => {
          if (r.isbn && existingIsbns.has(r.isbn)) return false;
          if (existingTitles.has((r.title || "").toLowerCase().trim())) return false;
          return true;
        })
        .map(r => ({
          _source: "dilicom",
          isbn13: r.isbn,
          title: r.title,
          authors: r.authors || [],
          publisher: r.publisher,
          publishedDate: r.publicationDate,
          coverUrl: r.coverLarge || r.coverMedium || null,
          pageCount: r.pages,
          description: r.description,
          _clilLabel: r.clilLabel,
          slug: null,
          dbId: null,
        }));

      setResults(prev => [...prev, ...newResults]);
      setDilicomPage(nextPage);
      setHasMore(data.total > nextPage * 30);
      setDilicomTotal(data.total);
    } else {
      setHasMore(false);
    }

    setLoadingMore(false);
  }, [query, dilicomPage, loadingMore, hasMore, results]);

  // Filters
  const availableGenres = useMemo(() => {
    const genres = new Set();
    results.forEach(r => {
      if (r._clilLabel) genres.add(r._clilLabel);
      if (Array.isArray(r.tags)) r.tags.forEach(t => genres.add(t));
    });
    return [...genres].slice(0, 8);
  }, [results]);

  const filteredResults = useMemo(() => {
    return results.filter(r => {
      if (activeFilter !== "all") {
        const genre = r._clilLabel || r.tags?.[0] || "";
        if (!genre.toLowerCase().includes(activeFilter.toLowerCase())) return false;
      }
      return true;
    });
  }, [results, activeFilter]);

  // Click handler
  const handleBookClick = async (book) => {
    if (importing) return;

    if (book._source === "db" && book.slug) {
      navigate(`/livre/${book.slug}`);
      return;
    }

    if (book.isbn13) {
      const { data: existing } = await supabase
        .from("books")
        .select("id, slug")
        .eq("isbn_13", book.isbn13)
        .maybeSingle();
      if (existing?.slug) {
        navigate(`/livre/${existing.slug}`);
        return;
      }
    }

    // Navigation optimiste + import background
    setImporting(book.isbn13 ?? book.title);
    navigate("/livre/importing", {
      state: {
        previewData: {
          title: book.title,
          authors: book.authors || [],
          coverUrl: book.coverUrl || null,
          publisher: book.publisher || null,
          publishedDate: book.publishedDate || null,
          pageCount: book.pageCount || null,
          description: book.description || null,
          isbn13: book.isbn13 || null,
        },
      },
    });

    importBook(book).then(imported => {
      setImporting(null);
      if (imported?.slug) navigate(`/livre/${imported.slug}`, { replace: true });
      else if (imported?.id) navigate(`/livre/${imported.id}`, { replace: true });
      else navigate("/", { replace: true });
    });
  };

  const handleSearch = (e) => {
    e.preventDefault();
    if (localQuery.trim().length < 2) return;
    setSearchParams({ q: localQuery.trim() });
  };

  return (
    <div>
      {/* Barre de recherche sticky */}
      <div
        className="py-3 sticky top-0 z-10"
        style={{
          backgroundColor: "var(--bg-primary)",
          borderBottom: "0.5px solid var(--border-default)",
        }}
      >
        <form onSubmit={handleSearch} className="flex gap-2 items-center">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="shrink-0 p-1 bg-transparent border-none cursor-pointer"
            style={{ color: "var(--text-tertiary)" }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M19 12H5M12 5l-7 7 7 7" />
            </svg>
          </button>
          <div
            className="flex-1 flex items-center gap-2 rounded-lg px-3 py-2.5"
            style={{
              backgroundColor: "var(--bg-surface)",
              border: "1px solid var(--border-default)",
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--text-tertiary)" strokeWidth="2" className="shrink-0">
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              ref={inputRef}
              value={localQuery}
              onChange={e => setLocalQuery(e.target.value)}
              className="flex-1 bg-transparent border-none outline-none font-body min-w-0"
              style={{ fontSize: 15, color: "var(--text-primary)" }}
              placeholder="Chercher des livres, auteurs, thèmes..."
              autoFocus
            />
            {localQuery && (
              <button
                type="button"
                onClick={() => { setLocalQuery(""); inputRef.current?.focus(); }}
                className="bg-transparent border-none cursor-pointer p-0.5 shrink-0"
                style={{ color: "var(--text-tertiary)" }}
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            )}
          </div>
        </form>
      </div>

      {/* Onglets */}
      <div className="flex" style={{ borderBottom: "0.5px solid var(--border-default)" }}>
        {["livres", "lecteurs"].map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className="px-4 text-[13px] font-body bg-transparent border-none cursor-pointer"
            style={{
              color: activeTab === tab ? "var(--text-primary)" : "var(--text-tertiary)",
              borderBottom: activeTab === tab ? "2px solid var(--text-primary)" : "2px solid transparent",
              paddingTop: 10,
              paddingBottom: 10,
            }}
          >
            {tab === "livres"
              ? `Livres${results.length > 0 ? ` \u00b7 ${filteredResults.length}` : ""}`
              : `Lecteurs${users.length > 0 ? ` \u00b7 ${users.length}` : ""}`}
          </button>
        ))}
      </div>

      {/* Filtres genres — onglet livres */}
      {activeTab === "livres" && availableGenres.length > 0 && (
        <div
          className="flex gap-2 py-3 overflow-x-auto"
          style={{ borderBottom: "0.5px solid var(--border-default)" }}
        >
          <button
            onClick={() => setActiveFilter("all")}
            className="shrink-0 px-3 py-1.5 rounded-full text-[12px] font-body cursor-pointer"
            style={{
              backgroundColor: activeFilter === "all" ? "var(--text-primary)" : "transparent",
              color: activeFilter === "all" ? "var(--bg-primary)" : "var(--text-secondary)",
              border: "0.5px solid var(--border-default)",
            }}
          >
            Tous
          </button>
          {availableGenres.map(genre => (
            <button
              key={genre}
              onClick={() => setActiveFilter(activeFilter === genre ? "all" : genre)}
              className="shrink-0 px-3 py-1.5 rounded-full text-[12px] font-body cursor-pointer"
              style={{
                backgroundColor: activeFilter === genre ? "var(--text-primary)" : "transparent",
                color: activeFilter === genre ? "var(--bg-primary)" : "var(--text-secondary)",
                border: "0.5px solid var(--border-default)",
              }}
            >
              {genre}
            </button>
          ))}
        </div>
      )}

      {/* Résultats livres */}
      {activeTab === "livres" && (
        <div>
          {/* Skeleton */}
          {loading && (
            <div className="flex flex-col">
              {[1, 2, 3, 4, 5].map(i => (
                <div
                  key={i}
                  className="flex gap-3 py-3"
                  style={{ borderBottom: "0.5px solid var(--border-default)" }}
                >
                  <div className="sk rounded-sm shrink-0" style={{ width: 46, height: 69 }} />
                  <div className="flex-1 flex flex-col gap-2 pt-1">
                    <div className="sk rounded-sm" style={{ width: `${50 + i * 8}%`, height: 13 }} />
                    <div className="sk rounded-sm" style={{ width: `${30 + i * 5}%`, height: 11 }} />
                    <div className="sk rounded-sm" style={{ width: "85%", height: 11 }} />
                    <div className="sk rounded-sm" style={{ width: "70%", height: 11 }} />
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Liste */}
          {!loading &&
            filteredResults.map((book, i) => {
              const isImporting = importing === (book.isbn13 ?? book.title);
              const year = extractYear(book.publishedDate || book.publication_date);
              const authors = Array.isArray(book.authors)
                ? book.authors.join(", ")
                : book.authors || "";

              return (
                <div
                  key={book.isbn13 || book.dbId || `${book.title}-${i}`}
                  onClick={() => handleBookClick(book)}
                  className="flex gap-3 py-3 cursor-pointer transition-opacity duration-100"
                  style={{
                    borderBottom: "0.5px solid var(--border-default)",
                    opacity: isImporting ? 0.5 : 1,
                  }}
                >
                  {book.coverUrl || book.cover_url ? (
                    <img
                      src={book.coverUrl || book.cover_url}
                      alt=""
                      className="rounded-sm shrink-0 object-cover"
                      style={{ width: 46, height: 69 }}
                    />
                  ) : (
                    <div
                      className="rounded-sm shrink-0"
                      style={{ width: 46, height: 69, backgroundColor: "var(--cover-fallback)" }}
                    />
                  )}
                  <div className="flex-1 min-w-0 pt-0.5">
                    <div
                      className="text-[14px] font-medium font-body truncate"
                      style={{ color: "var(--text-primary)" }}
                    >
                      {book.title}
                    </div>
                    <div
                      className="text-[12px] font-body truncate mt-0.5"
                      style={{ color: "var(--text-secondary)" }}
                    >
                      {authors}
                      {year ? ` \u00b7 ${year}` : ""}
                      {book.publisher ? ` \u00b7 ${book.publisher}` : ""}
                    </div>
                    {book.description && (
                      <div
                        className="text-[12px] font-body mt-1 leading-relaxed"
                        style={{
                          color: "var(--text-tertiary)",
                          display: "-webkit-box",
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: "vertical",
                          overflow: "hidden",
                        }}
                      >
                        {book.description}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}

          {/* Aucun résultat */}
          {!loading && filteredResults.length === 0 && query.length >= 2 && (
            <div
              className="py-16 text-center text-[13px] font-body"
              style={{ color: "var(--text-tertiary)" }}
            >
              Aucun résultat pour « {query} »
            </div>
          )}

          {/* Charger plus */}
          {!loading && hasMore && (
            <div className="py-6 flex justify-center">
              <button
                onClick={loadMoreDilicom}
                disabled={loadingMore}
                className="text-[13px] font-body px-5 py-2 rounded-full bg-transparent"
                style={{
                  border: "0.5px solid var(--border-default)",
                  color: loadingMore ? "var(--text-tertiary)" : "var(--text-secondary)",
                  cursor: loadingMore ? "default" : "pointer",
                }}
              >
                {loadingMore
                  ? "Chargement\u2026"
                  : `Charger plus${dilicomTotal ? ` \u00b7 ${dilicomTotal} résultats` : ""}`}
              </button>
            </div>
          )}
        </div>
      )}

      {/* Résultats lecteurs */}
      {activeTab === "lecteurs" && (
        <div>
          {users.length === 0 ? (
            <div
              className="py-16 text-center text-[13px] font-body"
              style={{ color: "var(--text-tertiary)" }}
            >
              {query.length >= 2
                ? `Aucun lecteur trouvé pour « ${query} »`
                : "Tape un nom pour chercher des lecteurs"}
            </div>
          ) : (
            users.map(u => (
              <Link
                key={u.id}
                to={`/${u.username}`}
                className="flex gap-3 py-3 no-underline"
                style={{ borderBottom: "0.5px solid var(--border-default)" }}
              >
                <Avatar
                  i={u.display_name || u.username || "?"}
                  s={40}
                  src={u.avatar_url}
                />
                <div className="flex-1 min-w-0 pt-1">
                  <div
                    className="text-[14px] font-medium font-body"
                    style={{ color: "var(--text-primary)" }}
                  >
                    {u.display_name || u.username}
                  </div>
                  <div
                    className="text-[12px] font-body"
                    style={{ color: "var(--text-tertiary)" }}
                  >
                    @{u.username}
                  </div>
                  {u.bio && (
                    <div
                      className="text-[12px] font-body mt-0.5 truncate"
                      style={{ color: "var(--text-tertiary)" }}
                    >
                      {u.bio}
                    </div>
                  )}
                </div>
              </Link>
            ))
          )}
        </div>
      )}
    </div>
  );
}
