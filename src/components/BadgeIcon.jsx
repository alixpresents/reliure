import { TIER_COLORS, CATEGORY_COLORS } from "../hooks/useUserBadges";

// ── Fallback emojis by badge ID (used when icon_key is not set in DB) ──

const EMOJI_BY_ID = {
  first_read:       "📖",
  first_book:       "📖",
  ten_books:        "📚",
  fifty_books:      "📚",
  first_review:     "✍️",
  ten_reviews:      "🖊️",
  first_quote:      "💬",
  first_list:       "📋",
  first_follow:     "🤝",
  ten_followers:    "✨",
  year_review:      "📊",
  speed_reader:     "⚡",
  night_owl:        "🦉",
  early_bird:       "🌅",
  completionist:    "💯",
  polyglotte:       "🌍",
  creator:          "✦",
  top_contributor:  "⭐",
};

const DEFAULT_EMOJI = {
  lecture:       "📖",
  reading:       "📖",
  contribution:  "✍️",
  social:        "🤝",
  defis:         "🏆",
  challenge:     "🏆",
  special:       "⭐",
};

// ── Category → shape ──

const SHAPES = {
  lecture:       "circle",
  reading:       "circle",
  contribution:  "hexagon",
  social:        "rounded",
  defis:         "shield",
  challenge:     "shield",
  special:       "diamond",
};

const CLIP_PATHS = {
  hexagon: "polygon(50% 0%, 93% 25%, 93% 75%, 50% 100%, 7% 75%, 7% 25%)",
  shield:  "polygon(50% 0%, 100% 15%, 100% 65%, 50% 100%, 0% 65%, 0% 15%)",
  diamond: "polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)",
};

function getBorderColor(tier, category) {
  if (tier === "diamant") return "#B9C4D4";
  if (tier && TIER_COLORS[tier]) return TIER_COLORS[tier];
  return CATEGORY_COLORS[category] || "var(--text-tertiary)";
}

function getBackgroundColor(tier, category) {
  if (tier === "diamant") return "linear-gradient(135deg, rgba(185,242,255,0.15), rgba(232,213,245,0.15))";
  if (tier && TIER_COLORS[tier]) return TIER_COLORS[tier] + "26";
  return (CATEGORY_COLORS[category] || "#888") + "26";
}

/**
 * BadgeIcon — renders a shaped badge with an emoji at center.
 *
 * @param {string}  badgeId  — badge_definitions.id (fallback emoji lookup)
 * @param {string}  iconKey  — badge_definitions.icon_key (emoji from DB, primary)
 * @param {string}  category — badge_definitions.category (shape + fallback color)
 * @param {string}  tier     — badge_definitions.tier (color)
 * @param {number}  size     — 32 or 48
 * @param {boolean} locked   — greyed-out for unearned badges
 */
export default function BadgeIcon({ badgeId, iconKey, category, tier, size = 48, locked = false }) {
  const shape = SHAPES[category] || "circle";
  const clipPath = CLIP_PATHS[shape];
  const emoji = iconKey || EMOJI_BY_ID[badgeId] || DEFAULT_EMOJI[category] || "🏅";
  const emojiSize = Math.round(size * 0.55);

  const borderColor = locked ? "var(--border-subtle)" : getBorderColor(tier, category);
  const bg = locked ? "var(--bg-elevated)" : getBackgroundColor(tier, category);
  const isGradientBg = typeof bg === "string" && bg.startsWith("linear-gradient");

  // Clip-path shapes (hexagon, shield, diamond) can't use CSS border.
  // Use a double-layer: outer = border color bg, inner = content bg, both clipped.
  if (clipPath) {
    const innerSize = size - 4;
    return (
      <div
        style={{
          width: size,
          height: size,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
          backgroundColor: borderColor,
          clipPath,
          ...(locked ? { filter: "grayscale(1)", opacity: 0.3 } : {}),
        }}
      >
        <div
          style={{
            width: innerSize,
            height: innerSize,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            clipPath,
            ...(isGradientBg ? { background: bg } : { backgroundColor: bg }),
            fontSize: emojiSize,
            lineHeight: 1,
          }}
        >
          {emoji}
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        width: size,
        height: size,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
        ...(isGradientBg ? { background: bg } : { backgroundColor: bg }),
        border: `2px solid ${borderColor}`,
        ...(shape === "rounded" ? { borderRadius: Math.round(size * 0.22) } : {}),
        ...(shape === "circle" ? { borderRadius: "50%" } : {}),
        ...(locked ? { filter: "grayscale(1)", opacity: 0.3 } : {}),
        fontSize: emojiSize,
        lineHeight: 1,
      }}
    >
      {emoji}
    </div>
  );
}
