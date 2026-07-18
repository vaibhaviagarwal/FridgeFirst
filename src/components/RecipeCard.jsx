import { Check, Minus, Clock } from "lucide-react";

export default function RecipeCard({ recipe, onSelect }) {
  return (
    <div className="recipe-card" onClick={() => onSelect(recipe)}>
      {recipe.image && <img src={recipe.image} alt={recipe.title} />}
      <div className="recipe-card-body">
        <span className="match-tier">{recipe.matchTier}</span>
        <h3>{recipe.title}</h3>
        <div className="ingredient-lists">
          <div className="have">
            {recipe.have.map((h) => (
              <div key={h.name}>
                <Check size={13} /> {h.name}
              </div>
            ))}
          </div>
          {recipe.missing.length > 0 && (
            <div className="missing">
              <span className="missing-label">Need:</span>
              {recipe.missing.map((m) => (
                <div key={m}>
                  <Minus size={13} /> {m}
                </div>
              ))}
            </div>
          )}
        </div>
        {recipe.readyInMinutes && (
          <div className="recipe-meta">
            <Clock size={12} /> {recipe.readyInMinutes} min
          </div>
        )}
      </div>
    </div>
  );
}
