import { useState } from "react";
import { Sparkles } from "lucide-react";
import { generateRankedRecipe } from "../utils/aiRecipe";

// AI fallback stays a backup, not a feature pillar: it only appears when
// results are sparse. Generated recipes are clearly labeled as AI-made
// (no sourceUrl, badge in the details view) rather than passed off as real.
export default function AIFallback({ onBroaden, selectedNames, mealType, mood, diet, cuisine, pantry, expiringSoon, onSelectRecipe }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  async function handleGenerate() {
    setLoading(true);
    setError(null);
    try {
      const ranked = await generateRankedRecipe({
        selectedNames,
        mealType,
        mood,
        diet,
        cuisine,
        pantry,
        expiringSoon,
      });
      onSelectRecipe(ranked);
    } catch (err) {
      setError(err.message || "Couldn't generate a recipe.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="ai-fallback">
      <p>Couldn't find many matching recipes.</p>
      <div className="ai-fallback-actions">
        <button onClick={onBroaden}>Broaden search</button>
        <button className="ai-generate-btn" onClick={handleGenerate} disabled={loading}>
          <Sparkles size={14} /> {loading ? "Generating…" : "Generate a custom recipe with AI"}
        </button>
      </div>
      {error && <p className="field-error">{error}</p>}
    </div>
  );
}
