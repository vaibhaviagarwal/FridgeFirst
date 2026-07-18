import { useState, useCallback, useRef } from "react";

// Small toast system: show a message for a few seconds, optionally with a
// single action button (used for "Added spinach — Undo" style feedback so
// users always know an action actually happened, and can reverse it).
export function useToast() {
  const [toast, setToast] = useState(null);
  const timeoutRef = useRef(null);

  const showToast = useCallback((message, action) => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setToast({ message, action: action || null });
    timeoutRef.current = setTimeout(() => setToast(null), 4000);
  }, []);

  const dismissToast = useCallback(() => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setToast(null);
  }, []);

  return { toast, showToast, dismissToast };
}
