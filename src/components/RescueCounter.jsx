import { History, PartyPopper } from "lucide-react";

export default function RescueCounter({ rescueLog, totalRescued }) {
  if (rescueLog.length === 0) {
    return (
      <div className="rescue-history empty">
        <History size={40} className="empty-icon" strokeWidth={1.5} />
        <h2>No rescues logged yet</h2>
        <p>Cook a recipe and mark ingredients used to start your streak.</p>
      </div>
    );
  }

  return (
    <div className="rescue-history">
      <h3>
        <PartyPopper size={17} /> Rescued {totalRescued} ingredients
      </h3>
      <ul>
        {[...rescueLog].reverse().slice(0, 10).map((entry, i) => (
          <li key={i}>
            {new Date(entry.date).toLocaleDateString()} — {entry.count} ingredient
            {entry.count === 1 ? "" : "s"}
            {entry.recipeTitle ? ` via ${entry.recipeTitle}` : ""}
          </li>
        ))}
      </ul>
    </div>
  );
}
