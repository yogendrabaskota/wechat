'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useCallback } from 'react';
import { useAuthStore } from '@/store/authStore';
import { useChatStore, type Conversation, type ConversationUser, type Message } from '@/store/chatStore';
import SearchUser from './SearchUser';
import api from '@/lib/axios';
import { disconnectSocket } from '@/lib/socket';

interface SidebarProps {
  onSelectConversation: (conv: Conversation, other: ConversationUser) => void;
}

export default function Sidebar({ onSelectConversation }: SidebarProps) {
  const router = useRouter();
  const { user, logout } = useAuthStore();
  const {
    conversations,
    setConversations,
    setActiveConversation,
    setMessages,
    activeReceiver,
    activeConversation,
    onlineUserIds,
    prependConversation,
    setMobileListVisible,
  } = useChatStore();

  const loadConversations = useCallback(async () => {
    if (!user) return;
    try {
      const { data } = await api.get<Conversation[]>('/api/conversations');
      setConversations(Array.isArray(data) ? data : []);
    } catch {
      setConversations([]);
    }
  }, [user, setConversations]);

  useEffect(() => {
    loadConversations();
  }, [loadConversations]);

  const handleSelectUser = async (selected: ConversationUser) => {
    try {
      const { data } = await api.get<{
        conversation: Conversation;
        messages: Message[];
      }>(`/api/messages/${selected._id}`);
      prependConversation(data.conversation);
      setActiveConversation(data.conversation, selected);
      setMessages(data.messages || []);
      onSelectConversation(data.conversation, selected);
      setMobileListVisible(false);
    } catch {
      setConversations([]);
    }
  };

  const handleLogout = async () => {
    try {
      await api.post('/api/auth/logout');
    } finally {
      logout();
      disconnectSocket();
      router.push('/login');
    }
  };

  const otherMember = (conv: Conversation): ConversationUser | null => {
    const other = conv.members?.find((m) => m._id !== user?._id);
    return other || null;
  };

  const handleConversationClick = (conv: Conversation, other: ConversationUser) => {
    setActiveConversation(conv, other);
    setMessages([]);
    api
      .get<{ conversation: Conversation; messages: Message[] }>(`/api/messages/${other._id}`)
      .then(({ data }) => {
        setMessages(data.messages || []);
        onSelectConversation(data.conversation, other);
        setMobileListVisible(false);
      });
  };

  return (
    <div className="w-full md:w-80 h-full flex flex-col bg-gray-50 dark:bg-gray-800">
      <div className="p-3 md:p-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between gap-2 min-h-[56px] safe-area-top">
        <span className="font-semibold text-gray-900 dark:text-gray-100 truncate text-base">
          {user?.name}
        </span>
        <button
          type="button"
          onClick={handleLogout}
          className="text-sm text-red-600 hover:text-red-700 active:opacity-80 shrink-0 min-h-[44px] min-w-[44px] flex items-center justify-center -m-2 p-2"
        >
          Logout
        </button>
      </div>

      <SearchUser onSelectUser={handleSelectUser} />

      <div className="flex-1 overflow-y-auto">
        <p className="px-3 py-2 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
          Conversations
        </p>
        {conversations.length === 0 && (
          <p className="px-3 py-2 text-sm text-gray-500 dark:text-gray-400">
            No conversations yet. Search for a user to start.
          </p>
        )}
        <ul className="space-y-0.5 pb-4">
          {conversations.map((conv) => {
            const other = otherMember(conv);
            if (!other) return null;
            const isActive =
              activeReceiver?._id === other._id &&
              activeConversation?._id === conv._id;
            const isOnline = onlineUserIds.has(other._id);
            return (
              <li key={conv._id}>
                <button
                  type="button"
                  onClick={() => handleConversationClick(conv, other)}
                  className={`w-full text-left px-3 py-3 md:py-2.5 flex items-center gap-3 rounded-lg mx-2 min-h-[56px] md:min-h-0 active:opacity-90 ${
                    isActive
                      ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200'
                      : 'hover:bg-gray-200 dark:hover:bg-gray-700'
                  }`}
                >
                  <span className="relative flex shrink-0">
                    <span className="w-10 h-10 md:w-8 md:h-8 rounded-full bg-gray-300 dark:bg-gray-600 flex items-center justify-center text-sm font-medium text-gray-700 dark:text-gray-300">
                      {other.name.charAt(0).toUpperCase()}
                    </span>
                    {isOnline && (
                      <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 border-2 border-gray-50 dark:border-gray-800 rounded-full" />
                    )}
                  </span>
                  <span className="flex-1 min-w-0">
                    <span className="block truncate font-medium text-gray-900 dark:text-gray-100 text-base md:text-sm">
                      {other.name}
                    </span>
                    <span className="block truncate text-xs text-gray-500 dark:text-gray-400">
                      {other.email}
                    </span>
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
