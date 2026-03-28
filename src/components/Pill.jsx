export default function Pill({ children, active, onClick }) {
  return (
    <button
      onClick={onClick}
      className={`px-4 py-[7px] min-h-[44px] sm:min-h-0 rounded-[20px] text-xs cursor-pointer font-medium font-body transition-all duration-200 active:scale-95 ${
        active
          ? "bg-[#1a1a1a] text-white border border-[#1a1a1a]"
          : "bg-transparent text-[#666] border-[1.5px] border-[#ddd]"
      }`}
    >
      {children}
    </button>
  );
}
