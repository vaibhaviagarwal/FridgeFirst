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
import NotificationsPanel from "./components/NotificationsPanel";
import AccountPanel from "./components/AccountPanel";
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
    clearAllData,
    extendExpiry,
    markUsedSingle,
    markUsedWithQuantities,
    adjustQuantity,
    daysLeft,
    rescueLog,
    totalRescued,
    recentNames,
    streak,
  } = usePantry();

  const [view, setView] = useState("dashboard"); // dashboard | pantry | recipes | history
  const [selectedRecipe, setSelectedRecipe] = useState(null);
  const [notifOpen, setNotifOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
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

  function handleAdjustQuantity(id, delta) {
    const item = pantry.find((i) => i.id === id);
    adjustQuantity(id, delta);
    if (item && item.quantity + delta <= 0) {
      showToast(`✓ Used up ${item.name}`);
    }
  }

  function handleClearData() {
    clearAllData();
    setView("dashboard");
    showToast("All local data cleared");
  }

  function handleMakeRecipesFor() {
    handleFindRecipes();
  }

  // RecipeDetails reports back [{ pantryName, amount }] — amount is how
  // much of that ingredient the recipe actually used (null means "all of
  // it" for items without quantity tracking). Resolve names to ids here
  // since usePantry operates on ids; if a name matches more than one
  // pantry entry (e.g. two separate egg cartons), the first match is used,
  // same tie-break as the recipe matching logic that built `have` in the
  // first place.
  function handleMarkUsed(usages, recipeTitle) {
    const resolved = usages
      .map(({ pantryName, amount }) => {
        const item = pantry.find((i) => i.name === pantryName);
        return item ? { id: item.id, amount } : null;
      })
      .filter(Boolean);
    markUsedWithQuantities(resolved, recipeTitle);
    setSelectedRecipe(null);
    showToast(`✓ Marked ${resolved.length} ingredient${resolved.length === 1 ? "" : "s"} as used`);
  }

  return (
    <div className="app">
      <div className="status-bar">
        <span className="status-greeting">Welcome back</span>
        <div className="status-bar-right">
          <div className="status-icon-wrap">
            <button
              className="icon-btn"
              aria-label="Notifications"
              title="Notifications"
              onClick={() => {
                setAccountOpen(false);
                setNotifOpen((v) => !v);
              }}
            >
              <Bell size={15} />
              {eatToday.length > 0 && <span className="badge">{eatToday.length}</span>}
            </button>
            {notifOpen && (
              <NotificationsPanel
                eatToday={eatToday}
                eatSoon={eatSoon}
                onViewPantry={() => setView("pantry")}
                onClose={() => setNotifOpen(false)}
              />
            )}
          </div>
          <div className="status-icon-wrap">
            <button
              className="avatar"
              title="Account"
              onClick={() => {
                setNotifOpen(false);
                setAccountOpen((v) => !v);
              }}
            >
              <User size={14} />
            </button>
            {accountOpen && (
              <AccountPanel
                streak={streak}
                totalRescued={totalRescued}
                onClearData={handleClearData}
                onClose={() => setAccountOpen(false)}
              />
            )}
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
            onAdjustQuantity={handleAdjustQuantity}
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
          pantry={pantry}
          onClose={() => setSelectedRecipe(null)}
          onMarkUsed={handleMarkUsed}
          onRegenerate={setSelectedRecipe}
        />
      )}

      <Toast toast={toast} onDismiss={dismissToast} />
    </div>
  );
}
