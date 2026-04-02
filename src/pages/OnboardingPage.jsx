import { useState, useEffect, useRef } from "react";
import { useSearchParams } from "react-router-dom";
import Img from "../components/Img";
import OnboardingProgress from "../components/OnboardingProgress";
import CoverBackdrop from "../components/CoverBackdrop";
import { supabase } from "../lib/supabase";
import { useAuth } from "../lib/AuthContext";
import { searchBooks } from "../lib/googleBooks";
import { importBook } from "../lib/importBook";
import { RESERVED_USERNAMES } from "../constants/reserved-usernames";

function PickedBook({ book, onRemove }) {
  return (
    <div className="flex flex-col items-center">
      <div className="relative group">
        <Img book={book} w={72} h={108} />
        <button
          onClick={onRemove}
          className="absolute -top-2 -right-2 w-5 h-5 rounded-full text-xs leading-none flex items-center justify-center cursor-pointer transition-all duration-150 shadow-[0_1px_3px_rgba(0,0,0,0.08)] hover:opacity-80"
          style={{ backgroundColor: "var(--bg-elevated)", borderWidth: 1, borderStyle: "solid", borderColor: "var(--border-default)", color: "var(--text-tertiary)" }}
        >
          ×
        </button>
      </div>
      <div className="text-[11px] font-medium mt-2 font-body text-center max-w-[72px] truncate">{book.t}</div>
      <div className="text-[10px] font-body" style={{ color: "var(--text-tertiary)" }}>{book.a.split(" ").pop()}</div>
    </div>
  );
}

/* ─── Step 0: Username ─── */
function StepUsername({ username, setUsername, bio, setBio, onNext, error: externalError, userEmail, usernameParam }) {
  const [status, setStatus] = useState(null); // null | 'available' | 'reserved_for_you' | 'reserved' | 'taken' | 'invalid'
  const [saving, setSaving] = useState(false);
  const timer = useRef(null);

  // Pre-fill from ?username= query param — waits for email (needed for reserved_for_you)
  useEffect(() => {
    if (!usernameParam || !userEmail) return;
    setUsername(usernameParam.toLowerCase().replace(/[^a-z0-9_]/g, ""));
  }, [usernameParam, userEmail]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    clearTimeout(timer.current);
    if (username.length < 2) { setStatus(null); return; }
    if (!/^[a-z0-9_]+$/.test(username)) { setStatus("invalid"); return; }
    if (RESERVED_USERNAMES.has(username)) { setStatus("reserved"); return; }
    timer.current = setTimeout(async () => {
      const { data } = await supabase.rpc("check_username_availability", {
        p_username: username.toLowerCase(),
        p_email: userEmail || "",
      });
      setStatus(data || "available");
    }, 300);
    return () => clearTimeout(timer.current);
  }, [username, userEmail]);

  const valid = username.length >= 2 && (status === "available" || status === "reserved_for_you") && !saving;

  const borderColor = (status === "available" || status === "reserved_for_you") ? "border-[var(--color-success)]"
    : (status === "taken" || status === "reserved" || status === "invalid") ? "border-spoiler"
    : "border-[var(--border-default)] focus-within:border-[var(--text-primary)]";

  const handleNext = async () => {
    setSaving(true);
    await onNext();
    setSaving(false);
  };

  return (
    <div>
      <h1 className="font-display italic text-[24px] font-normal text-center mb-2 leading-tight">
        Comment on t'appelle ?
      </h1>
      <p className="text-[13px] text-center mb-10 font-body" style={{ color: "var(--text-tertiary)" }}>
        Ton @pseudo est unique. Tu pourras partager ton profil avec ce lien.
      </p>

      <div className="mb-6">
        <label className="text-xs font-medium mb-1.5 block font-body" style={{ color: "var(--text-tertiary)" }}>Pseudo</label>
        <div className={`flex items-center border-b-[1.5px] transition-colors duration-200 ${borderColor}`}>
          <span className="text-[17px] font-body" style={{ color: "var(--text-tertiary)" }}>@</span>
          <input
            autoFocus
            value={username}
            onChange={e => setUsername(e.target.value.replace(/\s/g, "").toLowerCase())}
            placeholder="tonpseudo"
            className="w-full py-3 px-1 text-[17px] bg-transparent border-none outline-none font-body"
            style={{ color: "var(--text-primary)" }}
          />
          {(status === "available" || status === "reserved_for_you") && <span className="text-sm font-medium shrink-0" style={{ color: "var(--color-success)" }}>✓</span>}
        </div>
        {status === "reserved_for_you" && (
          <p className="text-xs mt-1.5 font-body" style={{ color: "var(--color-success)" }}>
            Ce pseudo t'est réservé ✦
          </p>
        )}
        {(status === "taken" || status === "reserved" || status === "invalid" || externalError) && (
          <p className="text-xs text-spoiler mt-1.5 font-body">
            {externalError || (status === "reserved" ? "Ce pseudo est réservé" : status === "invalid" ? "Lettres minuscules, chiffres et _ uniquement" : "Ce pseudo est déjà pris")}
          </p>
        )}
      </div>

      <div className="mb-10">
        <label className="text-xs font-medium mb-1.5 block font-body" style={{ color: "var(--text-tertiary)" }}>
          Bio <span className="font-normal" style={{ color: "var(--text-tertiary)" }}>(optionnel)</span>
        </label>
        <input
          value={bio}
          onChange={e => setBio(e.target.value)}
          placeholder="Lecteur compulsif, amateur de poésie..."
          maxLength={120}
          className="w-full py-3 text-base md:text-[15px] bg-transparent border-none border-b-[1.5px] outline-none font-body transition-colors duration-200"
          style={{ borderColor: "var(--border-default)", color: "var(--text-primary)" }}
          onFocus={e => e.target.style.borderColor = "var(--text-primary)"}
          onBlur={e => e.target.style.borderColor = "var(--border-default)"}
        />
      </div>

      <button
        onClick={handleNext}
        disabled={!valid}
        className={`w-full py-3.5 rounded-lg text-[15px] font-medium font-body border-none transition-all duration-200 ${
          valid
            ? "cursor-pointer hover:opacity-80"
            : "bg-avatar-bg cursor-not-allowed"
        }`}
        style={valid
          ? { backgroundColor: "var(--text-primary)", color: "var(--bg-primary)" }
          : { color: "var(--text-tertiary)" }
        }
      >
        {saving ? "Création..." : "Continuer"}
      </button>
    </div>
  );
}

