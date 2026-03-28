export default function Tag({ children, onClick }) {
  return (
    <span
      onClick={onClick}
      className={`inline-flex items-center min-h-[44px] sm:min-h-0 px-2.5 py-[3px] rounded-xl text-[11px] text-[#777] bg-tag-bg border border-[#eee] font-medium font-body transition-all duration-150 ${onClick ? "cursor-pointer hover:bg-[#eae7e2] hover:text-[#1a1a1a]" : ""}`}
    >
      {children}
    </span>
  );
}
