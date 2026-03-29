import { useState } from "react";
import { supabase } from "../lib/supabase";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async e => {
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

  return (
    <div className="min-h-screen bg-white flex items-center justify-center px-4">
      <div className="w-full max-w-[400px]">
        {/* Logo */}
        <div className="flex items-center justify-center gap-1.5 mb-8">
          <span className="text-[20px] font-bold tracking-tight font-body">reliure</span>
          <span className="text-[8px] font-semibold text-white bg-[#1a1a1a] rounded-[3px] px-[5px] py-[2px] font-body">
            BETA
          </span>
        </div>

        {sent ? (
          /* Success */
          <div className="text-center">
            <div className="flex justify-center mb-4">
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="10" fill="#2E7D32" />
                <path d="M8 12.5l2.5 2.5L16 9.5" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <div className="text-sm font-medium font-body text-[#1a1a1a]">Vérifie ta boîte mail !</div>
            <div className="text-[13px] text-[#737373] font-body mt-1">
              Un lien de connexion a été envoyé à <span className="font-medium text-[#1a1a1a]">{email}</span>
            </div>
          </div>
        ) : (
          /* Form */
          <form onSubmit={handleSubmit}>
            <h1 className="font-display italic text-[26px] font-normal text-center mb-2 leading-tight">
              Connecte-toi
            </h1>
            <p className="text-[13px] text-[#737373] text-center mb-8 font-body">
              Entre ton email pour recevoir un lien de connexion.
            </p>

            <div className="mb-4">
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="ton@email.com"
                autoFocus
                className="w-full bg-surface rounded-lg py-3 px-4 border border-[#eee] outline-none text-base md:text-sm text-[#1a1a1a] font-body placeholder:text-[#767676] focus:border-[#ccc] transition-[border] duration-150"
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
                  ? "bg-[#1a1a1a] text-white cursor-pointer hover:bg-[#333]"
                  : "bg-avatar-bg text-[#767676] cursor-not-allowed"
              }`}
            >
              {loading ? "Envoi en cours..." : "Envoyer le lien"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
