import { useState, useEffect, useRef, useMemo } from "react";
import { SlidersHorizontal, Search, Mic, Square, X } from "lucide-react";
import { searchRecipes } from "../api/spoonacular";
import { searchRecipesFallback } from "../api/themealdb";
import { transcribeAudio } from "../api/elevenlabs";
import { rankRecipes } from "../utils/matching";
import { MEAL_TYPES, MOODS, DIETS, CUISINES, COOK_TIMES } from "../data/recipeFilters";
import RecipeCard from "./RecipeCard";
import AIFallback from "./AIFallback";

export default function RecipeFinder({ pantry, expiringSoon, onSelectRecipe }) {
  // The pantry can legitimately hold multiple entries with the same name
  // (e.g. two bags of rice bought on different days, each with its own
  // expiry) — that's intentional and tracked elsewhere. But this picker is
  // "which ingredients to search with," not an inventory list, so it
  // should only ever show one chip per unique name. Pantry staples (rice,
  // pasta, flour, oil, etc.) are excluded from urgency tracking elsewhere
  // but stay selectable here since they're still real ingredients you
  // might deliberately want to search with.
  const usableIngredients = Array.from(
    new Map(pantry.map((item) => [item.name, item])).values()
  );

  const [selectedNames, setSelectedNames] = useState(() => usableIngredients.map((i) => i.name));
  const [mealType, setMealType] = useState("");
  const [moodIndex, setMoodIndex] = useState(0);
  const [diet, setDiet] = useState("");
  const [cuisine, setCuisine] = useState("");
  const [maxTime, setMaxTime] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [voiceQuery, setVoiceQuery] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [recipes, setRecipes] = useState([]);
  const [searched, setSearched] = useState(false);
  const [usingFallback, setUsingFallback] = useState(false);

  const [recording, setRecording] = useState(false);
  const [transcribing, setTranscribing] = useState(false);
  const [voiceError, setVoiceError] = useState(null);
  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);

  const [sortOrder, setSortOrder] = useState("default");
  const [visibleCount, setVisibleCount] = useState(9);

  useEffect(() => {
    const pantryNames = Array.from(new Set(pantry.map((item) => item.name)));
    setSelectedNames((previous) => {
      const stillAvailable = previous.filter((name) => pantryNames.includes(name));
      const newlyAdded = pantryNames.filter((name) => !previous.includes(name));
      return [...stillAvailable, ...newlyAdded];
    });
  }, [pantry]);

  const sortedRecipes = useMemo(() => {
    if (sortOrder === "default") return recipes;
    const copy = [...recipes];
    copy.sort((a, b) =>
      sortOrder === "fewest-missing" ? a.missing.length - b.missing.length : b.missing.length - a.missing.length
    );
    return copy;
  }, [recipes, sortOrder]);

  const visibleRecipes = sortedRecipes.slice(0, visibleCount);
  const hasMore = visibleCount < sortedRecipes.length;

  function toggleIngredient(name) {
    setSelectedNames((prev) =>
      prev.includes(name) ? prev.filter((n) => n !== name) : [...prev, name]
    );
  }

  async function handleMicClick() {
    if (recording) {
      mediaRecorderRef.current?.stop();
      return;
    }

    setVoiceError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      chunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      recorder.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        setRecording(false);
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        setTranscribing(true);
        try {
          const text = await transcribeAudio(blob);
          if (text) {
            setVoiceQuery(text);
            handleFindRecipes(text);
          } else {
            setVoiceError("Didn't catch that — try again.");
          }
        } catch (err) {
          setVoiceError(err.message || "Voice search failed.");
        } finally {
          setTranscribing(false);
        }
      };

      mediaRecorderRef.current = recorder;
      recorder.start();
      setRecording(true);
    } catch {
      setVoiceError("Couldn't access the microphone.");
    }
  }

  function clearVoiceQuery() {
    setVoiceQuery("");
  }

  async function handleFindRecipes(overrideQuery) {
    setLoading(true);
    setError(null);
    setUsingFallback(false);
    setSearched(true);
    setVisibleCount(9);

    if (selectedNames.length === 0) {
      setError("Pick at least one ingredient to search with.");
      setRecipes([]);
      setLoading(false);
      return;
    }

    const selectedPantryItems = pantry.filter((i) => selectedNames.includes(i.name));

    try {
      const raw = await searchRecipes({
        ingredients: selectedNames,
        type: mealType,
        diet,
        cuisine,
        maxReadyTime: maxTime || undefined,
        query: (typeof overrideQuery === "string" ? overrideQuery : voiceQuery) || MOODS[moodIndex].query,
      });
      setRecipes(rankRecipes(raw, selectedPantryItems, expiringSoon));
    } catch (err) {
      // Spoonacular failed — most commonly a 402 (daily free-tier limit
      // reached). Fall back to TheMealDB rather than just showing an error,
      // since that's still real, sourced recipes, just from a different
      // provider. Diet and mood filters don't carry over — TheMealDB has
      // no equivalent — but ingredients, meal course, and cuisine still
      // apply where there's a clean mapping.
      try {
        const raw = await searchRecipesFallback({
          ingredients: selectedNames,
          type: mealType,
          cuisine,
        });
        setRecipes(rankRecipes(raw, selectedPantryItems, expiringSoon));
        setUsingFallback(true);
      } catch {
        setError(err.message || "Something went wrong searching for recipes.");
        setRecipes([]);
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    handleFindRecipes();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="recipe-finder">
      <div className="recipe-finder-header">
        <h2>Find Recipes</h2>
        <button onClick={() => setShowFilters((v) => !v)} className="filters-toggle">
          <SlidersHorizontal size={14} /> {showFilters ? "Hide filters" : "Filters"}
        </button>
        <button
          type="button"
          className={`mic-btn${recording ? " listening" : ""}`}
          onClick={handleMicClick}
          disabled={transcribing}
          aria-label={recording ? "Stop voice search" : "Search by voice"}
          title={recording ? "Stop voice search" : "Search by voice"}
        >
          {recording ? <Square size={16} /> : <Mic size={16} />}
        </button>
        <button onClick={() => handleFindRecipes()} disabled={loading}>
          <Search size={14} /> {loading ? "Searching..." : "Search"}
        </button>
      </div>

      {transcribing && <p className="fallback-notice">Transcribing…</p>}
      {voiceError && <p className="error">{voiceError}</p>}

      {voiceQuery && (
        <div className="chip-row chip-row-compact">
          <span className="chip ingredient-chip selected">
            "{voiceQuery}"
            <button type="button" onClick={clearVoiceQuery} aria-label="Clear voice search" className="chip-clear">
              <X size={12} />
            </button>
          </span>
        </div>
      )}

      {usableIngredients.length > 0 && (
        <div className="ingredient-picker">
          <div className="filter-label">Use these ingredients</div>
          <div className="chip-row">
            {usableIngredients.map((item) => (
              <button
                key={item.name}
                className={`chip ingredient-chip${selectedNames.includes(item.name) ? " selected" : ""}`}
                onClick={() => toggleIngredient(item.name)}
              >
                {item.name}
              </button>
            ))}
          </div>
        </div>
      )}

      {showFilters && (
        <div className="filter-panel">
          <div className="filter-group">
            <label>Meal course</label>
            <select value={mealType} onChange={(e) => setMealType(e.target.value)}>
              {MEAL_TYPES.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          <div className="filter-group">
            <label>Mood</label>
            <select value={moodIndex} onChange={(e) => setMoodIndex(Number(e.target.value))}>
              {MOODS.map((opt, i) => (
                <option key={opt.label} value={i}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          <div className="filter-group">
            <label>Diet</label>
            <select value={diet} onChange={(e) => setDiet(e.target.value)}>
              {DIETS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          <div className="filter-group">
            <label>Cuisine</label>
            <select value={cuisine} onChange={(e) => setCuisine(e.target.value)}>
              {CUISINES.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          <div className="filter-group">
            <label>Cook time</label>
            <select value={maxTime} onChange={(e) => setMaxTime(e.target.value)}>
              {COOK_TIMES.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      )}

      {usingFallback && (
        <p className="fallback-notice">
          Spoonacular's daily limit was reached — showing results from TheMealDB instead. Diet and
          mood filters don't apply to this source.
        </p>
      )}

      {error && <p className="error">{error}</p>}

      {!loading && !error && searched && recipes.length === 0 && (
        <p>No matching recipes found — try adjusting filters or adding more ingredients.</p>
      )}

      {!loading && recipes.length > 0 && (
        <div className="recipe-results-header">
          <div className="filter-group sort-group">
            <label>Sort by</label>
            <select value={sortOrder} onChange={(e) => setSortOrder(e.target.value)}>
              <option value="default">Best match</option>
              <option value="fewest-missing">Fewest ingredients needed</option>
              <option value="most-missing">Most ingredients needed</option>
            </select>
          </div>
        </div>
      )}

      {!loading && recipes.length > 0 && (
        <div className="recipe-grid">
          {visibleRecipes.map((r) => (
            <RecipeCard key={r.id} recipe={r} onSelect={onSelectRecipe} />
          ))}
        </div>
      )}

      {!loading && hasMore && (
        <div className="show-more-row">
          <button type="button" className="show-more-btn" onClick={() => setVisibleCount((c) => c + 9)}>
            Show more
          </button>
        </div>
      )}

      {!loading && searched && recipes.filter((r) => r.matchPercent >= 50).length < 2 && (
        <AIFallback
          onBroaden={() => handleFindRecipes()}
          selectedNames={selectedNames}
          mealType={mealType}
          mood={MOODS[moodIndex].label}
          diet={diet}
          cuisine={cuisine}
          pantry={pantry}
          expiringSoon={expiringSoon}
          onSelectRecipe={onSelectRecipe}
        />
      )}
    </div>
  );
}
