'use client';

import type { Message } from '@/store/chatStore';
import { useAuthStore } from '@/store/authStore';

interface MessageBubbleProps {
  message: Message;
}

export default function MessageBubble({ message }: MessageBubbleProps) {
  const { user } = useAuthStore();
  const isOwn = user?._id === message.senderId._id;

  return (
    <div
      className={`flex ${isOwn ? 'justify-end' : 'justify-start'} mb-2 px-0.5`}
    >
      <div
        className={`max-w-[85%] sm:max-w-[75%] px-4 py-2.5 rounded-2xl ${
          isOwn
            ? 'bg-blue-600 text-white rounded-br-md'
            : 'bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-bl-md'
        }`}
      >
        {!isOwn && (
          <p className="text-xs opacity-80 mb-0.5">{message.senderId.name}</p>
        )}
        <p className="break-words">{message.text}</p>
        <p className="text-xs mt-1 opacity-80">
          {new Date(message.createdAt).toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit',
          })}
          {isOwn && message.seen && ' · Seen'}
        </p>
      </div>
    </div>
  );
}
