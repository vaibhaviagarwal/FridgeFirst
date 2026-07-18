// Recipe API layer — calls the real Spoonacular API using your key from .env.
// No fallback: if the request fails (bad key, rate limit, network issue),
// it throws and the UI shows an error instead of silently swapping data.
//
// Uses the complexSearch endpoint with addRecipeInformation=true, which
// returns full recipe details (ingredients, source URL, cook time) in a
// single request per search — unlike the old findByIngredients approach,
// which needed a follow-up detail call per result. That also means this
// burns through the free-tier point budget more slowly.

const API_KEY = import.meta.env.VITE_SPOONACULAR_API_KEY;
const BASE_URL = "https://api.spoonacular.com/recipes";

// filters: {
//   ingredients: string[]   — pantry ingredients to search with
//   type: string             — meal course, e.g. "main course", "dessert"
//   diet: string              — e.g. "vegetarian", "vegan", "gluten free"
//   cuisine: string           — e.g. "italian", "mexican"
//   maxReadyTime: number      — minutes
//   query: string             — free text, used for "mood" (e.g. "comfort food")
// }
// Returns a normalized array: { id, title, image, readyInMinutes, difficulty, sourceUrl, ingredients }
export async function searchRecipes(filters = {}) {
  if (!API_KEY) {
    throw new Error("No Spoonacular API key found. Add VITE_SPOONACULAR_API_KEY to your .env file.");
  }

  const params = new URLSearchParams();
  if (filters.ingredients?.length) params.set("includeIngredients", filters.ingredients.join(","));
  if (filters.type) params.set("type", filters.type);
  if (filters.diet) params.set("diet", filters.diet);
  if (filters.cuisine) params.set("cuisine", filters.cuisine);
  if (filters.maxReadyTime) params.set("maxReadyTime", String(filters.maxReadyTime));
  if (filters.query) params.set("query", filters.query);
  params.set("number", "12");
  params.set("addRecipeInformation", "true");
  params.set("instructionsRequired", "true");
  params.set("apiKey", API_KEY);

  const res = await fetch(`${BASE_URL}/complexSearch?${params.toString()}`);
  if (!res.ok) {
    // Attach the HTTP status so callers can distinguish "daily limit hit"
    // (402) from other failures without parsing the error message string.
    const err = new Error(`Spoonacular request failed: ${res.status}`);
    err.status = res.status;
    throw err;
  }
  const data = await res.json();

  return (data.results || []).map((r) => ({
    id: r.id,
    title: r.title,
    image: r.image,
    readyInMinutes: r.readyInMinutes ?? null,
    difficulty: null, // Spoonacular has no direct difficulty field
    sourceUrl: r.sourceUrl,
    ingredients: (r.extendedIngredients || []).map((i) => (i.name || "").toLowerCase()).filter(Boolean),
    instructions: (r.instructions || "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim(),
  }));
}
