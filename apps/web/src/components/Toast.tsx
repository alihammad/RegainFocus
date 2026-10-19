import { CheckIcon } from './icons';

interface ToastProps {
  message: string;
  onUndo: () => void;
}

/** Instant feedback with undo instead of a confirmation dialog. role="status" announces it. */
export function Toast({ message, onUndo }: ToastProps) {
  return (
    <div className="toast" role="status">
      <span className="toast-message">
        <CheckIcon />
        <span>{message}</span>
      </span>
      <button type="button" className="toast-undo" onClick={onUndo}>
        Undo
      </button>
    </div>
  );
}
