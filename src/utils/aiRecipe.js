// Shared helper so both the initial "Generate a custom recipe" button
// (AIFallback) and the "Regenerate" button (RecipeDetails, once one's
// already showing) run the exact same generation + ranking pipeline.
import { generateRecipe } from "../api/groq";
import { rankRecipes } from "./matching";

// params: { selectedNames, mealType, mood, diet, cuisine, pantry, expiringSoon }
// Returns a ranked recipe with `aiParams` re-attached, so it can be
// regenerated again later without the caller needing to remember the
// original search context.
export async function generateRankedRecipe(params) {
  const { selectedNames, mealType, mood, diet, cuisine, pantry, expiringSoon } = params;

  const recipe = await generateRecipe({
    ingredients: selectedNames,
    mealType,
    mood,
    diet,
    cuisine,
  });

  const pantryItems = pantry.filter((i) => selectedNames.includes(i.name));
  const [ranked] = rankRecipes([recipe], pantryItems, expiringSoon);
  ranked.aiParams = params;
  return ranked;
}
