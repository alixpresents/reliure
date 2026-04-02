export default function NotificationBell({ unreadCount = 0, onClick, isOpen }) {
  return (
    <button
      onClick={onClick}
      aria-label={unreadCount > 0 ? `${unreadCount} notifications non lues` : "Notifications"}
      className="cursor-pointer bg-transparent border-none p-1 shrink-0 transition-opacity duration-150 hover:opacity-70 relative"
      style={{ color: isOpen ? "var(--text-primary)" : "var(--text-tertiary)" }}
    >
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
        <path d="M13.73 21a2 2 0 0 1-3.46 0" />
      </svg>
      {unreadCount > 0 && (
        <span
          className="absolute flex items-center justify-center font-body"
          style={{
            top: -2,
            right: -4,
            backgroundColor: "var(--color-spoiler)",
            color: "#fff",
            fontSize: 9,
            fontWeight: 700,
            lineHeight: 1,
            minWidth: 14,
            height: 14,
            borderRadius: 7,
            padding: "0 3px",
          }}
        >
          {unreadCount > 99 ? "99+" : unreadCount}
        </span>
      )}
    </button>
  );
}
