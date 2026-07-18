import { useEffect, useRef, useState } from "react";
import { Trash2 } from "lucide-react";

// FridgeFirst has no accounts or backend — everything lives in this
// browser/app's localStorage. This panel is the closest equivalent to a
// real account menu: your stats, and a genuine account-like action
// (wiping local data) rather than a purely decorative avatar.
export default function AccountPanel({ streak, totalRescued, onClearData, onClose }) {
  const ref = useRef(null);
  const [confirming, setConfirming] = useState(false);

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

  function handleClearClick() {
    if (!confirming) {
      setConfirming(true);
      return;
    }
    onClearData();
    onClose();
  }

  return (
    <div className="dropdown-panel account-panel" ref={ref}>
      <div className="dropdown-section">
        <div className="account-stat-row">
          <span className="account-stat-value">{streak}</span>
          <span className="account-stat-label">day streak</span>
        </div>
        <div className="account-stat-row">
          <span className="account-stat-value">{totalRescued}</span>
          <span className="account-stat-label">ingredients rescued</span>
        </div>
      </div>

      <p className="dropdown-note">No account needed — everything's stored only on this device.</p>

      <button className={`dropdown-action danger${confirming ? " confirming" : ""}`} onClick={handleClearClick}>
        <Trash2 size={13} /> {confirming ? "Click again to confirm" : "Clear all local data"}
      </button>
    </div>
  );
}
