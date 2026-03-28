import { useState, useEffect, useRef } from 'react';

interface EditChannelDialogProps {
  isOpen: boolean;
  mode: 'rename' | 'topic';
  currentValue: string;
  onSave: (newValue: string) => void;
  onClose: () => void;
}

export default function EditChannelDialog({ isOpen, mode, currentValue, onSave, onClose }: EditChannelDialogProps) {
  const [value, setValue] = useState(currentValue);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setValue(currentValue);
      setTimeout(() => inputRef.current?.select(), 50);
    }
  }, [isOpen, currentValue]);

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
    if (value.trim() !== currentValue) {
      onSave(value.trim());
      onClose();
    }
  };

  const title = mode === 'rename' ? 'Rename Channel' : 'Edit Channel Topic';
  const placeholder = mode === 'rename' ? 'channel-name' : 'Enter a topic (optional)';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-lg p-4 w-80 shadow-xl">
        <h3 className="text-[var(--text-primary)] font-semibold mb-3">{title}</h3>
        <form onSubmit={handleSubmit}>
          <input
            ref={inputRef}
            type="text"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder={placeholder}
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
              className="px-3 py-1.5 text-sm bg-[var(--ws-primary-500)] text-[var(--ws-primary-bg)] rounded font-medium hover:opacity-90 transition-colors"
            >
              Save
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}