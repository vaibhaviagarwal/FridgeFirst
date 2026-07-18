import { useState, useEffect, useCallback } from "react";
import { getShelfLifeDefault } from "../data/shelfLife";
import { parseQuickAdd } from "../utils/quickAddParser";

const STORAGE_KEY = "fridgefirst.pantry";
const RESCUE_LOG_KEY = "fridgefirst.rescueLog";
const RECENT_KEY = "fridgefirst.recentNames";
const RECENT_LIMIT = 8;

function loadJSON(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

let idCounter = 1;

function buildItem(name, quantity, unit, expiryDays) {
  const shelfLife = getShelfLifeDefault(name);
  const days = expiryDays !== null && expiryDays !== undefined ? expiryDays : shelfLife.days;
  const expiryDate = new Date();
  expiryDate.setDate(expiryDate.getDate() + days);

  const numericQuantity = quantity !== null && quantity !== undefined && quantity !== "" ? Number(quantity) : null;

  return {
    id: idCounter++,
    name,
    quantity: numericQuantity && numericQuantity > 0 ? numericQuantity : null,
    unit: numericQuantity ? unit || "count" : null,
    category: shelfLife.category,
    pantryStaple: shelfLife.pantryStaple,
    expiresAt: expiryDate.toISOString(),
    addedAt: new Date().toISOString(),
  };
}

export function usePantry() {
  const [pantry, setPantry] = useState(() => {
    const loaded = loadJSON(STORAGE_KEY, []);
    // idCounter starts at 1 every session — without this, a fresh session
    // could hand out ids that collide with ones already in localStorage
    // from a previous session, causing remove/mark-used to hit the wrong
    // item. Seed it past whatever's already saved.
    const maxId = loaded.reduce((max, item) => Math.max(max, item.id || 0), 0);
    if (maxId >= idCounter) idCounter = maxId + 1;
    return loaded;
  });
  const [rescueLog, setRescueLog] = useState(() => loadJSON(RESCUE_LOG_KEY, []));
  const [recentNames, setRecentNames] = useState(() => loadJSON(RECENT_KEY, []));

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(pantry));
  }, [pantry]);

  useEffect(() => {
    localStorage.setItem(RESCUE_LOG_KEY, JSON.stringify(rescueLog));
  }, [rescueLog]);

  useEffect(() => {
    localStorage.setItem(RECENT_KEY, JSON.stringify(recentNames));
  }, [recentNames]);

  const rememberRecent = useCallback((name) => {
    setRecentNames((prev) => {
      const next = [name, ...prev.filter((n) => n !== name)];
      return next.slice(0, RECENT_LIMIT);
    });
  }, []);

  // Direct add — used by quick-start chips, the structured add form, and
  // voice input. Bypasses the free-text parser entirely.
  //
  // Multiple pantry entries with the same name are allowed on purpose —
  // e.g. two bags of rice bought on different days genuinely have
  // different expiry dates and should be tracked separately. Anything
  // that treats ingredients by *name* (the Recipe Finder picker, matching
  // logic) is responsible for deduping there instead of collapsing this
  // list.
  const addItem = useCallback(
    ({ name, quantity = null, unit = null, expiryDays = null }) => {
      const trimmed = (name || "").trim();
      if (!trimmed) return null;
      const item = buildItem(trimmed.toLowerCase(), quantity, unit, expiryDays);
      setPantry((prev) => [...prev, item]);
      rememberRecent(item.name);
      return item;
    },
    [rememberRecent]
  );

  // Free-text fallback for power users who'd rather type
  // "spinach 3 days" than use the structured form.
  const addFromQuickAdd = useCallback(
    (input) => {
      const parsed = parseQuickAdd(input);
      if (!parsed) return null;
      return addItem({
        name: parsed.name,
        quantity: parsed.quantity,
        expiryDays: parsed.expiryDays,
      });
    },
    [addItem]
  );


  const removeItem = useCallback((id) => {
    setPantry((prev) => prev.filter((item) => item.id !== id));
  }, []);

  // Full local reset — this app has no accounts/backend, so "clear all
  // data" from the account panel is the closest equivalent to a real
  // account action (sign out / delete account) available here.
  const clearAllData = useCallback(() => {
    setPantry([]);
    setRescueLog([]);
    setRecentNames([]);
  }, []);

  // Restores an exact item object (used for "Undo" after a delete).
  const restoreItem = useCallback((item) => {
    setPantry((prev) => [...prev, item]);
  }, []);

  const extendExpiry = useCallback((id, days = 3) => {
    setPantry((prev) =>
      prev.map((item) => {
        if (item.id !== id) return item;
        const next = new Date(item.expiresAt);
        next.setDate(next.getDate() + days);
        return { ...item, expiresAt: next.toISOString() };
      })
    );
  }, []);

  const markUsed = useCallback((ids, recipeTitle) => {
    setPantry((prev) => prev.filter((item) => !ids.includes(item.id)));
    setRescueLog((prev) => [
      ...prev,
      { date: new Date().toISOString(), count: ids.length, recipeTitle: recipeTitle || null },
    ]);
  }, []);

  const markUsedSingle = useCallback(
    (id) => {
      markUsed([id], null);
    },
    [markUsed]
  );

  // Recipe-completion version of markUsed: usages is [{ id, amount }].
  // Items without quantity tracking (amount undefined/null) are removed
  // entirely, same as before. Quantity-tracked items are decremented by
  // `amount` and only removed once nothing's left — so checking off "eggs"
  // on a recipe that used 2 of your 5 doesn't wipe out the other 3.
  const markUsedWithQuantities = useCallback(
    (usages, recipeTitle) => {
      const removeIds = [];
      setPantry((prev) =>
        prev.reduce((acc, item) => {
          const usage = usages.find((u) => u.id === item.id);
          if (!usage) {
            acc.push(item);
            return acc;
          }
          const hasQty = item.quantity != null;
          const remaining = hasQty ? item.quantity - (usage.amount ?? item.quantity) : 0;
          if (!hasQty || remaining <= 0) {
            removeIds.push(item.id);
            return acc;
          }
          acc.push({ ...item, quantity: remaining });
          return acc;
        }, [])
      );
      setRescueLog((prev) => [
        ...prev,
        { date: new Date().toISOString(), count: usages.length, recipeTitle: recipeTitle || null },
      ]);
      return removeIds;
    },
    []
  );

  // Lets a quantity-tracked item be adjusted up (bought more) or down (used
  // some) without removing/re-adding it. Hitting zero counts as "used up" —
  // routed through markUsed so it still logs to the rescue streak, same as
  // the full "Mark used" action.
  const adjustQuantity = useCallback(
    (id, delta) => {
      const item = pantry.find((i) => i.id === id);
      if (!item || !item.quantity) return;

      const next = item.quantity + delta;
      if (next <= 0) {
        markUsed([id], null);
        return;
      }
      setPantry((prev) => prev.map((i) => (i.id === id ? { ...i, quantity: next } : i)));
    },
    [pantry, markUsed]
  );

  const daysLeft = useCallback((item) => {
    const diffMs = new Date(item.expiresAt) - new Date();
    return Math.ceil(diffMs / (1000 * 60 * 60 * 24));
  }, []);

  // Urgency-first grouping: every non-staple item lands in exactly one
  // bucket, so the dashboard can lead with "what needs attention" instead
  // of just a filtered slice of the pantry.
  const withDays = pantry.map((item) => ({ ...item, daysLeft: daysLeft(item) }));
  const eatToday = withDays
    .filter((i) => !i.pantryStaple && i.daysLeft <= 1)
    .sort((a, b) => a.daysLeft - b.daysLeft);
  const eatSoon = withDays
    .filter((i) => !i.pantryStaple && i.daysLeft > 1 && i.daysLeft <= 3)
    .sort((a, b) => a.daysLeft - b.daysLeft);
  const fresh = withDays.filter((i) => i.pantryStaple || i.daysLeft > 3);

  // Kept for any code still expecting the old "expiring within 3 days" list.
  const expiringSoon = [...eatToday, ...eatSoon];

  const totalRescued = rescueLog.reduce((sum, entry) => sum + entry.count, 0);

  // Simple, non-gamified streak: consecutive calendar days with at least
  // one rescue, counting back from today (or yesterday, so it doesn't
  // reset the instant midnight passes).
  const streak = (() => {
    if (rescueLog.length === 0) return 0;
    const dateStrings = [...new Set(rescueLog.map((e) => new Date(e.date).toDateString()))]
      .map((d) => new Date(d))
      .sort((a, b) => b - a);

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const mostRecent = dateStrings[0];
    const diffFromToday = Math.round((today - mostRecent) / (1000 * 60 * 60 * 24));
    if (diffFromToday > 1) return 0;

    let count = 1;
    for (let i = 1; i < dateStrings.length; i++) {
      const diff = Math.round((dateStrings[i - 1] - dateStrings[i]) / (1000 * 60 * 60 * 24));
      if (diff === 1) count++;
      else break;
    }
    return count;
  })();

  return {
    pantry,
    eatToday,
    eatSoon,
    fresh,
    expiringSoon,
    addItem,
    addFromQuickAdd,
    removeItem,
    restoreItem,
    clearAllData,
    extendExpiry,
    markUsed,
    markUsedSingle,
    markUsedWithQuantities,
    adjustQuantity,
    daysLeft,
    rescueLog,
    totalRescued,
    recentNames,
    streak,
  };
}
