import { useState, useEffect, useRef } from "react";
import { B } from "../data";
import Img from "../components/Img";

const TAKEN = ["alix", "margaux", "theo", "camille", "samir"];

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
      <div className="absolute inset-0 bg-gradient-to-b from-white/40 via-white/90 to-white" />
    </div>
  );
}

function PickedBook({ book, rating, onRate, onRemove }) {
  const [hv, setHv] = useState(0);
  return (
    <div className="flex flex-col items-center">
      <div className="relative group">
        <Img book={book} w={90} h={135} />
        <button
          onClick={onRemove}
          className="absolute -top-2 -right-2 w-5 h-5 rounded-full bg-white border border-[#eee] text-[#767676] hover:text-[#1a1a1a] hover:border-[#ccc] text-xs leading-none flex items-center justify-center cursor-pointer transition-all duration-150 shadow-[0_1px_3px_rgba(0,0,0,0.08)]"
        >
          ×
        </button>
      </div>
      <div className="text-[11px] font-medium mt-2 font-body text-center max-w-[90px] truncate">{book.t}</div>
      <div className="text-[10px] text-[#737373] font-body">{book.a.split(" ").pop()}</div>
      <div className="flex gap-[1px] mt-1.5">
        {[1, 2, 3, 4, 5].map(n => (
          <span
            key={n}
            role="button"
            tabIndex={0}
            aria-label={`${n} étoile${n > 1 ? "s" : ""}`}
            onMouseEnter={() => setHv(n)}
            onMouseLeave={() => setHv(0)}
            onClick={() => onRate(n === rating ? 0 : n)}
            onKeyDown={e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onRate(n === rating ? 0 : n); } }}
            className={`cursor-pointer text-xs transition-all duration-150 inline-block ${n <= (hv || 0) ? "scale-110" : ""}`}
            style={{ color: n <= (hv || rating) ? "#D4883A" : "#ddd" }}
          >
            ★
          </span>
        ))}
      </div>
    </div>
  );
}

function Step1({ username, setUsername, bio, setBio, onNext }) {
  const [status, setStatus] = useState(null); // null | "available" | "taken"
  const timer = useRef(null);

  useEffect(() => {
    clearTimeout(timer.current);
    if (username.length < 2) { setStatus(null); return; }
    timer.current = setTimeout(() => {
      setStatus(TAKEN.includes(username) ? "taken" : "available");
    }, 300);
    return () => clearTimeout(timer.current);
  }, [username]);

  const valid = username.length >= 2 && status === "available";

  const borderColor = status === "available" ? "border-[#2E7D32]"
    : status === "taken" ? "border-spoiler"
    : "border-[#eee] focus-within:border-[#1a1a1a]";

  return (
    <div>
      <h1 className="font-display italic text-[24px] sm:text-[32px] font-normal text-center mb-2 leading-tight">
        Crée ton profil de lecteur
      </h1>
      <p className="text-[15px] text-[#737373] text-center mb-10 font-body">
        Rejoins une communauté de lecteurs passionnés.
      </p>

      <div className="mb-6">
        <label className="text-xs font-medium text-[#737373] mb-1.5 block font-body">Pseudo</label>
        <div className={`flex items-center border-b-[1.5px] transition-colors duration-200 ${borderColor}`}>
          <span className="text-[#767676] text-[17px] font-body">@</span>
          <input
            autoFocus
            value={username}
            onChange={e => setUsername(e.target.value.replace(/\s/g, "").toLowerCase())}
            placeholder="tonpseudo"
            className="w-full py-3 px-1 text-[17px] bg-transparent border-none outline-none text-[#1a1a1a] font-body"
          />
          {status === "available" && <span className="text-[#2E7D32] text-sm font-medium shrink-0">✓</span>}
        </div>
        {status === "taken" && (
          <p className="text-xs text-spoiler mt-1.5 font-body">Ce pseudo est déjà pris</p>
        )}
      </div>

      <div className="mb-10">
        <label className="text-xs font-medium text-[#737373] mb-1.5 block font-body">
          Bio <span className="font-normal text-[#767676]">(optionnel)</span>
        </label>
        <input
          value={bio}
          onChange={e => setBio(e.target.value)}
          placeholder="Lecteur compulsif, amateur de poésie..."
          maxLength={120}
          className="w-full py-3 text-[15px] bg-transparent border-none border-b-[1.5px] border-[#eee] outline-none text-[#1a1a1a] font-body focus:border-[#1a1a1a] transition-colors duration-200"
        />
      </div>

      <button
        onClick={onNext}
        disabled={!valid}
        className={`w-full py-3.5 rounded-lg text-[15px] font-medium font-body border-none transition-all duration-200 ${
          valid
            ? "bg-[#1a1a1a] text-white cursor-pointer hover:bg-[#333]"
            : "bg-avatar-bg text-[#767676] cursor-not-allowed"
        }`}
      >
        Continuer
      </button>
    </div>
  );
}

