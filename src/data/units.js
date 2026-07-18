// Units offered when adding a pantry item. "count" is the default for
// things like eggs or apples where you'd say "5", not "5 count" — its
// label is intentionally blank in the UI value but stored explicitly so
// quantity math and display formatting have a consistent unit to check.
export const UNITS = [
  { value: "count", label: "count (e.g. 5 eggs)" },
  { value: "g", label: "g" },
  { value: "kg", label: "kg" },
  { value: "ml", label: "ml" },
  { value: "L", label: "L" },
  { value: "oz", label: "oz" },
  { value: "lb", label: "lb" },
  { value: "pack", label: "pack" },
];

export function formatQuantity(quantity, unit) {
  if (!quantity) return "";
  if (unit === "count" || !unit) return `${quantity}`;
  return `${quantity} ${unit}`;
}
