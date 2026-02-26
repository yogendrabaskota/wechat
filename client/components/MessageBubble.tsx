'use client';

import { useState } from 'react';
import type { Message } from '@/store/chatStore';
import { useAuthStore } from '@/store/authStore';
import Avatar from './Avatar';

interface MessageBubbleProps {
  message: Message;
  onUnsend?: (messageId: string) => void;
}

export default function MessageBubble({ message, onUnsend }: MessageBubbleProps) {
  const { user } = useAuthStore();
  const [showUnsend, setShowUnsend] = useState(false);
  const isOwn = user?._id === message.senderId._id;
  const deleted = !!message.deleted;

  return (
    <div
      className={`flex ${isOwn ? 'justify-end' : 'justify-start'} mb-2 px-0.5 group items-end gap-1.5`}
      onMouseEnter={() => isOwn && !deleted && setShowUnsend(true)}
      onMouseLeave={() => setShowUnsend(false)}
    >
      {!isOwn && (
        <Avatar
          src={message.senderId.profilePic}
          name={message.senderId.name}
          size="xs"
          className="shrink-0 mb-0.5"
        />
      )}
      <div
        className={`max-w-[85%] sm:max-w-[75%] px-4 py-2.5 rounded-2xl ${
          deleted
            ? 'bg-gray-100 dark:bg-gray-700/50 italic'
            : isOwn
              ? 'bg-blue-600 text-white rounded-br-md'
              : 'bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-bl-md'
        }`}
      >
        {!isOwn && !deleted && (
          <p className="text-xs opacity-80 mb-0.5">{message.senderId.name}</p>
        )}
        {deleted ? (
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {isOwn ? 'You unsent this message' : 'This message was unsent'}
          </p>
        ) : (
          <p className="break-words">{message.text}</p>
        )}
        <div className="flex items-center justify-between gap-2 mt-1">
          <p className="text-xs opacity-80">
            {new Date(message.createdAt).toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit',
            })}
            {isOwn && !deleted && message.seen && ' · Seen'}
          </p>
          {isOwn && !deleted && onUnsend && (
            <button
              type="button"
              onClick={() => onUnsend(message._id)}
              className={`text-xs underline opacity-80 hover:opacity-100 ${showUnsend ? '' : 'md:opacity-0'} md:group-hover:opacity-80`}
            >
              Unsend
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
