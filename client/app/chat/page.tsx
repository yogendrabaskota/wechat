'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import { useChatStore } from '@/store/chatStore';
import { getSocket } from '@/lib/socket';
import Sidebar from '@/components/Sidebar';
import ChatWindow from '@/components/ChatWindow';
import GroupChatWindow from '@/components/GroupChatWindow';
import type { Conversation, ConversationUser } from '@/store/chatStore';

export default function ChatPage() {
  const router = useRouter();
  const { user, token } = useAuthStore();
  const { setOnlineUserIds, addOnlineUser, removeOnlineUser, mobileListVisible, activeGroup } = useChatStore();

  useEffect(() => {
    if (!user || !token) {
      router.push('/login');
      return;
    }
    const socket = getSocket(token);
    socket.on('user_online', (payload: { userId: string; onlineIds?: string[] }) => {
      if (payload.onlineIds) {
        setOnlineUserIds(payload.onlineIds);
      } else {
        addOnlineUser(payload.userId);
      }
    });
    socket.on('user_offline', (payload: { userId: string; onlineIds?: string[] }) => {
      if (payload.onlineIds) {
        setOnlineUserIds(payload.onlineIds);
      } else {
        removeOnlineUser(payload.userId);
      }
    });
    return () => {
      socket.off('user_online');
      socket.off('user_offline');
    };
  }, [user, token, router, setOnlineUserIds, addOnlineUser, removeOnlineUser]);

  const handleSelectConversation = (_conv: Conversation, _other: ConversationUser) => {}

  if (!user) {
    return null;
  }

  return (
    <div className="h-screen flex overflow-hidden">
      <div
        className={`
          w-full flex flex-col border-r border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800
          md:w-80 md:shrink-0
          max-md:absolute max-md:inset-0 max-md:z-10
          ${mobileListVisible ? 'max-md:flex' : 'max-md:hidden'}
        `}
      >
        <Sidebar onSelectConversation={handleSelectConversation} />
      </div>
      <div
        className={`
          flex-1 flex flex-col min-w-0 bg-white dark:bg-gray-900
          max-md:absolute max-md:inset-0 max-md:z-20
          ${!mobileListVisible ? 'max-md:flex' : 'max-md:hidden'}
        `}
      >
        {activeGroup ? <GroupChatWindow /> : <ChatWindow />}
      </div>
    </div>
  );
}
