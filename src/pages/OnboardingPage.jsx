import { useState, useEffect, useRef } from "react";
import { B } from "../data";
import Img from "../components/Img";
import InteractiveStars from "../components/InteractiveStars";
import OnboardingProgress from "../components/OnboardingProgress";
import { supabase } from "../lib/supabase";
import { useAuth } from "../lib/AuthContext";
import { searchBooks } from "../lib/googleBooks";
import { importBook } from "../lib/importBook";
import { RESERVED_USERNAMES } from "../constants/reserved-usernames";

function CoverBackdrop() {
  const covers = [...B, ...B.slice(0, 4)];
  return (
    <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
      <div className="absolute top-8 left-1/2 -translate-x-1/2 flex gap-4" style={{ width: "max-content" }}>
        {covers.map((b, i) => (
          <img
            key={i}
            src={b.c}
            alt=""
            className="w-[100px] h-[150px] rounded-[3px] object-cover opacity-[0.11] grayscale blur-[1px]"
          />
        ))}
      </div>
      <div className="absolute inset-0" style={{ background: "linear-gradient(to bottom, color-mix(in srgb, var(--bg-primary) 40%, transparent), color-mix(in srgb, var(--bg-primary) 90%, transparent), var(--bg-primary))" }} />
    </div>
  );
}

function PickedBook({ book, rating, onRate, onRemove }) {
  return (
    <div className="flex flex-col items-center">
      <div className="relative group">
        <Img book={book} w={90} h={135} />
        <button
          onClick={onRemove}
          className="absolute -top-2 -right-2 w-5 h-5 rounded-full text-xs leading-none flex items-center justify-center cursor-pointer transition-all duration-150 shadow-[0_1px_3px_rgba(0,0,0,0.08)] hover:opacity-80"
          style={{ backgroundColor: "var(--bg-elevated)", borderWidth: 1, borderStyle: "solid", borderColor: "var(--border-default)", color: "var(--text-tertiary)" }}
        >
          ×
        </button>
      </div>
      <div className="text-[11px] font-medium mt-2 font-body text-center max-w-[90px] truncate">{book.t}</div>
      <div className="text-[10px] font-body" style={{ color: "var(--text-tertiary)" }}>{book.a.split(" ").pop()}</div>
      <div className="mt-1.5">
        <InteractiveStars value={rating} onChange={onRate} size="text-xs" />
      </div>
    </div>
  );
}

/* ─── Step 0: Welcome ─── */
function StepWelcome({ onNext }) {
  return (
    <div className="text-center">
      <div className="flex items-center justify-center gap-1.5 mb-10">
        <span className="text-[28px] font-bold tracking-tight font-body" style={{ color: "var(--text-primary)" }}>reliure</span>
        <span className="text-[9px] font-semibold rounded-[3px] px-[5px] py-[2px] font-body" style={{ backgroundColor: "var(--text-primary)", color: "var(--bg-primary)" }}>
          BETA
        </span>
      </div>

      <h1 className="font-display italic text-[36px] font-normal mb-3 leading-tight">
        Bienvenue sur Reliure.
      </h1>
      <p className="text-[15px] font-body mb-10 leading-relaxed max-w-[340px] mx-auto" style={{ color: "var(--text-secondary)" }}>
        Ton journal de lecture. Tes coups de c&oelig;ur.<br />
        La communauté qui lit comme toi.
      </p>

      <button
        onClick={onNext}
        className="text-[14px] font-medium font-body px-7 py-3 rounded-lg border-none cursor-pointer hover:opacity-80 transition-colors duration-200"
        style={{ backgroundColor: "var(--text-primary)", color: "var(--bg-primary)" }}
      >
        Commencer →
      </button>
    </div>
  );
}

