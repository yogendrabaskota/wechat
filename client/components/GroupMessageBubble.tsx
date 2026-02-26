'use client';

import { useState } from 'react';
import type { GroupMessage } from '@/store/chatStore';
import Avatar from './Avatar';

interface GroupMessageBubbleProps {
  message: GroupMessage;
  currentUserId?: string;
  onUnsend?: (messageId: string) => void;
}

export default function GroupMessageBubble({ message, currentUserId, onUnsend }: GroupMessageBubbleProps) {
  const [showUnsend, setShowUnsend] = useState(false);
  const isSystem = message.type === 'system';
  const isOwn = !isSystem && message.senderId && currentUserId === message.senderId._id;
  const deleted = !!message.deleted;

  if (isSystem) {
    return (
      <div className="flex justify-center mb-2 px-0.5">
        <p className="text-xs text-slate-500 italic px-3 py-1">
          {message.text}
        </p>
      </div>
    );
  }

  return (
    <div
      className={`flex ${isOwn ? 'justify-end' : 'justify-start'} mb-2 px-0.5 group items-end gap-1.5`}
      onMouseEnter={() => isOwn && !deleted && setShowUnsend(true)}
      onMouseLeave={() => setShowUnsend(false)}
    >
      {!isOwn && message.senderId && (
        <Avatar
          src={message.senderId.profilePic}
          name={message.senderId.name}
          size="xs"
          className="shrink-0 mb-0.5"
        />
      )}
      <div
        className={`max-w-[85%] sm:max-w-[75%] px-4 py-2.5 rounded-2xl shadow-sm ${
          deleted
            ? 'bg-slate-100 italic'
            : isOwn
              ? 'bg-blue-600 text-white rounded-br-md'
              : 'bg-white border border-slate-200 text-slate-800 rounded-bl-md'
        }`}
      >
        {!isOwn && message.senderId && !deleted && (
          <p className="text-xs text-slate-500 mb-0.5">{message.senderId.name}</p>
        )}
        {deleted ? (
          <p className="text-sm text-slate-500">
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
