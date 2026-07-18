import { useState, useRef, useEffect } from "react";
import { X, Clock, Check, Volume2, Square, Sparkles, RefreshCw } from "lucide-react";
import { textToSpeech } from "../api/elevenlabs";
import { generateRankedRecipe } from "../utils/aiRecipe";
import { formatQuantity } from "../data/units";

// For each pantry item this recipe touches, default the "how many did you
// use" amount to the item's full quantity — matches the old all-or-nothing
// behavior unless the user dials it down. Untracked items (no quantity) map
// to null, meaning "use the whole entry" since there's nothing to partially
// deduct from.
function initialUsage(have, pantry) {
  const map = new Map();
  have.forEach((h) => {
    const pantryItem = pantry.find((p) => p.name === h.pantryName);
    map.set(h.pantryName, pantryItem?.quantity ?? null);
  });
  return map;
}

export default function RecipeDetails({ recipe, onClose, onMarkUsed, onRegenerate, pantry }) {
  const [usedAmounts, setUsedAmounts] = useState(() => initialUsage(recipe.have, pantry));
  const [speaking, setSpeaking] = useState(false);
  const [speechError, setSpeechError] = useState(null);
  const [regenerating, setRegenerating] = useState(false);
  const [regenError, setRegenError] = useState(null);
  const audioRef = useRef(null);

  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        URL.revokeObjectURL(audioRef.current.src);
      }
    };
  }, []);

  async function handleReadAloud() {
    if (speaking) {
      audioRef.current?.pause();
      setSpeaking(false);
      return;
    }
    if (!recipe.instructions) {
      setSpeechError("No instructions available to read for this recipe.");
      return;
    }
    setSpeechError(null);
    try {
      const url = await textToSpeech(recipe.instructions);
      const audio = new Audio(url);
      audioRef.current = audio;
      audio.onended = () => {
        setSpeaking(false);
        URL.revokeObjectURL(url);
      };
      audio.onerror = () => {
        setSpeaking(false);
        setSpeechError("Playback failed.");
      };
      await audio.play();
      setSpeaking(true);
    } catch (err) {
      setSpeaking(false);
      setSpeechError(err.message || "Couldn't read this recipe aloud.");
    }
  }

  async function handleRegenerate() {
    if (!recipe.aiParams) return;
    setRegenerating(true);
    setRegenError(null);
    try {
      const fresh = await generateRankedRecipe(recipe.aiParams);
      onRegenerate(fresh);
    } catch (err) {
      setRegenError(err.message || "Couldn't regenerate this recipe.");
    } finally {
      setRegenerating(false);
    }
  }

  function toggle(pantryName) {
    setUsedAmounts((prev) => {
      const next = new Map(prev);
      if (next.has(pantryName)) {
        next.delete(pantryName);
      } else {
        const pantryItem = pantry.find((p) => p.name === pantryName);
        next.set(pantryName, pantryItem?.quantity ?? null);
      }
      return next;
    });
  }

  function setAmount(pantryName, amount, max) {
    const clamped = Math.min(max, Math.max(1, Number(amount) || 1));
    setUsedAmounts((prev) => new Map(prev).set(pantryName, clamped));
  }

  function handleMarkUsed() {
    const usages = recipe.have
      .filter((h) => usedAmounts.has(h.pantryName))
      .map((h) => ({ pantryName: h.pantryName, amount: usedAmounts.get(h.pantryName) }));
    onMarkUsed(usages, recipe.title);
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal recipe-details" onClick={(e) => e.stopPropagation()}>
        <button className="close-btn" onClick={onClose} aria-label="Close">
          <X size={18} />
        </button>
        {recipe.image && <img src={recipe.image} alt={recipe.title} />}
        <h2>{recipe.title}</h2>
        {recipe.aiGenerated && (
          <div className="ai-badge-row">
            <span className="ai-badge">
              <Sparkles size={12} /> AI-generated — not a sourced recipe
            </span>
            {recipe.aiParams && (
              <button type="button" className="regenerate-btn" onClick={handleRegenerate} disabled={regenerating}>
                <RefreshCw size={12} className={regenerating ? "spin" : ""} />
                {regenerating ? "Regenerating…" : "Don't like it? Regenerate"}
              </button>
            )}
          </div>
        )}
        {regenError && <p className="field-error">{regenError}</p>}
        <div className="recipe-facts">
          {recipe.readyInMinutes && (
            <span>
              <Clock size={13} /> {recipe.readyInMinutes} min
            </span>
          )}
          {recipe.difficulty && <span>Difficulty: {recipe.difficulty}</span>}
        </div>

        <h3>Ingredients</h3>
        <ul className="ingredient-full-list">
          {recipe.ingredients.map((ing) => (
            <li key={ing}>{ing}</li>
          ))}
        </ul>

        {recipe.instructions && (
          <>
            <div className="instructions-header">
              <h3>Instructions</h3>
              <button
                type="button"
                className={`read-aloud-btn${speaking ? " speaking" : ""}`}
                onClick={handleReadAloud}
              >
                {speaking ? <Square size={13} /> : <Volume2 size={13} />}
                {speaking ? "Stop" : "Read aloud"}
              </button>
            </div>
            {speechError && <p className="field-error">{speechError}</p>}
            <p className="instructions-text">{recipe.instructions}</p>
          </>
        )}

        {recipe.sourceUrl && (
          <a href={recipe.sourceUrl} target="_blank" rel="noopener noreferrer" className="source-link">
            View original recipe →
          </a>
        )}

        <div className="mark-used-section">
          <h3>Mark ingredients used</h3>
          {recipe.have.map((h) => {
            const pantryItem = pantry.find((p) => p.name === h.pantryName);
            const isChecked = usedAmounts.has(h.pantryName);
            const hasQty = pantryItem?.quantity != null;
            return (
              <div key={h.pantryName} className="mark-used-row">
                <label>
                  <input
                    type="checkbox"
                    checked={isChecked}
                    onChange={() => toggle(h.pantryName)}
                  />
                  {h.pantryName}
                </label>
                {isChecked && hasQty && (
                  <div className="mark-used-amount">
                    <span>used</span>
                    <input
                      type="number"
                      min="1"
                      max={pantryItem.quantity}
                      value={usedAmounts.get(h.pantryName)}
                      onChange={(e) => setAmount(h.pantryName, e.target.value, pantryItem.quantity)}
                    />
                    <span>of {formatQuantity(pantryItem.quantity, pantryItem.unit)}</span>
                  </div>
                )}
              </div>
            );
          })}
          <button className="mark-used-btn" onClick={handleMarkUsed} disabled={usedAmounts.size === 0}>
            <Check size={15} /> Mark Used
          </button>
        </div>
      </div>
    </div>
  );
}
