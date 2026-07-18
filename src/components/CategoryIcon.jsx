import { Leaf, Cherry, Milk, Beef, Fish, Carrot, Salad, Wheat, Package } from "lucide-react";

// Maps a shelf-life category (from src/data/shelfLife.js) to a Lucide icon,
// all sharing the same stroke weight — mixing emoji (which render
// inconsistently across OSes/fonts) with a real icon set is one of the
// clearest "AI-generated" tells, so every category icon in the app should
// route through this one component.

const ICONS = {
  "leafy greens / herbs": Leaf,
  berries: Cherry,
  dairy: Milk,
  "fresh meat / poultry": Beef,
  seafood: Fish,
  "root vegetables / alliums": Carrot,
  "other fresh vegetables": Salad,
  "pantry staple": Wheat,
  other: Package,
};

export default function CategoryIcon({ category, size = 16, className }) {
  const Icon = ICONS[category] || ICONS.other;
  return <Icon size={size} strokeWidth={2} className={className} aria-hidden="true" />;
}
