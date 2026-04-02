import { useEffect, useRef } from "react";
import Avatar from "./Avatar";
import { getNotificationText, getNotificationLink, relativeTime } from "../utils/notificationHelpers";

function NotifIcon({ type }) {
  switch (type) {
    case "follow":
      return <span className="text-[13px]">👤</span>;
    case "like_review":
    case "like_quote":
    case "like_list":
      return <span className="text-[13px]">♥</span>;
    case "badge":
      return <span className="text-[13px]">✦</span>;
    case "reply":
      return <span className="text-[13px]">💬</span>;
    default:
      return null;
  }
}

export default function NotificationPanel({ notifications, isLoading, onMarkAllRead, onClickNotif, onClose }) {
  const panelRef = useRef(null);

  // Close on click outside
  useEffect(() => {
    const handler = (e) => {
      if (panelRef.current && !panelRef.current.contains(e.target)) {
        onClose();
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [onClose]);

  // Close on Escape
  useEffect(() => {
    const handler = (e) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  const hasUnread = notifications.some((n) => !n.is_read);

  return (
    <div
      ref={panelRef}
      className="absolute right-0 overflow-hidden"
      style={{
        top: "calc(100% + 8px)",
        width: 360,
        maxHeight: 440,
        backgroundColor: "var(--bg-elevated)",
        border: "1px solid var(--border-default)",
        borderRadius: 12,
        boxShadow: "0 4px 24px rgba(0,0,0,0.1)",
        zIndex: 60,
      }}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between px-4 py-3"
        style={{ borderBottom: "1px solid var(--border-subtle)" }}
      >
        <span className="text-[14px] font-semibold font-body" style={{ color: "var(--text-primary)" }}>
          Notifications
        </span>
        {hasUnread && (
          <button
            onClick={onMarkAllRead}
            className="bg-transparent border-none cursor-pointer text-[11px] font-body transition-opacity duration-150 hover:opacity-70 p-0"
            style={{ color: "var(--text-tertiary)" }}
          >
            Tout marquer comme lu
          </button>
        )}
      </div>

      {/* List */}
      <div style={{ maxHeight: 388, overflowY: "auto" }}>
        {isLoading && (
          <div className="py-8 text-center text-[13px] font-body" style={{ color: "var(--text-tertiary)" }}>
            Chargement...
          </div>
        )}

        {!isLoading && notifications.length === 0 && (
          <div className="py-8 text-center text-[13px] font-body" style={{ color: "var(--text-tertiary)" }}>
            Aucune notification pour l'instant.
          </div>
        )}

        {!isLoading &&
          notifications.map((notif) => {
            const text = getNotificationText(notif);
            const link = getNotificationLink(notif);
            const time = relativeTime(notif.created_at);
            const actorName = notif.actor_display_name || notif.actor_username || "";
            const actorInitials = actorName
              .split(" ")
              .map((w) => w[0])
              .join("")
              .toUpperCase()
              .slice(0, 2) || "?";

            return (
              <div
                key={notif.id}
                role={link ? "button" : undefined}
                tabIndex={link ? 0 : undefined}
                onClick={() => onClickNotif(notif)}
                onKeyDown={(e) => {
                  if (link && (e.key === "Enter" || e.key === " ")) {
                    e.preventDefault();
                    onClickNotif(notif);
                  }
                }}
                className={`flex gap-3 px-4 py-3 transition-colors duration-100 ${link ? "cursor-pointer" : ""}`}
                style={{
                  backgroundColor: notif.is_read ? "transparent" : "var(--bg-surface)",
                  borderBottom: "1px solid var(--border-subtle)",
                }}
              >
                {/* Avatar or icon */}
                <div className="shrink-0 pt-0.5">
                  {notif.actor_id ? (
                    <Avatar i={actorInitials} s={32} src={notif.actor_avatar_url || null} />
                  ) : (
                    <div
                      className="flex items-center justify-center rounded-full"
                      style={{
                        width: 32,
                        height: 32,
                        backgroundColor: "var(--avatar-bg)",
                      }}
                    >
                      <NotifIcon type={notif.type} />
                    </div>
                  )}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div
                    className="text-[13px] leading-[1.5] font-body"
                    style={{ color: "var(--text-primary)" }}
                  >
                    {text}
                  </div>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span
                      className="text-[11px] font-body"
                      style={{ color: "var(--text-tertiary)" }}
                    >
                      {time}
                    </span>
                  </div>
                </div>

                {/* Unread dot */}
                {!notif.is_read && (
                  <div className="shrink-0 self-center">
                    <div
                      className="rounded-full"
                      style={{
                        width: 7,
                        height: 7,
                        backgroundColor: "var(--color-spoiler)",
                      }}
                    />
                  </div>
                )}
              </div>
            );
          })}
      </div>
    </div>
  );
}
