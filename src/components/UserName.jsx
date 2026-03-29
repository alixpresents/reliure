export default function UserName({ user, className = "" }) {
  const name = user?.display_name || user?.username || "?";
  const handle = user?.username;
  return (
    <span
      role="button"
      tabIndex={0}
      onClick={() => console.log("navigate to profile:", user?.id || user?.user_id)}
      onKeyDown={e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); console.log("navigate to profile:", user?.id || user?.user_id); } }}
      className={`text-[#666] font-medium cursor-pointer hover:text-[#1a1a1a] hover:underline transition-colors duration-150 ${className}`}
    >
      {handle ? `@${handle}` : name}
    </span>
  );
}
