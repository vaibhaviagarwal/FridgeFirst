import { useState, useMemo } from "react";
import { Leaf, Clock, ChefHat, Check, CalendarPlus, Trash2 } from "lucide-react";
import CategoryIcon from "./CategoryIcon";

const SORT_OPTIONS = [
  { value: "expiry", label: "Sort by expiry" },
  { value: "alpha", label: "Sort A–Z" },
  { value: "recent", label: "Recently added" },
];

// Rough visual freshness indicator, not a precise measurement: caps at 14
// days so a just-added staple with a 1-year shelf life doesn't render as
// "100% fresh forever" — it's a relative-urgency cue, not a shelf-life clock.
function freshnessPercent(daysLeft) {
  return Math.max(0, Math.min(100, Math.round((daysLeft / 14) * 100)));
}

function formatAddedDate(iso) {
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function IngredientCard({ item, daysLeft, onRemove, onMarkUsed, onExtend, onMakeRecipes }) {
  const left = daysLeft(item);
  const isUrgent = !item.pantryStaple && left <= 3;
  const pct = item.pantryStaple ? 100 : freshnessPercent(left);

  return (
    <div className={`ingredient-card${isUrgent ? " urgent" : ""}`}>
      <div className="ingredient-card-icon">
        <CategoryIcon category={item.category} size={18} />
      </div>

      <div className="ingredient-card-main">
        <div className="ingredient-card-name">
          {item.name}
          {item.quantity ? ` (${item.quantity})` : ""}
        </div>
        <div className="ingredient-card-meta">
          <span className="meta-category">{item.category}</span>
          <span className="meta-sep">·</span>
          <span className="meta-added">Added {formatAddedDate(item.addedAt)}</span>
        </div>
      </div>

      <div className="ingredient-card-freshness">
        <div className="freshness-label">
          {item.pantryStaple
            ? "Long shelf life"
            : left <= 0
              ? "Expired"
              : left === 1
                ? "1 day left"
                : `${left} days left`}
        </div>
        <div className="freshness-bar">
          <div
            className={`freshness-fill${isUrgent ? " urgent" : ""}`}
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>

      <div className="card-actions">
        <button onClick={() => onMakeRecipes(item)} title="Find recipes using this">
          <ChefHat size={15} />
        </button>
        <button onClick={() => onMarkUsed(item.id)} title="Mark used">
          <Check size={15} />
        </button>
        {!item.pantryStaple && (
          <button onClick={() => onExtend(item.id)} title="Still have this? Extend +3 days">
            <CalendarPlus size={15} />
          </button>
        )}
        <button onClick={() => onRemove(item)} title="Delete">
          <Trash2 size={15} />
        </button>
      </div>
    </div>
  );
}

export default function PantryList({ pantry, daysLeft, onRemove, onMarkUsed, onExtend, onMakeRecipes }) {
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState("expiry");
  const [categoryFilter, setCategoryFilter] = useState("all");

  const categories = useMemo(
    () => ["all", ...new Set(pantry.map((i) => i.category))],
    [pantry]
  );

  const filtered = useMemo(() => {
    let list = pantry;
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter((i) => i.name.includes(q));
    }
    if (categoryFilter !== "all") {
      list = list.filter((i) => i.category === categoryFilter);
    }
    const withMeta = list.map((i) => ({ ...i, _daysLeft: daysLeft(i) }));
    if (sort === "expiry") {
      withMeta.sort((a, b) => a._daysLeft - b._daysLeft);
    } else if (sort === "alpha") {
      withMeta.sort((a, b) => a.name.localeCompare(b.name));
    } else if (sort === "recent") {
      withMeta.sort((a, b) => new Date(b.addedAt) - new Date(a.addedAt));
    }
    return withMeta;
  }, [pantry, search, sort, categoryFilter, daysLeft]);

  if (pantry.length === 0) {
    return (
      <div className="pantry-empty">
        <Leaf size={40} className="empty-icon" strokeWidth={1.5} />
        <h2>No ingredients yet</h2>
        <p>Start by adding milk, eggs, spinach, or rice.</p>
      </div>
    );
  }

  const urgent = filtered.filter((item) => !item.pantryStaple && item._daysLeft <= 3);
  const rest = filtered.filter((item) => item.pantryStaple || item._daysLeft > 3);

  return (
    <div className="pantry-manager">
      <div className="pantry-controls">
        <div className="pantry-search-wrap">
          <input
            type="text"
            className="pantry-search"
            placeholder="Search your pantry…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          {search && (
            <button className="search-clear" onClick={() => setSearch("")} aria-label="Clear search">
              ×
            </button>
          )}
        </div>
        <select value={sort} onChange={(e) => setSort(e.target.value)}>
          {SORT_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      {categories.length > 2 && (
        <div className="category-chip-row">
          {categories.map((c) => (
            <button
              key={c}
              className={`category-chip${categoryFilter === c ? " active" : ""}`}
              onClick={() => setCategoryFilter(c)}
            >
              {c !== "all" && <CategoryIcon category={c} size={13} />}
              {c === "all" ? "All" : c}
            </button>
          ))}
        </div>
      )}

      {filtered.length === 0 ? (
        <p className="pantry-no-results">No ingredients match "{search}".</p>
      ) : (
        <div className="pantry-groups">
          {urgent.length > 0 && (
            <section className="pantry-group">
              <h3 className="pantry-group-title">
                <Clock size={15} /> Urgent Soon
              </h3>
              <div className="ingredient-card-list">
                {urgent.map((item) => (
                  <IngredientCard
                    key={item.id}
                    item={item}
                    daysLeft={daysLeft}
                    onRemove={onRemove}
                    onMarkUsed={onMarkUsed}
                    onExtend={onExtend}
                    onMakeRecipes={onMakeRecipes}
                  />
                ))}
              </div>
            </section>
          )}

          {rest.length > 0 && (
            <section className="pantry-group">
              <h3 className="pantry-group-title">Everything Else</h3>
              <div className="ingredient-card-list">
                {rest.map((item) => (
                  <IngredientCard
                    key={item.id}
                    item={item}
                    daysLeft={daysLeft}
                    onRemove={onRemove}
                    onMarkUsed={onMarkUsed}
                    onExtend={onExtend}
                    onMakeRecipes={onMakeRecipes}
                  />
                ))}
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  );
}
