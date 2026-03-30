import { useState } from "react";
import { NavLink, Link, useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";
import Avatar from "./Avatar";
import Search from "./Search";

export default function Header({ onSearch, onClose, searchOpen, searchGo, searchInitialQuery = "", initials = "?", username, avatarUrl, isLoggedIn = true }) {
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
    <header className="sticky top-0 z-50 bg-white/92 backdrop-blur-[12px] border-b border-[#eee]">
      <div className="max-w-[1060px] mx-auto flex items-center h-[52px] px-3 sm:px-6 gap-2 sm:gap-3 relative">
        <Link to="/explorer" className="flex items-center gap-1.5 mr-2 no-underline">
          <span className="text-[17px] font-bold tracking-tight font-body text-[#1a1a1a]">reliure</span>
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
                <span className="text-[9px] font-medium px-1 py-px rounded border" style={{ background: "#faf6f0", borderColor: "#e8dfd2", color: "#8B6914", lineHeight: "1.4" }}>Aperçu</span>
              )}
            </NavLink>
          ))}
          <div className="w-px h-5 bg-[#eee] shrink-0 self-center mx-1 sm:mx-0" />
          <NavLink
            to="/la-revue"
            className={({ isActive }) =>
              `no-underline rounded-md px-2 py-1.5 sm:px-[11px] sm:py-[7px] text-[13px] font-display italic shrink-0 flex items-center gap-1 ${
                isActive ? "text-[#1a1a1a] font-semibold" : "text-[#767676] font-normal"
              }`
            }
          >
            La Revue
            <span className="text-[9px] font-body not-italic font-medium px-1 py-px rounded border" style={{ background: "#faf6f0", borderColor: "#e8dfd2", color: "#8B6914", lineHeight: "1.4" }}>Aperçu</span>
          </NavLink>
        </nav>

        {/* Search trigger */}
        <button
          onClick={onSearch}
          data-onboarding="search"
          className="hidden sm:flex items-center gap-1.5 bg-transparent cursor-pointer font-body transition-colors duration-150 text-[#888] hover:text-[#1a1a1a] hover:border-[#ccc] shrink-0"
          style={{
            padding: "5px 10px",
            border: "0.5px solid #e0e0e0",
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
                ? <div style={{ width: 28, height: 28, borderRadius: "50%", overflow: "hidden", flexShrink: 0, border: "1.5px solid #eee" }}>
                    <img src={avatarUrl} alt="" style={{ width: 28, height: 28, objectFit: "cover", display: "block", flexShrink: 0 }} />
                  </div>
                : <Avatar i={initials} s={28} />
              }
            </div>
            {menuOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setMenuOpen(false)} />
                <div className="absolute right-0 top-full mt-2 bg-white border border-[#eee] rounded-lg shadow-[0_4px_16px_rgba(0,0,0,0.08)] z-50 overflow-hidden min-w-[160px]">
                  <button
                    onClick={handleLogout}
                    className="w-full px-4 py-3 text-left text-[13px] font-body text-[#767676] bg-transparent border-none cursor-pointer hover:bg-surface hover:text-[#1a1a1a] transition-colors duration-100"
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
