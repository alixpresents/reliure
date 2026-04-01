import { Link } from "react-router-dom";
import CreatorBadge from "./CreatorBadge";

export default function UserName({ user, className = "", isCreator = false }) {
  const handle = user?.username;
  if (!handle) return <span className={`font-medium ${className}`} style={{ color: "var(--text-secondary)" }}>?</span>;

  return (
    <span className="inline-flex items-center gap-1">
      <Link
        to={`/${handle}`}
        className={`font-medium no-underline cursor-pointer hover:underline transition-colors duration-150 ${className}`}
        style={{ color: "var(--text-secondary)" }}
      >
        @{handle}
      </Link>
      {isCreator && <CreatorBadge />}
    </span>
  );
}
