import { useState, useRef, useEffect } from "react";
import { Mic, Plus } from "lucide-react";
import { COMMON_INGREDIENTS } from "../data/commonIngredients";
import { INGREDIENT_SUGGESTIONS } from "../data/ingredientSuggestions";
import { getShelfLifeDefault } from "../data/shelfLife";
import CategoryIcon from "./CategoryIcon";

const EXPIRY_OPTIONS = [
  { label: "Use smart default", value: "" },
  { label: "Today", value: "0" },
  { label: "Tomorrow", value: "1" },
  { label: "In 3 days", value: "3" },
  { label: "In 1 week", value: "7" },
  { label: "In 2 weeks", value: "14" },
  { label: "Custom date…", value: "custom" },
];

// Only letters, spaces, hyphens, and apostrophes are valid ingredient names
// (e.g. "greek yogurt", "day-old bread"). Anything else — digits, symbols —
// gets flagged live rather than silently accepted or silently stripped.
const INVALID_CHARS = /[^a-zA-Z\s'-]/;

const SpeechRecognition =
  typeof window !== "undefined" && (window.SpeechRecognition || window.webkitSpeechRecognition);

export default function QuickAdd({ onAddItem, recentNames, pantryEmpty }) {
  const [name, setName] = useState("");
  const [expiryChoice, setExpiryChoice] = useState("");
  const [customDate, setCustomDate] = useState("");
  const [listening, setListening] = useState(false);
  const [touched, setTouched] = useState(false);
  const recognitionRef = useRef(null);

  useEffect(() => {
    return () => {
      if (recognitionRef.current) recognitionRef.current.stop();
    };
  }, []);

  const isInvalid = touched && name.length > 0 && INVALID_CHARS.test(name);

  function expiryDaysFromChoice() {
    if (expiryChoice === "") return null; // smart default from shelf-life table
    if (expiryChoice === "custom") {
      if (!customDate) return null;
      const target = new Date(customDate);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      target.setHours(0, 0, 0, 0);
      return Math.round((target - today) / (1000 * 60 * 60 * 24));
    }
    return parseInt(expiryChoice, 10);
  }

  function handleStructuredSubmit(e) {
    e.preventDefault();
    setTouched(true);
    if (!name.trim() || INVALID_CHARS.test(name)) return;
    const item = onAddItem({ name, expiryDays: expiryDaysFromChoice() });
    if (item) {
      setName("");
      setExpiryChoice("");
      setCustomDate("");
      setTouched(false);
    }
  }

  function handleChipClick(ingredientName) {
    onAddItem({ name: ingredientName, expiryDays: null });
  }

  function handleVoiceClick() {
    if (!SpeechRecognition) return;
    if (listening) {
      recognitionRef.current?.stop();
      return;
    }
    const recognition = new SpeechRecognition();
    recognition.lang = "en-US";
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;
    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      setName(transcript);
    };
    recognition.onstart = () => setListening(true);
    recognition.onend = () => setListening(false);
    recognition.onerror = () => setListening(false);
    recognitionRef.current = recognition;
    recognition.start();
  }

  const chipSuggestions = [
    ...COMMON_INGREDIENTS,
    ...recentNames.filter((n) => !COMMON_INGREDIENTS.some((c) => c.name === n)).map((n) => ({ name: n })),
  ].slice(0, 10);

  return (
    <div className="quick-add-wrapper">
      {pantryEmpty && (
        <div className="chip-onboarding">
          <div className="chip-onboarding-label">Start your pantry</div>
          <div className="chip-row">
            {COMMON_INGREDIENTS.map((c) => (
              <button key={c.name} className="chip" onClick={() => handleChipClick(c.name)}>
                <CategoryIcon category={getShelfLifeDefault(c.name).category} size={14} />
                {c.name}
              </button>
            ))}
          </div>
        </div>
      )}

      {!pantryEmpty && recentNames.length > 0 && (
        <div className="chip-row chip-row-compact">
          {chipSuggestions.map((c) => (
            <button key={c.name} className="chip" onClick={() => handleChipClick(c.name)}>
              <CategoryIcon category={getShelfLifeDefault(c.name).category} size={14} />
              {c.name}
            </button>
          ))}
        </div>
      )}

      <form className="quick-add structured" onSubmit={handleStructuredSubmit}>
        <div className="quick-add-field">
          <label>Ingredient</label>
          <div className="quick-add-input-row">
            <input
              type="text"
              list="ingredient-suggestions"
              placeholder="e.g. Chicken Breast"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onBlur={() => setTouched(true)}
              className={isInvalid ? "input-invalid" : ""}
              aria-invalid={isInvalid}
            />
            {SpeechRecognition && (
              <button
                type="button"
                className={`mic-btn${listening ? " listening" : ""}`}
                onClick={handleVoiceClick}
                aria-label="Add by voice"
                title="Add by voice"
              >
                <Mic size={16} />
              </button>
            )}
          </div>
          {isInvalid && <div className="field-error">Letters only, please.</div>}
          <datalist id="ingredient-suggestions">
            {INGREDIENT_SUGGESTIONS.map((s) => (
              <option key={s} value={s} />
            ))}
          </datalist>
        </div>

        <div className="quick-add-field">
          <label>Expires</label>
          <select value={expiryChoice} onChange={(e) => setExpiryChoice(e.target.value)}>
            {EXPIRY_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
          {expiryChoice === "custom" && (
            <input
              type="date"
              className="custom-date-input"
              value={customDate}
              onChange={(e) => setCustomDate(e.target.value)}
            />
          )}
        </div>

        <button type="submit" className="add-btn">
          <Plus size={16} /> Add
        </button>
      </form>
    </div>
  );
}
