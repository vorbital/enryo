interface ConfirmDialogProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  onConfirm: () => void;
  onClose: () => void;
  danger?: boolean;
}

export default function ConfirmDialog({ 
  isOpen, 
  title, 
  message, 
  confirmLabel = 'Confirm',
  onConfirm, 
  onClose,
  danger = false,
}: ConfirmDialogProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-lg p-4 w-80 shadow-xl">
        <h3 className="text-[var(--text-primary)] font-semibold mb-2">{title}</h3>
        <p className="text-[var(--text-muted)] text-sm mb-4">{message}</p>
        <div className="flex justify-end gap-2">
          <button
            onClick={onClose}
            className="px-3 py-1.5 text-sm text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={() => {
              onConfirm();
              onClose();
            }}
            className={`px-3 py-1.5 text-sm rounded font-medium transition-colors ${
              danger 
                ? 'bg-red-500 text-white hover:bg-red-600' 
                : 'bg-[var(--ws-primary-500)] text-[var(--ws-primary-bg)] hover:opacity-90'
            }`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}