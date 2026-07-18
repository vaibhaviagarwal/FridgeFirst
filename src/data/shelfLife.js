// Estimates shelf life by matching an ingredient name to a small set of
// general food categories, rather than hardcoding every individual ingredient.
// This is a light heuristic, not a database — good enough to auto-fill an
// expiry estimate when the user doesn't type one.

const CATEGORIES = [
  {
    category: "leafy greens / herbs",
    days: 5,
    keywords: ["spinach", "lettuce", "kale", "arugula", "basil", "cilantro", "parsley", "mint", "greens", "herb"],
  },
  {
    category: "berries",
    days: 5,
    keywords: ["berry", "berries", "strawberr", "blueberr", "raspberr", "blackberr"],
  },
  {
    category: "dairy",
    days: 10,
    keywords: ["milk", "yogurt", "cream", "butter", "cheese", "egg"],
  },
  {
    category: "fresh meat / poultry",
    days: 3,
    keywords: ["chicken", "beef", "pork", "turkey", "meat", "sausage"],
  },
  {
    category: "seafood",
    days: 2,
    keywords: ["fish", "salmon", "shrimp", "seafood", "tuna", "crab"],
  },
  {
    category: "root vegetables / alliums",
    days: 18,
    keywords: ["carrot", "potato", "onion", "garlic", "beet", "ginger", "root"],
  },
  {
    category: "other fresh vegetables",
    days: 6,
    keywords: ["tomato", "cucumber", "pepper", "broccoli", "mushroom", "zucchini", "avocado", "vegetable"],
  },
  {
    category: "pantry staple",
    days: 365,
    pantryStaple: true,
    keywords: ["pasta", "rice", "flour", "sugar", "canned", "oil", "cereal", "bean"],
  },
];

const DEFAULT_FALLBACK = { category: "other", days: 7, pantryStaple: false };

// Looks up shelf life for a free-typed ingredient name by matching it
// against category keyword lists. Falls back to a generic 7-day estimate
// if nothing matches.
export function getShelfLifeDefault(name) {
  const normalized = name.trim().toLowerCase();

  const match = CATEGORIES.find((cat) =>
    cat.keywords.some((keyword) => normalized.includes(keyword))
  );

  if (match) {
    return {
      category: match.category,
      days: match.days,
      pantryStaple: !!match.pantryStaple,
    };
  }

  return DEFAULT_FALLBACK;
}