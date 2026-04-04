export function meta() {
  return [
    { title: "Se connecter — Reliure" },
    { name: "description", content: "Rejoignez Reliure, le réseau social de lecture francophone." },
    { property: "og:title", content: "Se connecter — Reliure" },
    { property: "og:description", content: "Rejoignez Reliure, le réseau social de lecture francophone." },
    { property: "og:type", content: "website" },
    { property: "og:site_name", content: "Reliure" },
    { name: "twitter:card", content: "summary_large_image" },
  ];
}

import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { useAuth } from "../lib/AuthContext";
import CoverBackdrop from "../components/CoverBackdrop";

export default function LoginPage() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!authLoading && user) navigate("/", { replace: true });
  }, [user, authLoading, navigate]);

  // Tant que l'auth charge OU que l'user est connecté (redirect imminent),
  // ne pas afficher le formulaire — évite le flash pendant getSession()
  if (authLoading || user) {
    return (
      <div className="flex items-center justify-center" style={{ minHeight: "100dvh", backgroundColor: "var(--bg-primary)" }}>
        <span className="text-[20px] font-bold tracking-tight font-body" style={{ color: "var(--text-primary)" }}>
          reliure
        </span>
      </div>
    );
  }

  const handleGoogleLogin = async () => {
    setLoading(true);
    const { error: err } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/explorer` },
    });
    if (err) {
      setError("Erreur de connexion Google. Réessaie.");
      setLoading(false);
    }
  };

  const handleSubmit = async e => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    if (showPassword) {
      const { error: err } = await supabase.auth.signInWithPassword({ email, password });
      setLoading(false);
      if (err) setError("Email ou mot de passe incorrect.");
    } else {
      const { error: err } = await supabase.auth.signInWithOtp({ email });
      setLoading(false);
      if (err) setError(err.message);
      else setSent(true);
    }
  };

  const isSubmittable = showPassword ? (email && password && !loading) : (email && !loading);

  const inputStyle = {
    borderWidth: 1, borderStyle: "solid", borderColor: "var(--border-default)", color: "var(--text-primary)",
  };

  return (
    <div className="relative flex items-center justify-center px-4" style={{ minHeight: "100dvh", backgroundColor: "var(--bg-primary)" }}>
      <CoverBackdrop />

      <div className="relative z-10 w-full max-w-[380px]">
        {/* Pitch */}
        <div className="text-center mb-10">
          <div className="flex items-center justify-center gap-1.5 mb-6">
            <span className="text-[28px] font-bold tracking-tight font-body" style={{ color: "var(--text-primary)" }}>reliure</span>
            <span className="text-[9px] font-semibold rounded-[3px] px-[5px] py-[2px] font-body" style={{ backgroundColor: "var(--text-primary)", color: "var(--bg-primary)" }}>
              BETA
            </span>
          </div>
          <h1 className="font-display text-[32px] font-normal mb-3 leading-tight">
            Ton journal de lecture, tes coups de cœur.
          </h1>
          <p className="text-[14px] font-body leading-relaxed" style={{ color: "var(--text-tertiary)" }}>
            Catalogue tes lectures. Partage tes critiques. Rejoins la communauté.
          </p>
        </div>

        {sent ? (
          <div className="text-center">
            <div className="flex justify-center mb-4">
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="10" fill="var(--color-success)" />
                <path d="M8 12.5l2.5 2.5L16 9.5" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <div className="text-sm font-medium font-body" style={{ color: "var(--text-primary)" }}>Vérifie ta boîte mail !</div>
            <div className="text-[13px] font-body mt-1" style={{ color: "var(--text-tertiary)" }}>
              Un lien de connexion a été envoyé à{" "}
              <span className="font-medium" style={{ color: "var(--text-primary)" }}>{email}</span>
            </div>
            <button
              type="button"
              onClick={() => { setSent(false); setEmail(""); }}
              className="mt-4 text-[13px] font-body underline underline-offset-3 cursor-pointer bg-transparent border-none"
              style={{ color: "var(--text-tertiary)" }}
            >
              Utiliser une autre adresse
            </button>
          </div>
        ) : (
          <>
            {/* Google OAuth */}
            <button
              type="button"
              onClick={handleGoogleLogin}
              disabled={loading}
              className="w-full flex items-center justify-center gap-3 py-3 rounded-lg font-body text-[15px] font-medium cursor-pointer transition-shadow duration-150 hover:shadow-md"
              style={{ borderWidth: "1.5px", borderStyle: "solid", borderColor: "var(--border-default)", backgroundColor: "var(--bg-primary)", color: "var(--text-primary)" }}
            >
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908C16.658 14.148 17.64 11.84 17.64 9.2z" fill="#4285F4" />
                <path d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.258c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z" fill="#34A853" />
                <path d="M3.964 10.707A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.707V4.961H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.039l3.007-2.332z" fill="#FBBC05" />
                <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.961L3.964 6.293C4.672 4.166 6.656 3.58 9 3.58z" fill="#EA4335" />
              </svg>
              Continuer avec Google
            </button>

            {/* Separator */}
            <div className="flex items-center gap-3 my-5">
              <div className="flex-1 h-px" style={{ backgroundColor: "var(--border-subtle)" }} />
              <span className="text-[12px] font-body" style={{ color: "var(--text-muted)" }}>ou par email</span>
              <div className="flex-1 h-px" style={{ backgroundColor: "var(--border-subtle)" }} />
            </div>

            {/* Email / password form */}
            <form onSubmit={handleSubmit}>
              <div className="mb-3">
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="ton@email.com"
                  autoComplete="email"
                  className="w-full bg-surface rounded-lg py-3 px-4 outline-none text-base md:text-sm font-body transition-[border] duration-150"
                  style={inputStyle}
                  onFocus={e => e.target.style.borderColor = "var(--text-tertiary)"}
                  onBlur={e => e.target.style.borderColor = "var(--border-default)"}
                />
              </div>

              {showPassword && (
                <div className="mb-3 animate-page-in">
                  <input
                    type="password"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="Mot de passe"
                    autoComplete="current-password"
                    autoFocus
                    className="w-full bg-surface rounded-lg py-3 px-4 outline-none text-base md:text-sm font-body transition-[border] duration-150"
                    style={inputStyle}
                    onFocus={e => e.target.style.borderColor = "var(--text-tertiary)"}
                    onBlur={e => e.target.style.borderColor = "var(--border-default)"}
                  />
                </div>
              )}

              {error && (
                <div className="text-xs font-body mb-3" style={{ color: "var(--color-spoiler)" }}>{error}</div>
              )}

              <button
                type="submit"
                disabled={!isSubmittable}
                className={`w-full py-3.5 rounded-lg text-[15px] font-medium font-body border-none transition-all duration-200 ${
                  isSubmittable ? "cursor-pointer hover:opacity-80" : "bg-avatar-bg cursor-not-allowed"
                }`}
                style={isSubmittable
                  ? { backgroundColor: "var(--text-primary)", color: "var(--bg-primary)" }
                  : { color: "var(--text-tertiary)" }
                }
              >
                {loading
                  ? (showPassword ? "Connexion..." : "Envoi en cours...")
                  : (showPassword ? "Se connecter" : "Envoyer un lien de connexion")
                }
              </button>
            </form>

            {/* Password mode toggle */}
            <div className="text-center mt-5">
              <button
                type="button"
                onClick={() => { setShowPassword(p => !p); setError(null); setPassword(""); }}
                className="text-[13px] font-body underline underline-offset-3 cursor-pointer bg-transparent border-none"
                style={{ color: "var(--text-tertiary)" }}
              >
                {showPassword ? "Recevoir un lien par email" : "Connexion avec mot de passe"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
