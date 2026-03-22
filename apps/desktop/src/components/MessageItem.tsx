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
      <div className="flex items-center gap-1.5 py-0.5 px-2 text-[11px] text-gray-500 hover:bg-[#2a2a4a]/30 rounded">
        <span className="text-gray-600 select-none">o</span>
        <div className="w-4 h-4 rounded-full bg-gray-700 flex-shrink-0 flex items-center justify-center overflow-hidden">
          {message.author_avatar ? (
            <img
              src={message.author_avatar}
              alt=""
              className="w-full h-full object-cover"
            />
          ) : (
            <span className="text-[8px] font-medium text-gray-400">
              {message.author_name.charAt(0).toUpperCase()}
            </span>
          )}
        </div>
        <span className="font-medium text-gray-500">{message.author_name}</span>
        <span className="text-gray-600 truncate max-w-[200px]">
          {message.content.slice(0, 40)}
          {message.content.length > 40 ? '...' : ''}
        </span>
      </div>
    );
  }

  return (
    <div className="flex gap-3 p-3 rounded hover:bg-[#2a2a4a] transition-colors group">
      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#00d9ff]/20 to-[#00b8d9]/20 flex-shrink-0 flex items-center justify-center overflow-hidden border border-[#00d9ff]/20">
        {message.author_avatar ? (
          <img
            src={message.author_avatar}
            alt={message.author_name}
            className="w-full h-full object-cover"
          />
        ) : (
          <span className="text-lg font-bold text-[#00d9ff]">
            {message.author_name.charAt(0).toUpperCase()}
          </span>
        )}
      </div>
      
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline gap-2 mb-0.5">
          <span className="font-semibold text-white group-hover:text-[#00d9ff] transition-colors">
            {message.author_name}
          </span>
          <span className="text-xs text-gray-500">{time}</span>
        </div>
        <p className="text-gray-200 whitespace-pre-wrap break-words leading-relaxed">
          {message.content}
        </p>
      </div>
    </div>
  );
}

export function TruncatedMessage({ message }: { message: MessageWithAuthor }) {
  const time = new Date(message.created_at).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <div className="flex items-center gap-1.5 py-0.5 px-2 text-[10px] text-gray-600">
      <div className="w-3 h-3 rounded-full bg-gray-800 flex-shrink-0 flex items-center justify-center overflow-hidden">
        <span className="text-[7px] font-medium text-gray-600">
          {message.author_name.charAt(0).toUpperCase()}
        </span>
      </div>
      <span className="font-medium text-gray-600">{message.author_name}</span>
      <span className="text-gray-700">{time}</span>
      <span className="truncate max-w-[150px] text-gray-700">
        {message.content.slice(0, 30)}
        {message.content.length > 30 ? '...' : ''}
      </span>
    </div>
  );
}