/* ─── Step 1: Pick books ─── */
function StepBooks({ picks, setPicks, onFinish, onSkip }) {
  const [q, setQ] = useState("");
  const [saving, setSaving] = useState(false);
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const searchTimer = useRef(null);

  useEffect(() => {
    clearTimeout(searchTimer.current);
    if (q.length < 2) { setResults([]); setSearching(false); return; }
    setSearching(true);
    searchTimer.current = setTimeout(async () => {
      const res = await searchBooks(q);
      setResults(res);
      setSearching(false);
    }, 400);
    return () => clearTimeout(searchTimer.current);
  }, [q]);

  const addBook = gb => {
    if (picks.length < 5) {
      const book = { id: gb.googleId || gb.dbId, t: gb.title, a: gb.authors.join(", "), c: gb.coverUrl, y: gb.publishedDate ? parseInt(gb.publishedDate) : null, p: gb.pageCount, slug: gb.slug, _google: gb._source === "google" ? gb : null, _supabase: gb._source === "db" ? gb : null };
      setPicks([...picks, { book }]);
      setQ("");
      setResults([]);
    }
  };

  const removeBook = id => {
    setPicks(picks.filter(p => p.book.id !== id));
  };

  const hasBooks = picks.length > 0;
  const remaining = Math.max(0, 3 - picks.length);

  const handleFinish = async () => {
    setSaving(true);
    await onFinish();
    setSaving(false);
  };

  return (
    <div>
      <h1 className="font-display italic text-[24px] font-normal text-center mb-2 leading-tight">
        Quels livres t'ont marqué ?
      </h1>
      <p className="text-[13px] text-center mb-4 font-body" style={{ color: "var(--text-tertiary)" }}>
        Tes lectures récentes, tes classiques, tes coups de cœur — ce qui te représente.
      </p>

      {/* Feedback progressif */}
      {hasBooks && (
        <div className="text-center mb-5">
          {picks.length < 3 ? (
            <span
              className="inline-block text-[12px] font-body px-3 py-1 rounded-full"
              style={{ backgroundColor: "var(--tag-bg)", color: "var(--text-tertiary)" }}
            >
              Beau début ! Encore {remaining} pour un profil complet.
            </span>
          ) : (
            <span
              className="inline-block text-[12px] font-body px-3 py-1 rounded-full"
              style={{ backgroundColor: "color-mix(in srgb, var(--color-success) 10%, transparent)", color: "var(--color-success)" }}
            >
              {picks.length < 5 ? `✓ Ton profil est prêt — tu peux en ajouter ${5 - picks.length} de plus` : "✓ Parfait !"}
            </span>
          )}
        </div>
      )}

      {picks.length < 5 && (
        <div className="mb-6 relative">
          <div className="bg-surface rounded-lg py-[11px] px-4 flex items-center gap-2.5 transition-[border] duration-150" style={{ borderWidth: 1, borderStyle: "solid", borderColor: "var(--border-default)" }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--border-subtle)" strokeWidth="2" className="shrink-0">
              <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              value={q}
              onChange={e => setQ(e.target.value)}
              placeholder="Chercher un livre..."
              className="bg-transparent border-none outline-none text-base md:text-sm w-full font-body"
              style={{ color: "var(--text-primary)" }}
            />
            {q && (
              <button
                onClick={() => setQ("")}
                className="bg-transparent border-none cursor-pointer text-sm hover:opacity-80"
                style={{ color: "var(--text-tertiary)" }}
              >
                ×
              </button>
            )}
          </div>
          {searching && (
            <div className="absolute left-0 right-0 mt-1 py-3 text-center text-[13px] font-body" style={{ color: "var(--text-tertiary)" }}>Recherche...</div>
          )}
          {!searching && results.length > 0 && (
            <div className="absolute left-0 right-0 rounded-lg mt-1 overflow-hidden z-10 shadow-[0_4px_16px_rgba(0,0,0,0.06)]" style={{ borderWidth: 1, borderStyle: "solid", borderColor: "var(--border-default)", backgroundColor: "var(--bg-elevated)" }}>
              {results.slice(0, 5).map(gb => (
                <div
                  key={gb.googleId || gb.dbId}
                  onClick={() => addBook(gb)}
                  className="flex items-center gap-3 px-3 py-2.5 cursor-pointer hover:bg-surface transition-colors duration-100 border-b border-border-light last:border-b-0"
                >
                  {gb.coverUrl ? (
                    <img src={gb.coverUrl} alt="" className="w-8 h-12 object-cover rounded-sm shrink-0 bg-cover-fallback" />
                  ) : (
                    <div className="w-8 h-12 rounded-sm bg-cover-fallback shrink-0" />
                  )}
                  <div className="min-w-0">
                    <div className="text-sm font-medium font-body truncate">{gb.title}</div>
                    <div className="text-xs font-body" style={{ color: "var(--text-tertiary)" }}>{gb.authors.join(", ")}{gb.publishedDate ? ` · ${gb.publishedDate.slice(0, 4)}` : ""}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {hasBooks && (
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs font-medium font-body" style={{ color: "var(--text-tertiary)" }}>Tes livres</span>
            <span className="text-xs font-body" style={{ color: "var(--text-tertiary)" }}>{picks.length}/5</span>
          </div>
          <div className="flex justify-center gap-4 flex-wrap">
            {picks.map(p => (
              <PickedBook
                key={p.book.id}
                book={p.book}
                onRemove={() => removeBook(p.book.id)}
              />
            ))}
          </div>
        </div>
      )}

      <button
        onClick={handleFinish}
        disabled={!hasBooks || saving}
        className={`w-full py-3.5 rounded-lg text-[15px] font-medium font-body border-none transition-all duration-200 mt-6 ${
          hasBooks && !saving
            ? "cursor-pointer hover:opacity-80"
            : "bg-avatar-bg cursor-not-allowed"
        }`}
        style={hasBooks && !saving
          ? { backgroundColor: "var(--text-primary)", color: "var(--bg-primary)" }
          : { color: "var(--text-tertiary)" }
        }
      >
        {saving ? "Ajout en cours..." : hasBooks ? "Voir mon profil →" : "Ajoute au moins un livre"}
      </button>

      <button
        onClick={onSkip}
        className="w-full mt-3 py-2 bg-transparent border-none text-[13px] cursor-pointer font-body hover:opacity-80 transition-colors duration-150"
        style={{ color: "var(--text-tertiary)" }}
      >
        Passer — j'ajouterai mes livres plus tard
      </button>
    </div>
  );
}

/* ─── Step 2: Profile preview ─── */
function StepProfilePreview({ username, picks, onExplore }) {
  return (
    <div className="text-center">
      {/* Avatar initiales */}
      <div className="flex justify-center mb-3">
        <div
          className="w-16 h-16 rounded-full flex items-center justify-center text-[22px] font-medium font-body"
          style={{ backgroundColor: "var(--avatar-bg)", color: "var(--text-tertiary)" }}
        >
          {username.charAt(0).toUpperCase()}
        </div>
      </div>

      <h1 className="font-display italic text-[24px] font-normal mb-1 leading-tight">
        Bienvenue, @{username}
      </h1>
      <p className="text-[13px] font-body mb-8" style={{ color: "var(--text-tertiary)" }}>
        Ta bibliothèque prend forme.
      </p>

      {/* Mini preview des couvertures */}
      {picks.length > 0 && (
        <div className="rounded-xl p-5 mb-8" style={{ backgroundColor: "var(--bg-surface)", border: "1px solid var(--border-default)" }}>
          <div
            className="text-[11px] font-semibold mb-3 text-left font-body"
            style={{ color: "var(--text-tertiary)", textTransform: "uppercase", letterSpacing: "0.1em" }}
          >
            Bibliothèque
          </div>
          <div className="flex justify-center gap-3 flex-wrap">
            {picks.map(p => (
              <Img key={p.book.id} book={p.book} w={56} h={84} />
            ))}
          </div>
        </div>
      )}

      <button
        onClick={onExplore}
        className="w-full py-3.5 rounded-lg text-[15px] font-medium font-body border-none cursor-pointer transition-all duration-200 hover:opacity-90"
        style={{ backgroundColor: "var(--text-primary)", color: "var(--bg-primary)" }}
      >
        Découvrir mon profil →
      </button>
    </div>
  );
}

/* ─── Main OnboardingPage ─── */
export default function OnboardingPage({ onComplete }) {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const usernameParam = searchParams.get("username") || "";
  const [step, setStep] = useState(0); // 0=username, 1=books, 2=preview
  const [username, setUsername] = useState("");
  const [bio, setBio] = useState("");
  const [picks, setPicks] = useState([]);
  const [leaving, setLeaving] = useState(false);
  const [step0Error, setStep0Error] = useState(null);

  const transition = (next) => {
    setLeaving(true);
    setTimeout(() => {
      next();
      setLeaving(false);
    }, 300);
  };

  const handleUsernameNext = async () => {
    setStep0Error(null);
    const uname = username.toLowerCase();
    const { error } = await supabase.from("users").insert({
      id: user.id,
      username: uname,
      display_name: username,
      bio: bio || null,
    });
    if (error) {
      if (error.code === "23505") {
        setStep0Error("Ce pseudo est déjà pris");
      } else {
        setStep0Error(error.message);
      }
      return;
    }
    // Claim reserved username if applicable
    await supabase.rpc("claim_reserved_username", { p_username: uname });
    transition(() => setStep(1));
  };

  const handleBooksFinish = async () => {
    const insertedBookIds = [];

    for (const pick of picks) {
      const gb = pick.book._google;
      const sb = pick.book._supabase;
      let book;

      if (gb) {
        book = await importBook(gb);
      } else if (sb) {
        book = { id: sb.dbId || sb.id || pick.book.id };
      } else {
        const { data } = await supabase.from("books").select("id").eq("title", pick.book.t).single();
        if (data) book = data;
      }

      if (!book?.id) continue;

      await supabase.from("reading_status").insert({
        user_id: user.id,
        book_id: book.id,
        status: "read",
      });

      insertedBookIds.push(book.id);
    }

    // Auto-fill user_favorites with first 4 books
    const favoritesToInsert = insertedBookIds.slice(0, 4).map((bookId, index) => ({
      user_id: user.id,
      book_id: bookId,
      position: index + 1,
    }));
    if (favoritesToInsert.length > 0) {
      await supabase.from("user_favorites").insert(favoritesToInsert);
    }

    localStorage.setItem("reliure_walkthrough_pending", "true");
    transition(() => setStep(2));
  };

  const handleSkip = () => {
    localStorage.setItem("reliure_walkthrough_pending", "true");
    transition(() => setStep(2));
  };

  // Progress bar: step 0→1/3, 1→2/3, 2→3/3
  const globalStep = step + 1;

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 relative" style={{ backgroundColor: "var(--bg-primary)" }}>
      <OnboardingProgress current={globalStep} />
      <CoverBackdrop />

      <div className="w-full max-w-[400px] relative z-10">
        {/* Logo */}
        <div className="flex items-center justify-center gap-1.5 mb-8">
          <span className="text-[20px] font-bold tracking-tight font-body" style={{ color: "var(--text-primary)" }}>reliure</span>
          <span className="text-[8px] font-semibold rounded-[3px] px-[5px] py-[2px] font-body" style={{ backgroundColor: "var(--text-primary)", color: "var(--bg-primary)" }}>
            BETA
          </span>
        </div>

        <div
          className={`transition-all duration-300 ${
            leaving ? "opacity-0 translate-y-3" : "opacity-100 translate-y-0"
          }`}
        >
          {step === 0 && (
            <StepUsername
              username={username}
              setUsername={setUsername}
              bio={bio}
              setBio={setBio}
              onNext={handleUsernameNext}
              error={step0Error}
              userEmail={user?.email}
              usernameParam={usernameParam}
            />
          )}
          {step === 1 && (
            <StepBooks
              picks={picks}
              setPicks={setPicks}
              onFinish={handleBooksFinish}
              onSkip={handleSkip}
            />
          )}
          {step === 2 && (
            <StepProfilePreview
              username={username}
              picks={picks}
              onExplore={() => onComplete(username.toLowerCase())}
            />
          )}
        </div>
      </div>
    </div>
  );
}
