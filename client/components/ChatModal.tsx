'use client';

import { useEffect, useRef } from 'react';
import { useAuthStore } from '@/store/authStore';
import { useChatStore } from '@/store/chatStore';
import { getSocket } from '@/lib/socket';
import Sidebar from './Sidebar';
import ChatWindow from './ChatWindow';
import GroupChatWindow from './GroupChatWindow';
import type { Conversation, ConversationUser } from '@/store/chatStore';

interface ChatModalProps {
  open: boolean;
  onClose: () => void;
}

export default function ChatModal({ open, onClose }: ChatModalProps) {
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
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open || !user || !token) return;
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
  }, [open, user, token, setOnlineUserIds, addOnlineUser, removeOnlineUser]);

  const handleSelectConversation = (_conv: Conversation, _other: ConversationUser) => {};

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) onClose();
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center sm:items-center bg-black/40 safe-area-top"
      onClick={handleBackdropClick}
      aria-modal="true"
      role="dialog"
      aria-label="Chat"
    >
      <div
        ref={panelRef}
        className="w-full max-w-4xl h-[55dvh] min-h-[320px] sm:h-[60vh] sm:max-h-[560px] flex rounded-t-2xl sm:rounded-2xl overflow-hidden bg-slate-50 shadow-2xl safe-area-inset-bottom"
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className={`
            w-full flex flex-col border-r border-slate-200 min-w-0 shrink-0
            sm:min-w-[240px] md:w-72
            max-md:absolute max-md:inset-0 max-md:z-10
            ${mobileListVisible ? 'max-md:flex' : 'max-md:hidden'}
          `}
        >
          <Sidebar onSelectConversation={handleSelectConversation} embedded />
        </div>
        <div
          className={`
            flex-1 flex flex-col min-w-0 bg-white
            max-md:absolute max-md:inset-0 max-md:z-20
            ${!mobileListVisible ? 'max-md:flex' : 'max-md:hidden'}
          `}
        >
          {activeGroup ? <GroupChatWindow /> : <ChatWindow />}
        </div>
      </div>
    </div>
  );
}
