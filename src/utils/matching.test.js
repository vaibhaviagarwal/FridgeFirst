import { describe, expect, it } from "vitest";
import { rankRecipes } from "./matching";

describe("rankRecipes", () => {
  it("prioritizes recipes that use expiring pantry items before recipes with fewer missing ingredients", () => {
    const recipes = [
      {
        id: 1,
        title: "Rice Bowl",
        ingredients: ["rice"],
        readyInMinutes: 10,
      },
      {
        id: 2,
        title: "Spinach Omelet",
        ingredients: ["spinach", "eggs", "milk"],
        readyInMinutes: 15,
      },
    ];

    const pantry = [{ name: "spinach" }, { name: "rice" }, { name: "egg" }];
    const expiringSoon = [{ name: "spinach" }];

    const [first, second] = rankRecipes(recipes, pantry, expiringSoon);

    expect(first.title).toBe("Spinach Omelet");
    expect(first.usesExpiringCount).toBe(1);
    expect(second.title).toBe("Rice Bowl");
    expect(second.usesExpiringCount).toBe(0);
  });

  it("normalizes qualifiers and plurals when matching ingredients", () => {
    const [recipe] = rankRecipes(
      [
        {
          id: 1,
          title: "Salad",
          ingredients: ["baby spinach", "tomatoes"],
          readyInMinutes: 5,
        },
      ],
      [{ name: "spinach" }, { name: "tomato" }],
      [{ name: "spinach" }]
    );

    expect(recipe.have).toEqual([
      { name: "baby spinach", pantryName: "spinach" },
      { name: "tomatoes", pantryName: "tomato" },
    ]);
    expect(recipe.matchPercent).toBe(100);
    expect(recipe.matchTier).toBe("Great match");
  });

  it("uses cook time only as the final tiebreaker", () => {
    const recipes = [
      {
        id: 1,
        title: "Slow Pasta",
        ingredients: ["pasta", "tomato"],
        readyInMinutes: 35,
      },
      {
        id: 2,
        title: "Fast Pasta",
        ingredients: ["pasta", "tomato"],
        readyInMinutes: 15,
      },
    ];

    const [first] = rankRecipes(recipes, [{ name: "pasta" }, { name: "tomato" }], []);

    expect(first.title).toBe("Fast Pasta");
  });

  it("marks empty ingredient lists as a 0 percent partial match", () => {
    const [recipe] = rankRecipes([{ id: 1, title: "Mystery Dish", ingredients: [] }], [], []);

    expect(recipe.matchPercent).toBe(0);
    expect(recipe.matchTier).toBe("Partial match");
    expect(recipe.have).toEqual([]);
    expect(recipe.missing).toEqual([]);
  });
});
