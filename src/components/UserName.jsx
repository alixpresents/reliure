import { Link } from "react-router-dom";

export default function UserName({ user, className = "" }) {
  const handle = user?.username;
  if (!handle) return <span className={`font-medium ${className}`} style={{ color: "var(--text-secondary)" }}>?</span>;

  return (
    <Link
      to={`/${handle}`}
      className={`font-medium no-underline cursor-pointer hover:underline transition-colors duration-150 ${className}`}
      style={{ color: "var(--text-secondary)" }}
    >
      @{handle}
    </Link>
  );
}
