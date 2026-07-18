// Maps a shelf-life category (from src/data/shelfLife.js) to a small emoji
// icon, so pantry/rescue cards can be scanned at a glance instead of just
// read as text.

const ICONS = {
  "leafy greens / herbs": "🥬",
  berries: "🍓",
  dairy: "🥛",
  "fresh meat / poultry": "🥩",
  seafood: "🐟",
  "root vegetables / alliums": "🥕",
  "other fresh vegetables": "🥦",
  "pantry staple": "🌾",
  other: "📦",
};

export function getCategoryIcon(category) {
  return ICONS[category] || ICONS.other;
}
