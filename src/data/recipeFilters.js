// Filter option lists for the Recipe Finder. Values map directly to
// Spoonacular's accepted `type`, `diet`, and `cuisine` parameter values
// where applicable. "Mood" isn't a real Spoonacular field — it's mapped to
// a free-text `query` alongside the structured filters.

export const MEAL_TYPES = [
  { label: "Any course", value: "" },
  { label: "Breakfast", value: "breakfast" },
  { label: "Main course", value: "main course" },
  { label: "Appetizer", value: "appetizer" },
  { label: "Side dish", value: "side dish" },
  { label: "Salad", value: "salad" },
  { label: "Soup", value: "soup" },
  { label: "Snack", value: "snack" },
  { label: "Dessert", value: "dessert" },
];

export const MOODS = [
  { label: "Any mood", query: "" },
  { label: "🍲 Comfort food", query: "comfort food" },
  { label: "🥗 Light & fresh", query: "light fresh" },
  { label: "⚡ Quick & easy", query: "easy" },
  { label: "🎉 Indulgent", query: "indulgent rich" },
  { label: "💪 Healthy", query: "healthy" },
];

export const DIETS = [
  { label: "Any diet", value: "" },
  { label: "Vegetarian", value: "vegetarian" },
  { label: "Vegan", value: "vegan" },
  { label: "Gluten free", value: "gluten free" },
  { label: "Ketogenic", value: "ketogenic" },
];

export const CUISINES = [
  { label: "Any cuisine", value: "" },
  { label: "Italian", value: "italian" },
  { label: "Mexican", value: "mexican" },
  { label: "Asian", value: "asian" },
  { label: "Indian", value: "indian" },
  { label: "Mediterranean", value: "mediterranean" },
  { label: "American", value: "american" },
];

export const COOK_TIMES = [
  { label: "Any time", value: "" },
  { label: "Under 15 min", value: "15" },
  { label: "Under 30 min", value: "30" },
  { label: "Under 45 min", value: "45" },
  { label: "Under 1 hour", value: "60" },
];
