import { describe, expect, it } from "vitest";
import { parseQuickAdd } from "./quickAddParser";

describe("parseQuickAdd", () => {
  it("parses leading quantities and relative day words", () => {
    expect(parseQuickAdd("2 eggs tomorrow")).toEqual({
      name: "eggs",
      quantity: "2",
      expiryDays: 1,
    });
  });

  it("supports decimal quantities", () => {
    expect(parseQuickAdd("1.5 avocados today")).toEqual({
      name: "avocados",
      quantity: "1.5",
      expiryDays: 0,
    });
  });

  it("strips filler words around expiry phrases", () => {
    expect(parseQuickAdd("milk expires in 3 days left")).toEqual({
      name: "milk",
      quantity: null,
      expiryDays: 3,
    });
  });

  it("returns null for blank input", () => {
    expect(parseQuickAdd("   ")).toBeNull();
  });

  it("does not invent a quantity for malformed leading text", () => {
    expect(parseQuickAdd("two eggs today")).toEqual({
      name: "two eggs",
      quantity: null,
      expiryDays: 0,
    });
  });
});
