import { X } from "lucide-react";

export default function Toast({ toast, onDismiss }) {
  if (!toast) return null;

  return (
    <div className="toast">
      <span>{toast.message}</span>
      {toast.action && (
        <button
          className="toast-action"
          onClick={() => {
            toast.action.onClick();
            onDismiss();
          }}
        >
          {toast.action.label}
        </button>
      )}
      <button className="toast-close" onClick={onDismiss} aria-label="Dismiss">
        <X size={15} />
      </button>
    </div>
  );
}
