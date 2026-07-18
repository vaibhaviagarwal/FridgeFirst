import { useState, useEffect, useRef } from "react";
import { suggestRecipesFromPantry } from "../api/themealdb";
import { rankRecipes } from "../utils/matching";

// Powers the proactive "You can make..." teaser on the Rescue Dashboard, so
// users see recipe ideas without having to visit the Recipes tab first.
// Uses TheMealDB (free, no rate limit) rather than Spoonacular, since this
// fires automatically in the background — the explicit Recipes tab search
// still uses Spoonacular. Caches by the exact set of non-staple pantry
// ingredient names, so it doesn't refetch on every render — only when
// what's in the pantry actually changes.
export function useRecipeSuggestions(pantry, expiringSoon) {
  const [suggestions, setSuggestions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const lastSignatureRef = useRef(null);

  useEffect(() => {
    const names = pantry.filter((i) => !i.pantryStaple).map((i) => i.name);
    if (names.length === 0) {
      setSuggestions([]);
      lastSignatureRef.current = null;
      return;
    }

    const signature = [...names].sort().join(",");
    if (signature === lastSignatureRef.current) return;
    lastSignatureRef.current = signature;

    let cancelled = false;
    setLoading(true);
    setError(null);

    suggestRecipesFromPantry(names)
      .then((raw) => {
        if (cancelled) return;
        setSuggestions(rankRecipes(raw, pantry, expiringSoon));
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err.message || "Couldn't load recipe suggestions.");
        setSuggestions([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pantry]);

  return { suggestions, loading, error };
}
