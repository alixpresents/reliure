import { useState } from "react";
import { NavLink, Link, useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";
import Avatar from "./Avatar";
import Search from "./Search";

export default function Header({ onSearch, onClose, searchOpen, searchGo, searchInitialQuery = "", initials = "?", username, avatarUrl, isLoggedIn = true, theme, toggleTheme }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const navigate = useNavigate();

  const navItems = isLoggedIn
    ? [
        ["/explorer", "Explorer"],
        ["/citations", "Citations"],
        ["/fil", "Fil"],
        ["/defis", "Défis"],
        [username ? `/${username}` : "/explorer", "Profil"],
      ]
    : [
        ["/explorer", "Explorer"],
        ["/citations", "Citations"],
      ];

  const handleLogout = async () => {
    setMenuOpen(false);
    await supabase.auth.signOut();
    navigate("/login");
  };

  return (
    <header className="sticky top-0 z-50 backdrop-blur-[12px] border-b" style={{ backgroundColor: "var(--header-bg)", borderColor: "var(--border-default)" }}>
      <div className="max-w-[1060px] mx-auto flex items-center h-[52px] px-3 sm:px-6 gap-2 sm:gap-3 relative">
        <Link to="/explorer" className="flex items-center gap-1.5 mr-2 no-underline">
          <span className="text-[17px] font-bold tracking-tight font-body" style={{ color: "var(--text-primary)" }}>reliure</span>
          <span className="text-[8px] font-semibold text-white bg-[#1a1a1a] rounded-[3px] px-[5px] py-[2px] font-body">
            BETA
          </span>
        </Link>
        <nav className="flex gap-0 sm:gap-0.5 flex-1 overflow-x-auto whitespace-nowrap items-center" style={{ scrollbarWidth: "none" }}>
          {navItems.map(([to, label]) => (
            <NavLink
              key={label}
              to={to}
              data-onboarding={
                label === "Explorer" ? "explorer" : label === "Citations" ? "citations" : undefined
              }
              className={({ isActive }) =>
                `no-underline rounded-md px-2 py-1.5 sm:px-[11px] sm:py-[7px] text-[13px] font-body shrink-0 flex items-center gap-1 ${
                  isActive ? "text-[#1a1a1a] font-semibold" : "text-[#767676] font-normal"
                }`
              }
            >
              {label}
              {label === "Défis" && (
                <span className="text-[9px] font-medium px-1 py-px rounded border" style={{ background: "var(--color-wip-bg)", borderColor: "var(--color-wip-border)", color: "var(--color-wip-text)", lineHeight: "1.4" }}>Aperçu</span>
              )}
            </NavLink>
          ))}
          <div className="w-px h-5 shrink-0 self-center mx-1 sm:mx-0" style={{ backgroundColor: "var(--border-default)" }} />
          <NavLink
            to="/la-revue"
            className={({ isActive }) =>
              `no-underline rounded-md px-2 py-1.5 sm:px-[11px] sm:py-[7px] text-[13px] font-display italic shrink-0 flex items-center gap-1 ${
                isActive ? "text-[#1a1a1a] font-semibold" : "text-[#767676] font-normal"
              }`
            }
          >
            La Revue
            <span className="text-[9px] font-body not-italic font-medium px-1 py-px rounded border" style={{ background: "var(--color-wip-bg)", borderColor: "var(--color-wip-border)", color: "var(--color-wip-text)", lineHeight: "1.4" }}>Aperçu</span>
          </NavLink>
        </nav>

        {/* Search trigger */}
        <button
          onClick={onSearch}
          data-onboarding="search"
          className="hidden sm:flex items-center gap-1.5 bg-transparent cursor-pointer font-body transition-colors duration-150 text-[#888] hover:text-[#1a1a1a] hover:border-[#ccc] shrink-0"
          style={{
            padding: "5px 10px",
            border: "0.5px solid var(--border-default)",
            borderRadius: 6,
            fontSize: 13,
          }}
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="shrink-0">
            <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          Rechercher
        </button>
        {/* Mobile: icon only */}
        <button
          onClick={onSearch}
          data-onboarding="search"
          className="sm:hidden cursor-pointer text-[#767676] hover:text-[#1a1a1a] transition-colors duration-150 p-1 bg-transparent border-none shrink-0"
          aria-label="Rechercher"
        >
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
        </button>

        {/* Theme toggle */}
        <button
          onClick={toggleTheme}
          className="cursor-pointer bg-transparent border-none p-1 shrink-0 transition-colors duration-150 hover:opacity-70"
          style={{ color: "var(--text-tertiary)" }}
          aria-label={theme === "light" ? "Mode sombre" : "Mode clair"}
        >
          {theme === "light" ? (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
            </svg>
          ) : (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="5" />
              <line x1="12" y1="1" x2="12" y2="3" />
              <line x1="12" y1="21" x2="12" y2="23" />
              <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
              <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
              <line x1="1" y1="12" x2="3" y2="12" />
              <line x1="21" y1="12" x2="23" y2="12" />
              <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
              <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
            </svg>
          )}
        </button>

        {/* Avatar + dropdown (logged in) / Se connecter (logged out) */}
        {isLoggedIn ? (
          <div className="relative">
            <div
              role="button"
              tabIndex={0}
              onClick={() => setMenuOpen(!menuOpen)}
              onKeyDown={e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setMenuOpen(!menuOpen); } }}
              className="cursor-pointer"
            >
              {avatarUrl
                ? <div style={{ width: 28, height: 28, borderRadius: "50%", overflow: "hidden", flexShrink: 0, border: "1.5px solid var(--border-default)" }}>
                    <img src={avatarUrl} alt="" style={{ width: 28, height: 28, objectFit: "cover", display: "block", flexShrink: 0 }} />
                  </div>
                : <Avatar i={initials} s={28} />
              }
            </div>
            {menuOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setMenuOpen(false)} />
                <div className="absolute right-0 top-full mt-2 rounded-lg shadow-[0_4px_16px_rgba(0,0,0,0.08)] z-50 overflow-hidden min-w-[160px]" style={{ backgroundColor: "var(--bg-elevated)", border: "1px solid var(--border-default)" }}>
                  <button
                    onClick={handleLogout}
                    className="w-full px-4 py-3 text-left text-[13px] font-body bg-transparent border-none cursor-pointer transition-colors duration-100" style={{ color: "var(--text-tertiary)" }}
                  >
                    Se déconnecter
                  </button>
                </div>
              </>
            )}
          </div>
        ) : (
          <Link
            to="/login"
            className="text-[13px] font-medium font-body text-[#1a1a1a] no-underline px-3 py-1.5 rounded-full border border-[#eee] hover:border-[#eee] transition-colors duration-150 shrink-0"
          >
            Se connecter
          </Link>
        )}

        {/* Search dropdown — positioned relative to header bar */}
        <Search open={searchOpen} onClose={onClose} go={searchGo} initialQuery={searchInitialQuery} />
      </div>
    </header>
  );
}
