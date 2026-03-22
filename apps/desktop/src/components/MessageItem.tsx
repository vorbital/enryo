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
      <div className="flex items-start gap-2 py-1 px-2 rounded bg-[#1e1e32]/50 hover:bg-[#2a2a4a]/30 transition-colors">
        <div className="w-6 h-6 rounded-full bg-gray-700 flex-shrink-0 flex items-center justify-center mt-0.5">
          {message.author_avatar ? (
            <img
              src={message.author_avatar}
              alt=""
              className="w-full h-full object-cover rounded-full"
            />
          ) : (
            <span className="text-[10px] font-medium text-gray-400">
              {message.author_name.charAt(0).toUpperCase()}
            </span>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-baseline gap-2">
            <span className="text-xs font-medium text-gray-400">{message.author_name}</span>
            <span className="text-[10px] text-gray-500">{time}</span>
          </div>
          <p className="text-xs text-gray-400 leading-relaxed">
            {message.content}
          </p>
        </div>
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
