'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import { useChatStore } from '@/store/chatStore';
import { getSocket } from '@/lib/socket';
import Sidebar from '@/components/Sidebar';
import ChatWindow from '@/components/ChatWindow';
import type { Conversation, ConversationUser } from '@/store/chatStore';

export default function ChatPage() {
  const router = useRouter();
  const { user, token } = useAuthStore();
  const { setOnlineUserIds, addOnlineUser, removeOnlineUser } = useChatStore();

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
    <div className="h-screen flex">
      <Sidebar onSelectConversation={handleSelectConversation} />
      <ChatWindow />
    </div>
  );
}
