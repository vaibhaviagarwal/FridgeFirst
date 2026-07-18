// TheMealDB — free, no signup, no daily cap for hobbyist use (test key "1").
// Used two ways:
//   1. The dashboard's proactive "You can make" teaser (fires automatically,
//      so it can't risk hitting Spoonacular's rate limit).
//   2. A fallback for the Recipes tab if Spoonacular fails — most commonly
//      a 402 (daily free-tier limit reached), but also used for any other
//      request failure so a rate-limited day doesn't just show an error.
//
// TheMealDB's filter.php only accepts one ingredient/category/area per
// request, so multi-ingredient search works by querying each ingredient
// separately and ranking meals by how many of them they actually use.

const BASE = "https://www.themealdb.com/api/json/v1/1";

// Loose mapping from the app's own filter values (shared with Spoonacular)
// to TheMealDB's category/area vocabulary. Anything without a clean match
// is just skipped rather than guessed at, since a bad match is worse than
// no filter at all here.
const TYPE_TO_CATEGORY = {
  breakfast: "Breakfast",
  dessert: "Dessert",
  "side dish": "Side",
  appetizer: "Starter",
  salad: "Vegetarian",
};

const CUISINE_TO_AREA = {
  italian: "Italian",
  mexican: "Mexican",
  indian: "Indian",
  american: "American",
};

async function filterBy(param, value) {
  try {
    const res = await fetch(`${BASE}/filter.php?${param}=${encodeURIComponent(value)}`);
    if (!res.ok) return [];
    const data = await res.json();
    return data.meals || [];
  } catch {
    return [];
  }
}

async function getMealDetails(id) {
  try {
    const res = await fetch(`${BASE}/lookup.php?i=${id}`);
    if (!res.ok) return null;
    const data = await res.json();
    const meal = data.meals?.[0];
    if (!meal) return null;

    const ingredients = [];
    for (let i = 1; i <= 20; i++) {
      const ing = meal[`strIngredient${i}`];
      if (ing && ing.trim()) ingredients.push(ing.trim().toLowerCase());
    }

    return {
      id: meal.idMeal,
      title: meal.strMeal,
      image: meal.strMealThumb,
      readyInMinutes: null, // TheMealDB doesn't provide this
      difficulty: null,
      sourceUrl: meal.strSource || meal.strYoutube || `https://www.themealdb.com/meal/${meal.idMeal}`,
      ingredients,
      instructions: (meal.strInstructions || "").trim(),
    };
  } catch {
    return null;
  }
}

// Ranks candidate meal IDs by how many of the given ingredients they use.
async function rankByIngredients(ingredientNames) {
  const names = ingredientNames.slice(0, 6); // cap requests per call
  if (names.length === 0) return new Map();

  const resultsPerIngredient = await Promise.all(names.map((n) => filterBy("i", n)));
  const countById = new Map();
  resultsPerIngredient.forEach((list) => {
    list.forEach((m) => {
      countById.set(m.idMeal, (countById.get(m.idMeal) || 0) + 1);
    });
  });
  return countById;
}

// Returns recipes shaped identically to spoonacular.js's output, so
// rankRecipes() and the UI don't need to know which source it came from.
export async function suggestRecipesFromPantry(ingredientNames, limit = 6) {
  const countById = await rankByIngredients(ingredientNames);
  const topIds = [...countById.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([id]) => id);

  const details = await Promise.all(topIds.map((id) => getMealDetails(id)));
  return details.filter(Boolean);
}

// Fallback search for the Recipes tab, mirroring searchRecipes()'s filter
// shape as closely as TheMealDB's much simpler API allows. Ingredient match
// is always the primary signal; type/cuisine only apply if there's a clean
// mapping, and only as a soft boost — a meal that matches ingredients but
// not the mapped category still shows up, since TheMealDB's dataset is
// small enough that strict AND filtering often returns nothing.
export async function searchRecipesFallback({ ingredients = [], type, cuisine } = {}, limit = 12) {
  const countById = await rankByIngredients(ingredients);
  if (countById.size === 0) return [];

  const category = TYPE_TO_CATEGORY[type];
  const area = CUISINE_TO_AREA[cuisine];
  const [categoryMeals, areaMeals] = await Promise.all([
    category ? filterBy("c", category) : Promise.resolve(null),
    area ? filterBy("a", area) : Promise.resolve(null),
  ]);
  const categoryIds = categoryMeals ? new Set(categoryMeals.map((m) => m.idMeal)) : null;
  const areaIds = areaMeals ? new Set(areaMeals.map((m) => m.idMeal)) : null;

  const scored = [...countById.entries()].map(([id, count]) => {
    let score = count;
    if (categoryIds?.has(id)) score += 2;
    if (areaIds?.has(id)) score += 2;
    return [id, score];
  });

  const topIds = scored
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([id]) => id);

  const details = await Promise.all(topIds.map((id) => getMealDetails(id)));
  return details.filter(Boolean);
}
