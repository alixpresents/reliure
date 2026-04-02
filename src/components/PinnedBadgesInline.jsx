import Tooltip from "./Tooltip";
import BadgeIcon from "./BadgeIcon";

/**
 * Inline display of pinned badges — used in profile header.
 * badges: [{badgeId, iconKey, name, description, category, tier, color}]
 */
export default function PinnedBadgesInline({ badges, size = 16, gap = 3 }) {
  if (!badges?.length) return null;
  return (
    <span className="inline-flex items-center" style={{ gap }}>
      {badges.slice(0, 3).map((b, i) => (
        <Tooltip
          key={i}
          multiline
          text={
            <>
              <div style={{ fontWeight: 600, fontSize: 12, whiteSpace: "nowrap" }}>{b.name}</div>
              {b.description && <div style={{ fontSize: 11, color: "rgba(255,255,255,0.7)", lineHeight: 1.4, marginTop: 2 }}>{b.description}</div>}
            </>
          }
        >
          <span className="inline-flex shrink-0 cursor-default">
            <BadgeIcon
              badgeId={b.badgeId}
              iconKey={b.iconKey}
              category={b.category}
              tier={b.tier}
              size={size}
            />
          </span>
        </Tooltip>
      ))}
    </span>
  );
}
