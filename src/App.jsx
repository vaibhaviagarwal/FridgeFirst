import { useState, useRef, useEffect } from "react";
import { LayoutDashboard, Package, UtensilsCrossed, History, Bell, User } from "lucide-react";
import { usePantry } from "./hooks/usePantry";
import { useToast } from "./hooks/useToast";
import QuickAdd from "./components/QuickAdd";
import RescueDashboard from "./components/RescueDashboard";
import PantryList from "./components/PantryList";
import RecipeFinder from "./components/RecipeFinder";
import RecipeDetails from "./components/RecipeDetails";
import RescueCounter from "./components/RescueCounter";
import Toast from "./components/Toast";
import "./App.css";

export default function App() {
  const {
    pantry,
    eatToday,
    eatSoon,
    expiringSoon,
    addItem,
    removeItem,
    restoreItem,
    extendExpiry,
    markUsed,
    markUsedSingle,
    daysLeft,
    rescueLog,
    totalRescued,
    recentNames,
    streak,
  } = usePantry();

  const [view, setView] = useState("dashboard"); // dashboard | pantry | recipes | history
  const [selectedRecipe, setSelectedRecipe] = useState(null);
  const recipeFinderKey = useRef(0);
  const { toast, showToast, dismissToast } = useToast();

  // Progressive disclosure: History only becomes relevant once there's
  // something in it, so a brand-new user isn't shown a nav tab that leads
  // to an empty page.
  const hasHistory = rescueLog.length > 0;

  // Habit-building nudge: a native notification once per launch if
  // anything needs attention today. Browsers/Electron both support the
  // Notification Web API directly from the renderer.
  useEffect(() => {
    if (eatToday.length === 0) return;
    if (typeof Notification === "undefined") return;

    const fire = () => {
      new Notification("FridgeFirst", {
        body: `${eatToday.length} ingredient${eatToday.length === 1 ? "" : "s"} should be used today.`,
      });
    };

    if (Notification.permission === "granted") {
      fire();
    } else if (Notification.permission !== "denied") {
      Notification.requestPermission().then((perm) => {
        if (perm === "granted") fire();
      });
    }
    // Only fire once per app load, not on every pantry change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleFindRecipes() {
    recipeFinderKey.current += 1;
    setView("recipes");
  }

  function handleAddItem(spec) {
    const item = addItem(spec);
    if (item) showToast(`✓ Added ${item.name}`, { label: "Undo", onClick: () => removeItem(item.id) });
    return item;
  }

  function handleRemove(item) {
    removeItem(item.id);
    showToast(`Removed ${item.name}`, { label: "Undo", onClick: () => restoreItem(item) });
  }

  function handleMarkUsedSingle(id) {
    const item = pantry.find((i) => i.id === id);
    markUsedSingle(id);
    if (item) showToast(`✓ Marked ${item.name} as used`);
  }

  function handleExtend(id) {
    extendExpiry(id, 3);
    showToast("Extended by 3 days");
  }

  function handleMakeRecipesFor() {
    handleFindRecipes();
  }

  // RecipeDetails reports back a list of pantry-item *names* that were used;
  // resolve those to ids here since usePantry.markUsed operates on ids.
  function handleMarkUsed(pantryNames, recipeTitle) {
    const ids = pantry
      .filter((item) => pantryNames.includes(item.name))
      .map((item) => item.id);
    markUsed(ids, recipeTitle);
    setSelectedRecipe(null);
    showToast(`✓ Marked ${ids.length} ingredient${ids.length === 1 ? "" : "s"} as used`);
  }

  return (
    <div className="app">
      <div className="status-bar">
        <span className="status-greeting">Welcome back</span>
        <div className="status-bar-right">
          <button className="icon-btn" aria-label="Notifications" title="Notifications">
            <Bell size={15} />
            {eatToday.length > 0 && <span className="badge">{eatToday.length}</span>}
          </button>
          <div className="avatar" title="Account">
            <User size={14} />
          </div>
        </div>
      </div>

      <header className="app-header">
        <h1>
          <img src="./logo-outline.svg" alt="" className="logo-mark" width={22} height={22} /> FridgeFirst
        </h1>
        <nav>
          <button className={view === "dashboard" ? "active" : ""} onClick={() => setView("dashboard")}>
            <LayoutDashboard size={15} /> Rescue
          </button>
          <button className={view === "pantry" ? "active" : ""} onClick={() => setView("pantry")}>
            <Package size={15} /> Pantry
          </button>
          <button className={view === "recipes" ? "active" : ""} onClick={() => setView("recipes")}>
            <UtensilsCrossed size={15} /> Recipes
          </button>
          {hasHistory && (
            <button className={view === "history" ? "active" : ""} onClick={() => setView("history")}>
              <History size={15} /> History
            </button>
          )}
        </nav>
      </header>

      <main>
        <QuickAdd onAddItem={handleAddItem} recentNames={recentNames} pantryEmpty={pantry.length === 0} />

        {view === "dashboard" && (
          <RescueDashboard
            eatToday={eatToday}
            eatSoon={eatSoon}
            pantry={pantry}
            expiringSoon={expiringSoon}
            pantryCount={pantry.length}
            totalRescued={totalRescued}
            streak={streak}
            onFindRecipes={handleFindRecipes}
            onSelectRecipe={setSelectedRecipe}
          />
        )}

        {view === "pantry" && (
          <PantryList
            pantry={pantry}
            daysLeft={daysLeft}
            onRemove={handleRemove}
            onMarkUsed={handleMarkUsedSingle}
            onExtend={handleExtend}
            onMakeRecipes={handleMakeRecipesFor}
          />
        )}

        {view === "recipes" && (
          <RecipeFinder
            key={recipeFinderKey.current}
            pantry={pantry}
            expiringSoon={expiringSoon}
            onSelectRecipe={setSelectedRecipe}
          />
        )}

        {view === "history" && hasHistory && (
          <RescueCounter rescueLog={rescueLog} totalRescued={totalRescued} />
        )}
      </main>

      {selectedRecipe && (
        <RecipeDetails
          key={selectedRecipe.id}
          recipe={selectedRecipe}
          onClose={() => setSelectedRecipe(null)}
          onMarkUsed={handleMarkUsed}
          onRegenerate={setSelectedRecipe}
        />
      )}

      <Toast toast={toast} onDismiss={dismissToast} />
    </div>
  );
}
