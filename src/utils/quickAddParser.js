// Parses a single free-text quick-add input like:
//   "spinach 3 days"
//   "spinach"
//   "2 eggs today"
//   "milk expires tomorrow"
// into { name, quantity, expiryDays } — expiryDays is null if not specified,
// in which case getShelfLifeDefault() fills it in.

const DAY_WORD_MAP = {
  today: 0,
  tomorrow: 1,
};

export function parseQuickAdd(input) {
  let text = input.trim().toLowerCase();
  if (!text) return null;

  let expiryDays = null;

  // "today" / "tomorrow"
  for (const [word, days] of Object.entries(DAY_WORD_MAP)) {
    if (text.includes(word)) {
      expiryDays = days;
      text = text.replace(word, "");
    }
  }

  // "N day(s)" or "N-day"
  if (expiryDays === null) {
    const dayMatch = text.match(/(\d+)\s*-?\s*days?/);
    if (dayMatch) {
      expiryDays = parseInt(dayMatch[1], 10);
      text = text.replace(dayMatch[0], "");
    }
  }

  // strip filler words
  text = text
    .replace(/\bexpires?\b/g, "")
    .replace(/\bin\b/g, "")
    .replace(/\bleft\b/g, "")
    .trim();

  // strip a leading quantity number (e.g. "2 eggs" -> "eggs", remember qty)
  let quantity = null;
  const qtyMatch = text.match(/^(\d+)\s+(.*)/);
  if (qtyMatch) {
    quantity = qtyMatch[1];
    text = qtyMatch[2];
  }

  const name = text.replace(/\s+/g, " ").trim();
  if (!name) return null;

  return { name, quantity, expiryDays };
}
