import { Link } from "react-router-dom";

export default function UserName({ user, className = "" }) {
  const handle = user?.username;
  if (!handle) return <span className={`text-[#666] font-medium ${className}`}>?</span>;

  return (
    <Link
      to={`/${handle}`}
      className={`text-[#666] font-medium no-underline cursor-pointer hover:text-[#1a1a1a] hover:underline transition-colors duration-150 ${className}`}
    >
      @{handle}
    </Link>
  );
}
