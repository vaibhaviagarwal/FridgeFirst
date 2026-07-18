import { useState, useRef, useEffect } from "react";
import { X, Clock, Check, Volume2, Square, Sparkles, RefreshCw } from "lucide-react";
import { textToSpeech } from "../api/elevenlabs";
import { generateRankedRecipe } from "../utils/aiRecipe";

export default function RecipeDetails({ recipe, onClose, onMarkUsed, onRegenerate }) {
  const [checked, setChecked] = useState(() => new Set(recipe.have.map((h) => h.pantryName)));
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
    setChecked((prev) => {
      const next = new Set(prev);
      if (next.has(pantryName)) next.delete(pantryName);
      else next.add(pantryName);
      return next;
    });
  }

  function handleMarkUsed() {
    const usedNames = recipe.have
      .filter((h) => checked.has(h.pantryName))
      .map((h) => h.pantryName);
    onMarkUsed(usedNames, recipe.title);
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
          {recipe.have.map((h) => (
            <label key={h.pantryName}>
              <input
                type="checkbox"
                checked={checked.has(h.pantryName)}
                onChange={() => toggle(h.pantryName)}
              />
              {h.pantryName}
            </label>
          ))}
          <button className="mark-used-btn" onClick={handleMarkUsed} disabled={checked.size === 0}>
            <Check size={15} /> Mark Used
          </button>
        </div>
      </div>
    </div>
  );
}
