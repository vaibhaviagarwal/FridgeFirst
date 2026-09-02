import { useState, useEffect, useCallback } from "react";
import {
  adjustItemQuantity,
  applyUsageWithQuantities,
  calculateRescueStreak,
  createPantryItem,
  getDaysLeft,
  groupPantryByUrgency,
} from "../utils/pantry";

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
  return createPantryItem({ id: idCounter++, name, quantity, unit, expiryDays });
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

  // Shared add path once any UI input has been normalized — used by the
  // chip shortcuts, the structured form, quick-add parsing, and voice input.
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
      const { pantry: nextPantry } = applyUsageWithQuantities(pantry, usages);
      setPantry(nextPantry);
      setRescueLog((prev) => [
        ...prev,
        { date: new Date().toISOString(), count: usages.length, recipeTitle: recipeTitle || null },
      ]);
    },
    [pantry]
  );

  // Lets a quantity-tracked item be adjusted up (bought more) or down (used
  // some) without removing/re-adding it. Hitting zero counts as "used up"
  // and still logs to the rescue history, matching the full "Mark used"
  // action.
  const adjustQuantity = useCallback(
    (id, delta) => {
      const { pantry: nextPantry, usedUpIds } = adjustItemQuantity(pantry, id, delta);
      if (nextPantry === pantry) return;

      setPantry(nextPantry);
      if (usedUpIds.length > 0) {
        setRescueLog((prev) => [
          ...prev,
          { date: new Date().toISOString(), count: usedUpIds.length, recipeTitle: null },
        ]);
        return;
      }
    },
    [pantry]
  );

  const daysLeft = useCallback((item) => getDaysLeft(item), []);

  const { eatToday, eatSoon, fresh, expiringSoon } = groupPantryByUrgency(pantry);

  const totalRescued = rescueLog.reduce((sum, entry) => sum + entry.count, 0);

  const streak = calculateRescueStreak(rescueLog);

  return {
    pantry,
    eatToday,
    eatSoon,
    fresh,
    expiringSoon,
    addItem,
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
