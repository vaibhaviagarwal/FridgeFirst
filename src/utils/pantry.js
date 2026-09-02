import { getShelfLifeDefault } from "../data/shelfLife";

const MS_PER_DAY = 1000 * 60 * 60 * 24;

function toNumericQuantity(quantity) {
  if (quantity === null || quantity === undefined || quantity === "") return null;

  const numericQuantity = Number(quantity);
  return Number.isFinite(numericQuantity) && numericQuantity > 0 ? numericQuantity : null;
}

export function createPantryItem({ id, name, quantity = null, unit = null, expiryDays = null }, now = new Date()) {
  const shelfLife = getShelfLifeDefault(name);
  const days = expiryDays !== null && expiryDays !== undefined ? expiryDays : shelfLife.days;
  const addedAt = new Date(now);
  const expiresAt = new Date(now);
  expiresAt.setDate(expiresAt.getDate() + days);

  const numericQuantity = toNumericQuantity(quantity);

  return {
    id,
    name: name.trim().toLowerCase(),
    quantity: numericQuantity,
    unit: numericQuantity ? unit || "count" : null,
    category: shelfLife.category,
    pantryStaple: shelfLife.pantryStaple,
    expiresAt: expiresAt.toISOString(),
    addedAt: addedAt.toISOString(),
  };
}

export function getDaysLeft(item, now = new Date()) {
  return Math.ceil((new Date(item.expiresAt) - new Date(now)) / MS_PER_DAY);
}

export function groupPantryByUrgency(pantry, now = new Date()) {
  const withDays = pantry.map((item) => ({ ...item, daysLeft: getDaysLeft(item, now) }));

  const eatToday = withDays
    .filter((item) => !item.pantryStaple && item.daysLeft <= 1)
    .sort((a, b) => a.daysLeft - b.daysLeft);

  const eatSoon = withDays
    .filter((item) => !item.pantryStaple && item.daysLeft > 1 && item.daysLeft <= 3)
    .sort((a, b) => a.daysLeft - b.daysLeft);

  const fresh = withDays.filter((item) => item.pantryStaple || item.daysLeft > 3);

  return {
    eatToday,
    eatSoon,
    fresh,
    expiringSoon: [...eatToday, ...eatSoon],
  };
}

export function applyUsageWithQuantities(pantry, usages) {
  const usageById = new Map(usages.map((usage) => [usage.id, usage]));
  const removedIds = [];

  const nextPantry = pantry.reduce((items, item) => {
    const usage = usageById.get(item.id);
    if (!usage) {
      items.push(item);
      return items;
    }

    const hasQuantity = item.quantity != null;
    const remaining = hasQuantity ? item.quantity - (usage.amount ?? item.quantity) : 0;

    if (!hasQuantity || remaining <= 0) {
      removedIds.push(item.id);
      return items;
    }

    items.push({ ...item, quantity: remaining });
    return items;
  }, []);

  return { pantry: nextPantry, removedIds };
}

export function adjustItemQuantity(pantry, id, delta) {
  const item = pantry.find((entry) => entry.id === id);
  if (!item || item.quantity == null) {
    return { pantry, usedUpIds: [] };
  }

  const nextQuantity = item.quantity + delta;
  if (nextQuantity <= 0) {
    return {
      pantry: pantry.filter((entry) => entry.id !== id),
      usedUpIds: [id],
    };
  }

  return {
    pantry: pantry.map((entry) => (entry.id === id ? { ...entry, quantity: nextQuantity } : entry)),
    usedUpIds: [],
  };
}

export function calculateRescueStreak(rescueLog, now = new Date()) {
  if (rescueLog.length === 0) return 0;

  const rescueDays = [...new Set(rescueLog.map((entry) => new Date(entry.date).toDateString()))]
    .map((dateString) => new Date(dateString))
    .sort((a, b) => b - a);

  const today = new Date(now);
  today.setHours(0, 0, 0, 0);

  const mostRecent = rescueDays[0];
  const diffFromToday = Math.round((today - mostRecent) / MS_PER_DAY);
  if (diffFromToday > 1) return 0;

  let streak = 1;
  for (let i = 1; i < rescueDays.length; i++) {
    const diff = Math.round((rescueDays[i - 1] - rescueDays[i]) / MS_PER_DAY);
    if (diff !== 1) break;
    streak += 1;
  }

  return streak;
}
