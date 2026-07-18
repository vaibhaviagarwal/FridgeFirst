// Recipe matching/ranking logic, per spec weight order:
//   1. Uses expiring ingredients
//   2. Fewest missing ingredients
//   3. Number of pantry ingredients used
//   4. Cook time (tiebreaker only)
//
// Ingredient name matching is intentionally simple normalization, not NLP:
// lowercase, strip common qualifiers, singularize naive plurals.

function normalize(name) {
  return name
    .toLowerCase()
    .replace(/\b(fresh|baby|organic|large|small|chopped|sliced|diced)\b/g, "")
    .replace(/s\b/, "") // naive plural strip
    .replace(/\s+/g, " ")
    .trim();
}

function ingredientsMatch(a, b) {
  const na = normalize(a);
  const nb = normalize(b);
  return na === nb || na.includes(nb) || nb.includes(na);
}

export function rankRecipes(recipes, pantryItems, expiringItems) {
  const pantryNames = pantryItems.map((i) => i.name);
  const expiringNames = expiringItems.map((i) => i.name);

  const scored = recipes.map((recipe) => {
    const have = [];
    const missing = [];

    recipe.ingredients.forEach((ingredient) => {
      const matchedPantryItem = pantryNames.find((p) =>
        ingredientsMatch(p, ingredient)
      );
      if (matchedPantryItem) {
        have.push({ name: ingredient, pantryName: matchedPantryItem });
      } else {
        missing.push(ingredient);
      }
    });

    const usesExpiring = have.filter((h) =>
      expiringNames.some((e) => ingredientsMatch(e, h.pantryName))
    ).length;

    const matchPercent = recipe.ingredients.length
      ? Math.round((have.length / recipe.ingredients.length) * 100)
      : 0;

    return {
      ...recipe,
      have,
      missing,
      usesExpiringCount: usesExpiring,
      matchPercent,
      matchTier: matchPercent >= 80 ? "Great match" : matchPercent >= 50 ? "Good match" : "Partial match",
    };
  });

  scored.sort((a, b) => {
    if (b.usesExpiringCount !== a.usesExpiringCount) {
      return b.usesExpiringCount - a.usesExpiringCount;
    }
    if (a.missing.length !== b.missing.length) {
      return a.missing.length - b.missing.length;
    }
    if (b.have.length !== a.have.length) {
      return b.have.length - a.have.length;
    }
    return (a.readyInMinutes ?? 999) - (b.readyInMinutes ?? 999);
  });

  return scored;
}