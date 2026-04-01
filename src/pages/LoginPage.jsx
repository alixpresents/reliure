import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { useAuth } from "../lib/AuthContext";

export default function LoginPage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  // Redirect if already logged in
  useEffect(() => {
    if (user) {
      navigate("/explorer", { replace: true });
    }
  }, [user, navigate]);

  const [mode, setMode] = useState("magic"); // "magic" | "password"
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState(null);

  const handleMagicLink = async e => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const { error: err } = await supabase.auth.signInWithOtp({ email });

    setLoading(false);
    if (err) {
      setError(err.message);
    } else {
      setSent(true);
    }
  };

  const handlePassword = async e => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const { error: err } = await supabase.auth.signInWithPassword({ email, password });

    setLoading(false);
    if (err) {
      setError("Email ou mot de passe incorrect.");
    }
  };

  const switchMode = (m) => {
    setMode(m);
    setError(null);
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4" style={{ backgroundColor: "var(--bg-primary)" }}>
      <div className="w-full max-w-[400px]">
        {/* Logo */}
        <div className="flex items-center justify-center gap-1.5 mb-8">
          <span className="text-[20px] font-bold tracking-tight font-body" style={{ color: "var(--text-primary)" }}>reliure</span>
          <span className="text-[8px] font-semibold rounded-[3px] px-[5px] py-[2px] font-body" style={{ backgroundColor: "var(--text-primary)", color: "var(--bg-primary)" }}>
            BETA
          </span>
        </div>

        {sent ? (
          /* Magic link sent */
          <div className="text-center">
            <div className="flex justify-center mb-4">
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="10" fill="var(--color-success)" />
                <path d="M8 12.5l2.5 2.5L16 9.5" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <div className="text-sm font-medium font-body" style={{ color: "var(--text-primary)" }}>Vérifie ta boîte mail !</div>
            <div className="text-[13px] font-body mt-1" style={{ color: "var(--text-tertiary)" }}>
              Un lien de connexion a été envoyé à <span className="font-medium" style={{ color: "var(--text-primary)" }}>{email}</span>
            </div>
          </div>
        ) : (
          <>
            <h1 className="font-display italic text-[26px] font-normal text-center mb-6 leading-tight">
              Connecte-toi
            </h1>

            {/* Mode toggle */}
            <div className="flex justify-center mb-6">
              <div className="flex bg-surface rounded-lg p-0.5 gap-0.5" style={{ borderWidth: 1, borderStyle: "solid", borderColor: "var(--border-default)" }}>
                <button
                  type="button"
                  onClick={() => switchMode("magic")}
                  className={`px-4 py-1.5 rounded-md text-[13px] font-body transition-all duration-150 ${
                    mode === "magic"
                      ? "font-medium shadow-sm"
                      : "hover:opacity-80"
                  }`}
                  style={mode === "magic"
                    ? { backgroundColor: "var(--bg-elevated)", color: "var(--text-primary)", borderWidth: 1, borderStyle: "solid", borderColor: "var(--border-default)" }
                    : { color: "var(--text-tertiary)" }
                  }
                >
                  Lien magique
                </button>
                <button
                  type="button"
                  onClick={() => switchMode("password")}
                  className={`px-4 py-1.5 rounded-md text-[13px] font-body transition-all duration-150 ${
                    mode === "password"
                      ? "font-medium shadow-sm"
                      : "hover:opacity-80"
                  }`}
                  style={mode === "password"
                    ? { backgroundColor: "var(--bg-elevated)", color: "var(--text-primary)", borderWidth: 1, borderStyle: "solid", borderColor: "var(--border-default)" }
                    : { color: "var(--text-tertiary)" }
                  }
                >
                  Mot de passe
                </button>
              </div>
            </div>

            {mode === "magic" ? (
              <form onSubmit={handleMagicLink}>
                <p className="text-[13px] text-center mb-6 font-body" style={{ color: "var(--text-tertiary)" }}>
                  Entre ton email pour recevoir un lien de connexion.
                </p>
                <div className="mb-4">
                  <input
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="ton@email.com"
                    autoFocus
                    className="w-full bg-surface rounded-lg py-3 px-4 outline-none text-base md:text-sm font-body transition-[border] duration-150"
                    style={{ borderWidth: 1, borderStyle: "solid", borderColor: "var(--border-default)", color: "var(--text-primary)" }}
                    onFocus={e => e.target.style.borderColor = "var(--text-tertiary)"}
                    onBlur={e => e.target.style.borderColor = "var(--border-default)"}
                  />
                </div>

                {error && (
                  <div className="text-xs text-spoiler font-body mb-3">{error}</div>
                )}

                <button
                  type="submit"
                  disabled={!email || loading}
                  className={`w-full py-3.5 rounded-lg text-[15px] font-medium font-body border-none transition-all duration-200 ${
                    email && !loading
                      ? "cursor-pointer hover:opacity-80"
                      : "bg-avatar-bg cursor-not-allowed"
                  }`}
                  style={email && !loading
                    ? { backgroundColor: "var(--text-primary)", color: "var(--bg-primary)" }
                    : { color: "var(--text-tertiary)" }
                  }
                >
                  {loading ? "Envoi en cours..." : "Envoyer le lien"}
                </button>
              </form>
            ) : (
              <form onSubmit={handlePassword}>
                <p className="text-[13px] text-center mb-6 font-body" style={{ color: "var(--text-tertiary)" }}>
                  Connecte-toi avec tes identifiants bêta.
                </p>
                <div className="mb-3">
                  <input
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="ton@email.com"
                    autoFocus
                    className="w-full bg-surface rounded-lg py-3 px-4 outline-none text-base md:text-sm font-body transition-[border] duration-150"
                    style={{ borderWidth: 1, borderStyle: "solid", borderColor: "var(--border-default)", color: "var(--text-primary)" }}
                    onFocus={e => e.target.style.borderColor = "var(--text-tertiary)"}
                    onBlur={e => e.target.style.borderColor = "var(--border-default)"}
                  />
                </div>
                <div className="mb-4">
                  <input
                    type="password"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="Mot de passe"
                    className="w-full bg-surface rounded-lg py-3 px-4 outline-none text-base md:text-sm font-body transition-[border] duration-150"
                    style={{ borderWidth: 1, borderStyle: "solid", borderColor: "var(--border-default)", color: "var(--text-primary)" }}
                    onFocus={e => e.target.style.borderColor = "var(--text-tertiary)"}
                    onBlur={e => e.target.style.borderColor = "var(--border-default)"}
                  />
                </div>

                {error && (
                  <div className="text-xs text-spoiler font-body mb-3">{error}</div>
                )}

                <button
                  type="submit"
                  disabled={!email || !password || loading}
                  className={`w-full py-3.5 rounded-lg text-[15px] font-medium font-body border-none transition-all duration-200 ${
                    email && password && !loading
                      ? "cursor-pointer hover:opacity-80"
                      : "bg-avatar-bg cursor-not-allowed"
                  }`}
                  style={email && password && !loading
                    ? { backgroundColor: "var(--text-primary)", color: "var(--bg-primary)" }
                    : { color: "var(--text-tertiary)" }
                  }
                >
                  {loading ? "Connexion..." : "Se connecter"}
                </button>
              </form>
            )}
          </>
        )}
      </div>
    </div>
  );
}