/* ─── Step 1: Username ─── */
function StepUsername({ username, setUsername, bio, setBio, onNext, error: externalError }) {
  const [status, setStatus] = useState(null);
  const [saving, setSaving] = useState(false);
  const timer = useRef(null);

  useEffect(() => {
    clearTimeout(timer.current);
    if (username.length < 2) { setStatus(null); return; }
    if (!/^[a-z0-9_]+$/.test(username)) { setStatus("invalid"); return; }
    if (RESERVED_USERNAMES.has(username)) { setStatus("reserved"); return; }
    timer.current = setTimeout(async () => {
      const { data, error } = await supabase
        .from("users")
        .select("username")
        .eq("username", username.toLowerCase())
        .single();
      if (error?.code === "PGRST116") setStatus("available");
      else if (data) setStatus("taken");
      else setStatus("available");
    }, 300);
    return () => clearTimeout(timer.current);
  }, [username]);

  const valid = username.length >= 2 && status === "available" && !saving;

  const borderColor = status === "available" ? "border-[var(--color-success)]"
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
          {status === "available" && <span className="text-sm font-medium shrink-0" style={{ color: "var(--color-success)" }}>✓</span>}
        </div>
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

/* ─── Step 2: Pick books ─── */
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
    if (picks.length < 3) {
      const book = { id: gb.googleId, t: gb.title, a: gb.authors.join(", "), c: gb.coverUrl, y: gb.publishedDate ? parseInt(gb.publishedDate) : null, p: gb.pageCount, _google: gb };
      setPicks([...picks, { book, rating: 0 }]);
      setQ("");
      setResults([]);
    }
  };

  const rateBook = (id, r) => {
    setPicks(picks.map(p => p.book.id === id ? { ...p, rating: r } : p));
  };

  const removeBook = id => {
    setPicks(picks.filter(p => p.book.id !== id));
  };

  const hasBooks = picks.length > 0;

  const handleFinish = async () => {
    setSaving(true);
    await onFinish();
    setSaving(false);
  };

  return (
    <div>
      <h1 className="font-display italic text-[24px] font-normal text-center mb-2 leading-tight">
        Qu'est-ce que tu lis en ce moment ?
      </h1>
      <p className="text-[13px] text-center mb-8 font-body" style={{ color: "var(--text-tertiary)" }}>
        Ajoute 1 à 3 livres. On commence avec ça — tu ajouteras le reste après.
      </p>

      {picks.length < 3 && (
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
                  key={gb.googleId}
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
            <span className="text-xs font-body" style={{ color: "var(--text-tertiary)" }}>{picks.length}/3</span>
          </div>
          <div className="flex justify-center gap-6">
            {picks.map(p => (
              <PickedBook
                key={p.book.id}
                book={p.book}
                rating={p.rating}
                onRate={r => rateBook(p.book.id, r)}
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
        {saving ? "Ajout en cours..." : "Continuer"}
      </button>

      <button
        onClick={onSkip}
        className="w-full mt-3 py-2 bg-transparent border-none text-[13px] cursor-pointer font-body hover:opacity-80 transition-colors duration-150"
        style={{ color: "var(--text-tertiary)" }}
      >
        Passer cette étape
      </button>
    </div>
  );
}

/* ─── Main OnboardingPage ─── */
export default function OnboardingPage({ onComplete }) {
  const { user } = useAuth();
  const [step, setStep] = useState(0); // 0=welcome, 1=username, 2=books
  const [username, setUsername] = useState("");
  const [bio, setBio] = useState("");
  const [picks, setPicks] = useState([]);
  const [leaving, setLeaving] = useState(false);
  const [step1Error, setStep1Error] = useState(null);

  const transition = (next) => {
    setLeaving(true);
    setTimeout(() => {
      next();
      setLeaving(false);
    }, 300);
  };

  const handleUsernameNext = async () => {
    setStep1Error(null);
    const { error } = await supabase.from("users").insert({
      id: user.id,
      username: username.toLowerCase(),
      display_name: username,
      bio: bio || null,
    });
    if (error) {
      if (error.code === "23505") {
        setStep1Error("Ce pseudo est déjà pris");
      } else {
        setStep1Error(error.message);
      }
      return;
    }
    transition(() => setStep(2));
  };

  const handleBooksFinish = async () => {
    for (const pick of picks) {
      const gb = pick.book._google;
      let book;

      if (gb) {
        book = await importBook(gb);
      } else {
        const { data } = await supabase.from("books").select("id").eq("title", pick.book.t).single();
        if (data) book = data;
      }

      if (!book?.id) continue;

      await supabase.from("reading_status").insert({
        user_id: user.id,
        book_id: book.id,
        status: "reading",
      });

      if (pick.rating > 0) {
        await supabase.from("reviews").insert({
          user_id: user.id,
          book_id: book.id,
          rating: pick.rating,
        });
      }
    }
    localStorage.setItem("reliure_walkthrough_pending", "true");
    onComplete(username.toLowerCase());
  };

  // Global step for progress bar: internal 0→1, 1→2, 2→3
  const globalStep = step + 1;

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 relative" style={{ backgroundColor: "var(--bg-primary)" }}>
      <OnboardingProgress current={globalStep} />
      <CoverBackdrop />

      <div className="w-full max-w-[400px] relative z-10">
        {/* Logo — hidden on welcome (it has its own) */}
        {step > 0 && (
          <div className="flex items-center justify-center gap-1.5 mb-8">
            <span className="text-[20px] font-bold tracking-tight font-body" style={{ color: "var(--text-primary)" }}>reliure</span>
            <span className="text-[8px] font-semibold rounded-[3px] px-[5px] py-[2px] font-body" style={{ backgroundColor: "var(--text-primary)", color: "var(--bg-primary)" }}>
              BETA
            </span>
          </div>
        )}

        <div
          className={`transition-all duration-300 ${
            leaving ? "opacity-0 translate-y-3" : "opacity-100 translate-y-0"
          }`}
        >
          {step === 0 && (
            <StepWelcome onNext={() => transition(() => setStep(1))} />
          )}
          {step === 1 && (
            <StepUsername
              username={username}
              setUsername={setUsername}
              bio={bio}
              setBio={setBio}
              onNext={handleUsernameNext}
              error={step1Error}
            />
          )}
          {step === 2 && (
            <StepBooks
              picks={picks}
              setPicks={setPicks}
              onFinish={handleBooksFinish}
              onSkip={() => {
                localStorage.setItem("reliure_walkthrough_pending", "true");
                onComplete(username.toLowerCase());
              }}
            />
          )}
        </div>
      </div>
    </div>
  );
}
