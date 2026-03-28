import Avatar from "./Avatar";

export default function Header({ pg, setPg, onSearch }) {
  const navItems = [
    ["explore", "Explorer"],
    ["citations", "Citations"],
    ["feed", "Fil"],
    ["profile", "Profil"],
  ];

  return (
    <header className="sticky top-0 z-100 bg-white/92 backdrop-blur-[12px] border-b border-[#eee]">
      <div className="max-w-[1060px] mx-auto flex items-center h-[52px] px-6 gap-3">
        <div
          onClick={() => setPg("profile")}
          className="flex items-center gap-1.5 cursor-pointer mr-2"
        >
          <span className="text-[17px] font-bold tracking-tight font-body">reliure</span>
          <span className="text-[8px] font-semibold text-white bg-[#1a1a1a] rounded-[3px] px-[5px] py-[2px] font-body">
            BETA
          </span>
        </div>
        <nav className="flex gap-0.5 flex-1 overflow-x-auto whitespace-nowrap" style={{ scrollbarWidth: "none" }}>
          {navItems.map(([k, l]) => {
            const active = pg === k || (pg === "book" && k === "profile") || (pg === "tag" && k === "explore");
            return (
              <button
                key={k}
                onClick={() => setPg(k)}
                className={`bg-transparent border-none rounded-md px-[11px] py-[7px] cursor-pointer text-[13px] font-body ${
                  active ? "text-[#1a1a1a] font-semibold" : "text-[#767676] font-normal"
                }`}
              >
                {l}
              </button>
            );
          })}
          <div className="w-px h-5 bg-[#eee] shrink-0 self-center" />
          <button
            onClick={() => setPg("journal")}
            className={`bg-transparent border-none rounded-md px-[11px] py-[7px] cursor-pointer text-[13px] font-display italic ${
              pg === "journal" ? "text-[#1a1a1a] font-semibold" : "text-[#767676] font-normal"
            }`}
          >
            La Revue
          </button>
        </nav>
        <div onClick={onSearch} className="cursor-pointer text-[#767676] p-1">
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
        </div>
        <Avatar i="AL" s={28} />
      </div>
    </header>
  );
}
