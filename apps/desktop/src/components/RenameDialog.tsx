import { useState, useEffect, useRef } from 'react';

interface RenameDialogProps {
  isOpen: boolean;
  currentName: string;
  onRename: (newName: string) => void;
  onClose: () => void;
}

export default function RenameDialog({ isOpen, currentName, onRename, onClose }: RenameDialogProps) {
  const [name, setName] = useState(currentName);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setName(currentName);
      setTimeout(() => inputRef.current?.select(), 50);
    }
  }, [isOpen, currentName]);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim() && name.trim() !== currentName) {
      onRename(name.trim());
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-lg p-4 w-80 shadow-xl">
        <h3 className="text-[var(--text-primary)] font-semibold mb-3">Rename Channel</h3>
        <form onSubmit={handleSubmit}>
          <input
            ref={inputRef}
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full px-3 py-2 bg-[var(--bg-primary)] border border-[var(--border-color)] rounded text-[var(--text-primary)] focus:outline-none focus:border-[var(--ws-primary-500)]"
            autoFocus
          />
          <div className="flex justify-end gap-2 mt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 text-sm text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!name.trim() || name.trim() === currentName}
              className="px-3 py-1.5 text-sm bg-[var(--ws-primary-500)] text-[var(--ws-primary-bg)] rounded font-medium hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Rename
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
