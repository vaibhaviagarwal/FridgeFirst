// Common items shown as one-tap "quick start" chips for onboarding, so a
// new user isn't staring at a blank text field with no guidance.
// Icons are resolved via CategoryIcon (shared with the rest of the app,
// see src/data/shelfLife.js for the category lookup) rather than stored
// here directly, so every chip stays visually consistent with the pantry
// list instead of using one-off glyphs.

export const COMMON_INGREDIENTS = [
  { name: "milk" },
  { name: "eggs" },
  { name: "bread" },
  { name: "cheese" },
  { name: "tomatoes" },
  { name: "spinach" },
  { name: "chicken" },
  { name: "rice" },
];