function Step2({ picks, setPicks, onFinish, onSkip }) {
  const [q, setQ] = useState("");
  const res = q.length > 1
    ? B.filter(b => !picks.some(p => p.book.id === b.id) && (b.t.toLowerCase().includes(q.toLowerCase()) || b.a.toLowerCase().includes(q.toLowerCase())))
    : [];

  const addBook = book => {
    if (picks.length < 3) {
      setPicks([...picks, { book, rating: 0 }]);
      setQ("");
    }
  };

  const rateBook = (id, r) => {
    setPicks(picks.map(p => p.book.id === id ? { ...p, rating: r } : p));
  };

  const removeBook = id => {
    setPicks(picks.filter(p => p.book.id !== id));
  };

  const hasBooks = picks.length > 0;

  return (
    <div>
      <h1 className="font-display italic text-[28px] sm:text-[32px] font-normal text-center mb-2 leading-tight">
        Qu'est-ce que tu lis en ce moment ?
      </h1>
      <p className="text-[15px] text-[#737373] text-center mb-8 font-body">
        Ajoute 1 à 3 livres pour démarrer.
      </p>

      {picks.length < 3 && (
        <div className="mb-6 relative">
          <div className="flex items-center gap-2.5 border-b-[1.5px] border-[#eee] focus-within:border-[#1a1a1a] transition-colors duration-200">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#bbb" strokeWidth="2">
              <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              value={q}
              onChange={e => setQ(e.target.value)}
              placeholder="Chercher un livre..."
              className="w-full py-3 text-[15px] bg-transparent border-none outline-none text-[#1a1a1a] font-body"
            />
            {q && (
              <button
                onClick={() => setQ("")}
                className="text-[#767676] hover:text-[#1a1a1a] bg-transparent border-none cursor-pointer text-sm"
              >
                ×
              </button>
            )}
          </div>
          {res.length > 0 && (
            <div className="absolute left-0 right-0 border border-[#eee] rounded-lg mt-1 overflow-hidden bg-white z-10 shadow-[0_4px_16px_rgba(0,0,0,0.06)]">
              {res.slice(0, 5).map(b => (
                <div
                  key={b.id}
                  onClick={() => addBook(b)}
                  className="flex items-center gap-3 px-3 py-2.5 cursor-pointer hover:bg-surface transition-colors duration-100 border-b border-border-light last:border-b-0"
                >
                  <Img book={b} w={32} h={48} />
                  <div className="min-w-0">
                    <div className="text-sm font-medium font-body truncate">{b.t}</div>
                    <div className="text-xs text-[#737373] font-body">{b.a}, {b.y}</div>
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
            <span className="text-xs font-medium text-[#737373] font-body">Tes livres</span>
            <span className="text-xs text-[#767676] font-body">{picks.length}/3</span>
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
        onClick={onFinish}
        disabled={!hasBooks}
        className={`w-full py-3.5 rounded-lg text-[15px] font-medium font-body border-none transition-all duration-200 mt-6 ${
          hasBooks
            ? "bg-[#1a1a1a] text-white cursor-pointer hover:bg-[#333]"
            : "bg-avatar-bg text-[#767676] cursor-not-allowed"
        }`}
      >
        Continuer
      </button>

      <button
        onClick={onSkip}
        className="w-full mt-3 py-2 bg-transparent border-none text-[13px] text-[#767676] cursor-pointer font-body hover:text-[#1a1a1a] transition-colors duration-150"
      >
        Passer cette étape
      </button>
    </div>
  );
}

export default function OnboardingPage({ onComplete }) {
  const [step, setStep] = useState(1);
  const [username, setUsername] = useState("");
  const [bio, setBio] = useState("");
  const [picks, setPicks] = useState([]);
  const [leaving, setLeaving] = useState(false);

  const transition = (next) => {
    setLeaving(true);
    setTimeout(() => {
      next();
      setLeaving(false);
    }, 300);
  };

  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center px-4 relative">
      <CoverBackdrop />

      <div className="w-full max-w-[400px] relative z-10">
        {/* Logo */}
        <div className="flex items-center justify-center gap-1.5 mb-8">
          <span className="text-[20px] font-bold tracking-tight font-body">reliure</span>
          <span className="text-[8px] font-semibold text-white bg-[#1a1a1a] rounded-[3px] px-[5px] py-[2px] font-body">
            BETA
          </span>
        </div>

        <div
          className={`transition-all duration-300 ${
            leaving ? "opacity-0 translate-y-3" : "opacity-100 translate-y-0"
          }`}
        >
          {step === 1 && (
            <Step1
              username={username}
              setUsername={setUsername}
              bio={bio}
              setBio={setBio}
              onNext={() => transition(() => setStep(2))}
            />
          )}
          {step === 2 && (
            <Step2
              picks={picks}
              setPicks={setPicks}
              onFinish={() => transition(() => onComplete())}
              onSkip={() => transition(() => onComplete())}
            />
          )}
        </div>
      </div>
    </div>
  );
}
