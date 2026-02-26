'use client';

import { useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import { useChatStore } from '@/store/chatStore';
import { getSocket } from '@/lib/socket';
import api from '@/lib/axios';
import Sidebar from '@/components/Sidebar';
import ChatWindow from '@/components/ChatWindow';
import GroupChatWindow from '@/components/GroupChatWindow';
import type { Conversation, ConversationUser, Message } from '@/store/chatStore';

export default function ChatPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const userIdFromQuery = searchParams.get('userId');
  const { user, token } = useAuthStore();
  const {
    setOnlineUserIds,
    addOnlineUser,
    removeOnlineUser,
    mobileListVisible,
    activeGroup,
    setActiveGroup,
    prependConversation,
    setActiveConversation,
    setMessages,
    setMobileListVisible,
  } = useChatStore();
  const openedUserIdRef = useRef<string | null>(null);

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

  useEffect(() => {
    if (!userIdFromQuery) {
      openedUserIdRef.current = null;
      return;
    }
    if (!user || !token || userIdFromQuery === user._id) return;
    if (openedUserIdRef.current === userIdFromQuery) return;
    openedUserIdRef.current = userIdFromQuery;
    setActiveGroup(null);
    api
      .get<{ conversation: Conversation; messages: Message[] }>(`/api/messages/${userIdFromQuery}`)
      .then(({ data }) => {
        const other = data.conversation.members?.find((m) => m._id !== user._id);
        if (other) {
          prependConversation(data.conversation);
          setActiveConversation(data.conversation, other);
          setMessages(data.messages || []);
          setMobileListVisible(false);
        }
        router.replace('/chat', { scroll: false });
      })
      .catch(() => {
        openedUserIdRef.current = null;
      });
  }, [userIdFromQuery, user, token, setActiveGroup, prependConversation, setActiveConversation, setMessages, setMobileListVisible, router]);

  const handleSelectConversation = (_conv: Conversation, _other: ConversationUser) => {}

  if (!user) {
    return null;
  }

  return (
    <div className="h-screen h-[100dvh] flex flex-col overflow-hidden bg-slate-50">
      <div className="shrink-0 flex items-center gap-2 px-2 sm:px-3 py-2 border-b border-slate-200 bg-white safe-area-top">
        <Link
          href="/"
          className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl hover:bg-slate-100 text-slate-600 hover:text-slate-800 -ml-0.5"
          aria-label="Back to feed"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
        </Link>
        <span className="text-sm font-medium text-slate-600 truncate">Back to feed</span>
      </div>
      <div className="flex-1 flex min-h-0 overflow-hidden">
        <div
          className={`
            w-full flex flex-col border-r border-slate-200 min-w-0 shrink-0
            md:w-80
            max-md:absolute max-md:inset-x-0 max-md:bottom-0 max-md:top-14 max-md:z-10
            ${mobileListVisible ? 'max-md:flex' : 'max-md:hidden'}
          `}
        >
          <Sidebar onSelectConversation={handleSelectConversation} />
        </div>
        <div
          className={`
            flex-1 flex flex-col min-w-0 bg-white
            max-md:absolute max-md:inset-x-0 max-md:bottom-0 max-md:top-14 max-md:z-20
            ${!mobileListVisible ? 'max-md:flex' : 'max-md:hidden'}
          `}
        >
          {activeGroup ? <GroupChatWindow /> : <ChatWindow />}
        </div>
      </div>
    </div>
  );
}
