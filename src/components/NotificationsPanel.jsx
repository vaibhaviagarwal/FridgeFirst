import { useEffect, useRef } from "react";
import { Clock } from "lucide-react";

// Anchored dropdown under the bell icon — surfaces exactly what the badge
// count promises (what needs attention today/soon) instead of the bell
// being purely decorative.
export default function NotificationsPanel({ eatToday, eatSoon, onViewPantry, onClose }) {
  const ref = useRef(null);

  useEffect(() => {
    function handleClickOutside(e) {
      if (ref.current && !ref.current.contains(e.target)) onClose();
    }
    function handleEscape(e) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [onClose]);

  const hasAnything = eatToday.length > 0 || eatSoon.length > 0;

  return (
    <div className="dropdown-panel notifications-panel" ref={ref}>
      {!hasAnything && <p className="dropdown-empty">You're all caught up — nothing needs attention.</p>}

      {eatToday.length > 0 && (
        <div className="dropdown-section">
          <div className="dropdown-section-title urgent">
            <Clock size={13} /> Use today
          </div>
          <ul>
            {eatToday.map((item) => (
              <li key={item.id}>{item.name}</li>
            ))}
          </ul>
        </div>
      )}

      {eatSoon.length > 0 && (
        <div className="dropdown-section">
          <div className="dropdown-section-title">
            <Clock size={13} /> Use soon
          </div>
          <ul>
            {eatSoon.map((item) => (
              <li key={item.id}>{item.name}</li>
            ))}
          </ul>
        </div>
      )}

      {hasAnything && (
        <button
          className="dropdown-action"
          onClick={() => {
            onViewPantry();
            onClose();
          }}
        >
          View pantry
        </button>
      )}
    </div>
  );
}
