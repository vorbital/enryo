import type { MessageWithAuthor } from '../lib/api';

interface MessageItemProps {
  message: MessageWithAuthor;
  truncated?: boolean;
}

export default function MessageItem({ message, truncated = false }: MessageItemProps) {
  const time = new Date(message.created_at).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  });

  if (truncated) {
    return (
      <div className="flex items-center gap-2 py-1 text-gray-500 text-xs">
        <div className="w-4 h-4 rounded-full bg-gray-600 flex-shrink-0" />
        <span className="font-medium">{message.author_name}</span>
        <span className="text-gray-600">{time}</span>
        <span className="truncate max-w-md">
          {message.content.slice(0, 50)}{message.content.length > 50 ? '...' : ''}
        </span>
      </div>
    );
  }

  return (
    <div className="flex gap-3 p-2 rounded hover:bg-[#2a2a4a]">
      <div className="w-10 h-10 rounded-full bg-[#3a3a5a] flex-shrink-0 flex items-center justify-center">
        {message.author_avatar ? (
          <img
            src={message.author_avatar}
            alt={message.author_name}
            className="w-full h-full rounded-full object-cover"
          />
        ) : (
          <span className="text-lg font-semibold">
            {message.author_name.charAt(0).toUpperCase()}
          </span>
        )}
      </div>
      
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline gap-2">
          <span className="font-semibold text-white">{message.author_name}</span>
          <span className="text-xs text-gray-500">{time}</span>
        </div>
        <p className="text-gray-200 whitespace-pre-wrap break-words">
          {message.content}
        </p>
      </div>
    </div>
  );
}
