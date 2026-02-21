'use client';

import { useRef, useEffect, useState, useCallback } from 'react';
import { useChatStore } from '@/store/chatStore';
import MessageBubble from './MessageBubble';
import { getSocket } from '@/lib/socket';
import { useAuthStore } from '@/store/authStore';

const TYPING_DEBOUNCE_MS = 400;
const TYPING_STOP_MS = 1500;

export default function ChatWindow() {
  const { user, token } = useAuthStore();
  const {
    activeReceiver,
    messages,
    addMessage,
    setMessageSeen,
    activeConversation,
    typingUserId,
    setTypingUser,
  } = useChatStore();
  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const typingStopRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastTypingEmitRef = useRef<number>(0);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (!token || !activeReceiver) return;
    const socket = getSocket(token);
    const onNew = (msg: Parameters<typeof addMessage>[0]) => {
      addMessage(msg);
    };
    const onSeen = (payload: { messageId: string }) => {
      setMessageSeen(payload.messageId);
    };
    const onTyping = (payload: { userId: string; typing: boolean }) => {
      setTypingUser(payload.userId, payload.typing);
    };
    socket.on('new_message', onNew);
    socket.on('message_seen', onSeen);
    socket.on('user_typing', onTyping);
    return () => {
      socket.off('new_message', onNew);
      socket.off('message_seen', onSeen);
      socket.off('user_typing', onTyping);
      setTypingUser(activeReceiver._id, false);
    };
  }, [token, activeReceiver, addMessage, setMessageSeen, setTypingUser]);

  useEffect(() => {
    setTypingUser(null, false);
  }, [activeReceiver?._id, setTypingUser]);

  const emitTypingStop = useCallback(() => {
    if (!token || !activeReceiver) return;
    getSocket(token).emit('typing_stop', { receiverId: activeReceiver._id });
  }, [token, activeReceiver]);

  const emitTypingStart = useCallback(() => {
    if (!token || !activeReceiver) return;
    const now = Date.now();
    if (now - lastTypingEmitRef.current < TYPING_DEBOUNCE_MS) return;
    lastTypingEmitRef.current = now;
    getSocket(token).emit('typing_start', { receiverId: activeReceiver._id });
  }, [token, activeReceiver]);

  useEffect(() => {
    return () => {
      if (typingStopRef.current) clearTimeout(typingStopRef.current);
    };
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setInput(value);
    if (!activeReceiver || !token) return;
    if (value.trim()) {
      emitTypingStart();
      if (typingStopRef.current) clearTimeout(typingStopRef.current);
      typingStopRef.current = setTimeout(() => {
        emitTypingStop();
        typingStopRef.current = null;
      }, TYPING_STOP_MS);
    } else {
      emitTypingStop();
      if (typingStopRef.current) {
        clearTimeout(typingStopRef.current);
        typingStopRef.current = null;
      }
    }
  };

  useEffect(() => {
    if (!token || !user || !activeReceiver) return;
    const socket = getSocket(token);
    const unread = messages.filter(
      (m) => m.receiverId._id === user._id && !m.seen
    );
    unread.forEach((m) => {
      socket.emit('message_seen', {
        messageId: m._id,
        receiverId: m.senderId._id,
      });
      setMessageSeen(m._id);
    });
  }, [token, user, activeReceiver, messages, setMessageSeen]);

  const sendMessage = () => {
    const text = input.trim();
    if (!text || !activeReceiver || !activeConversation || !token) return;
    emitTypingStop();
    if (typingStopRef.current) {
      clearTimeout(typingStopRef.current);
      typingStopRef.current = null;
    }
    const socket = getSocket(token);
    socket.emit('send_message', {
      receiverId: activeReceiver._id,
      conversationId: activeConversation._id,
      text,
    });
    setInput('');
    inputRef.current?.focus();
  };

  const setMobileListVisible = useChatStore((s) => s.setMobileListVisible);

  if (!activeReceiver) {
    return (
      <div className="flex-1 flex items-center justify-center bg-gray-50 dark:bg-gray-900 text-gray-500 dark:text-gray-400 px-4 text-center">
        Select a conversation or search for a user to start chatting
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col bg-white dark:bg-gray-900 min-h-0">
      <div className="shrink-0 px-3 md:px-4 py-3 border-b border-gray-200 dark:border-gray-700 flex items-center gap-2 min-h-[56px] safe-area-top">
        <button
          type="button"
          onClick={() => setMobileListVisible(true)}
          className="md:hidden shrink-0 min-h-[44px] min-w-[44px] flex items-center justify-center -ml-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 active:opacity-80 text-gray-600 dark:text-gray-400"
          aria-label="Back to conversations"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <div className="flex-1 min-w-0">
          <span className="font-semibold text-gray-900 dark:text-gray-100 block truncate text-base">
            {activeReceiver.name}
          </span>
          <span className="text-sm text-gray-500 dark:text-gray-400 truncate block">
            {activeReceiver.email}
          </span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto overflow-x-hidden p-4 space-y-1 overscroll-contain">
        {messages.map((msg) => (
          <MessageBubble key={msg._id} message={msg} />
        ))}
        {typingUserId === activeReceiver._id && (
          <div className="flex justify-start mb-2">
            <span className="px-3 py-1.5 rounded-full bg-gray-200 dark:bg-gray-700 text-sm text-gray-600 dark:text-gray-400 italic">
              {activeReceiver.name} is typing...
            </span>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="shrink-0 p-3 md:p-4 border-t border-gray-200 dark:border-gray-700 flex gap-2 safe-area-bottom">
        <input
          ref={inputRef}
          type="text"
          placeholder="Type a message..."
          value={input}
          onChange={handleInputChange}
          onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && sendMessage()}
          className="flex-1 min-h-[44px] px-4 py-3 md:py-2 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-base focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
        <button
          type="button"
          onClick={sendMessage}
          disabled={!input.trim()}
          className="min-h-[44px] min-w-[44px] px-4 py-3 md:py-2 rounded-xl bg-blue-600 text-white hover:bg-blue-700 active:opacity-90 disabled:opacity-50 flex items-center justify-center"
        >
          Send
        </button>
      </div>
    </div>
  );
}
