import { describe, expect, it } from "vitest";
import {
  adjustItemQuantity,
  applyUsageWithQuantities,
  calculateRescueStreak,
  createPantryItem,
  groupPantryByUrgency,
} from "./pantry";

const NOW = new Date("2026-09-02T12:00:00.000Z");

describe("createPantryItem", () => {
  it("normalizes names and applies shelf-life defaults when no expiry is provided", () => {
    const item = createPantryItem(
      { id: 7, name: " Spinach ", quantity: "2", unit: "count" },
      NOW
    );

    expect(item).toMatchObject({
      id: 7,
      name: "spinach",
      quantity: 2,
      unit: "count",
      category: "leafy greens / herbs",
      pantryStaple: false,
      addedAt: NOW.toISOString(),
    });
    expect(item.expiresAt).toBe("2026-09-07T12:00:00.000Z");
  });
});

describe("groupPantryByUrgency", () => {
  it("buckets urgent items separately from staples and fresher ingredients", () => {
    const pantry = [
      { id: 1, name: "spinach", pantryStaple: false, expiresAt: "2026-09-03T12:00:00.000Z" },
      { id: 2, name: "yogurt", pantryStaple: false, expiresAt: "2026-09-05T12:00:00.000Z" },
      { id: 3, name: "rice", pantryStaple: true, expiresAt: "2027-09-02T12:00:00.000Z" },
      { id: 4, name: "apples", pantryStaple: false, expiresAt: "2026-09-08T12:00:00.000Z" },
    ];

    const grouped = groupPantryByUrgency(pantry, NOW);

    expect(grouped.eatToday.map((item) => item.name)).toEqual(["spinach"]);
    expect(grouped.eatSoon.map((item) => item.name)).toEqual(["yogurt"]);
    expect(grouped.fresh.map((item) => item.name)).toEqual(["rice", "apples"]);
    expect(grouped.expiringSoon.map((item) => item.name)).toEqual(["spinach", "yogurt"]);
  });
});

describe("applyUsageWithQuantities", () => {
  it("decrements tracked quantities and removes exhausted or untracked items", () => {
    const pantry = [
      { id: 1, name: "eggs", quantity: 6, unit: "count" },
      { id: 2, name: "spinach", quantity: null, unit: null },
      { id: 3, name: "milk", quantity: 1, unit: "L" },
    ];

    const result = applyUsageWithQuantities(pantry, [
      { id: 1, amount: 2 },
      { id: 2, amount: null },
      { id: 3, amount: 1 },
    ]);

    expect(result.pantry).toEqual([{ id: 1, name: "eggs", quantity: 4, unit: "count" }]);
    expect(result.removedIds).toEqual([2, 3]);
  });
});

describe("adjustItemQuantity", () => {
  it("removes an item when decrementing it to zero", () => {
    const pantry = [{ id: 1, name: "milk", quantity: 1, unit: "L" }];

    const result = adjustItemQuantity(pantry, 1, -1);

    expect(result.pantry).toEqual([]);
    expect(result.usedUpIds).toEqual([1]);
  });

  it("returns the original pantry when the item has no trackable quantity", () => {
    const pantry = [{ id: 1, name: "spinach", quantity: null, unit: null }];

    const result = adjustItemQuantity(pantry, 1, -1);

    expect(result.pantry).toBe(pantry);
    expect(result.usedUpIds).toEqual([]);
  });
});

describe("calculateRescueStreak", () => {
  it("counts consecutive rescue days up to the current day", () => {
    const rescueLog = [
      { date: "2026-09-02T09:30:00.000Z", count: 1 },
      { date: "2026-09-01T18:00:00.000Z", count: 2 },
      { date: "2026-08-31T12:00:00.000Z", count: 1 },
    ];

    expect(calculateRescueStreak(rescueLog, NOW)).toBe(3);
  });

  it("resets the streak when the latest rescue is older than yesterday", () => {
    const rescueLog = [
      { date: "2026-08-30T12:00:00.000Z", count: 1 },
      { date: "2026-08-29T12:00:00.000Z", count: 1 },
    ];

    expect(calculateRescueStreak(rescueLog, NOW)).toBe(0);
  });
});
