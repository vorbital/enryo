import type { MessageWithAuthor } from '../lib/api';

interface MessageItemProps {
  message: MessageWithAuthor;
  isTruncated?: boolean;
}

export default function MessageItem({ message, isTruncated = false }: MessageItemProps) {
  const time = new Date(message.created_at).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  });

  if (!message.is_pertinent || isTruncated) {
    return (
      <div className="flex items-start gap-2 py-1 px-2 rounded hover:bg-[var(--hover-bg)] transition-colors">
        <div className="w-6 h-6 rounded-full bg-[var(--bg-secondary)] flex-shrink-0 flex items-center justify-center mt-0.5">
          {message.author_avatar ? (
            <img
              src={message.author_avatar}
              alt=""
              className="w-full h-full object-cover rounded-full"
            />
          ) : (
            <span className="text-[10px] font-medium text-[var(--text-muted)]">
              {message.author_name.charAt(0).toUpperCase()}
            </span>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-baseline gap-2">
            <span className="text-xs font-medium text-[var(--text-muted)]">{message.author_name}</span>
            <span className="text-[10px] text-[var(--text-muted)]">{time}</span>
          </div>
          <p className="text-xs text-[var(--text-muted)] leading-relaxed">
            {message.content}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex gap-3 p-3 rounded hover:bg-[var(--hover-bg)] transition-colors group">
      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[var(--ws-primary-500)]/20 to-[var(--ws-primary-600)]/20 flex-shrink-0 flex items-center justify-center overflow-hidden border border-[var(--ws-primary-500)]/20">
        {message.author_avatar ? (
          <img
            src={message.author_avatar}
            alt={message.author_name}
            className="w-full h-full object-cover"
          />
        ) : (
          <span className="text-lg font-bold text-[var(--ws-primary-500)]">
            {message.author_name.charAt(0).toUpperCase()}
          </span>
        )}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-baseline gap-2 mb-0.5">
          <span className="font-semibold text-[var(--text-primary)] group-hover:text-[var(--ws-primary-500)] transition-colors">
            {message.author_name}
          </span>
          <span className="text-xs text-[var(--text-muted)]">{time}</span>
        </div>
        <p className="text-[var(--text-secondary)] whitespace-pre-wrap break-words leading-relaxed">
          {message.content}
        </p>
      </div>
    </div>
  );
}
