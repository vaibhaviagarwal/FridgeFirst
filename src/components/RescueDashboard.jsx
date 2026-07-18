import { Package, Clock, PartyPopper, Flame, AlertTriangle, CircleAlert, CheckCircle2, ChefHat, Check, ChevronRight } from "lucide-react";
import CategoryIcon from "./CategoryIcon";
import { useRecipeSuggestions } from "../hooks/useRecipeSuggestions";

function UrgencyGroup({ title, Icon, items }) {
  if (items.length === 0) return null;
  return (
    <div className="urgency-group">
      <h3 className="urgency-group-title">
        <Icon size={16} /> {title}
      </h3>
      <ul className="urgency-list">
        {items.map((item) => (
          <li key={item.id}>
            <CategoryIcon category={item.category} size={16} />
            <span className="name">{item.name}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function RescueDashboard({
  eatToday,
  eatSoon,
  pantry,
  expiringSoon,
  pantryCount,
  totalRescued,
  streak,
  onFindRecipes,
  onSelectRecipe,
}) {
  const { suggestions, loading } = useRecipeSuggestions(pantry, expiringSoon);

  const canMake = suggestions.filter((r) => r.matchPercent >= 80).slice(0, 3);
  const almost = suggestions
    .filter((r) => r.matchPercent < 80 && r.missing.length === 1)
    .slice(0, 2);

  if (pantryCount === 0) {
    return (
      <div className="rescue-dashboard empty">
        <Package size={40} className="empty-icon" strokeWidth={1.5} />
        <h2>Your pantry is empty</h2>
        <p>Add a few ingredients above to discover recipes and track freshness.</p>
      </div>
    );
  }

  return (
    <div className="rescue-dashboard">
      <div className="stats-row">
        <div className="stat">
          <div className="stat-value">{pantryCount}</div>
          <div className="stat-label">
            <Package size={12} /> in pantry
          </div>
        </div>
        <div className="stat">
          <div className="stat-value">{eatToday.length + eatSoon.length}</div>
          <div className="stat-label">
            <Clock size={12} /> expiring soon
          </div>
        </div>
        <div className="stat">
          <div className="stat-value">{totalRescued}</div>
          <div className="stat-label">
            <PartyPopper size={12} /> rescued total
          </div>
        </div>
        {streak > 1 && (
          <div className="stat">
            <div className="stat-value">{streak}</div>
            <div className="stat-label">
              <Flame size={12} /> day streak
            </div>
          </div>
        )}
      </div>

      {eatToday.length === 0 && eatSoon.length === 0 ? (
        <p className="all-fresh-note">
          <CheckCircle2 size={16} /> Everything in your pantry is fresh right now.
        </p>
      ) : (
        <>
          <UrgencyGroup title="Eat Today" Icon={AlertTriangle} items={eatToday} />
          <UrgencyGroup title="Eat Soon" Icon={CircleAlert} items={eatSoon} />
        </>
      )}

      {(canMake.length > 0 || almost.length > 0) && (
        <div className="proactive-recipes">
          <h3 className="urgency-group-title">
            <ChefHat size={16} /> You can make
          </h3>
          {canMake.length > 0 && (
            <ul className="can-make-list">
              {canMake.map((r) => (
                <li key={r.id} onClick={() => onSelectRecipe(r)}>
                  <Check size={14} /> {r.title}
                </li>
              ))}
            </ul>
          )}
          {almost.length > 0 && (
            <div className="almost-list">
              <div className="almost-label">Missing one ingredient:</div>
              {almost.map((r) => (
                <div key={r.id} className="almost-item" onClick={() => onSelectRecipe(r)}>
                  <ChevronRight size={13} /> {r.title}{" "}
                  <span className="almost-missing">(need {r.missing[0]})</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
      {loading && suggestions.length === 0 && (
        <p className="suggestions-loading">Finding recipes you can make…</p>
      )}

      <button className="find-recipes-btn" onClick={onFindRecipes}>
        Browse All Recipes
      </button>
    </div>
  );
}
