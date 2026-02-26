'use client';

import { useRef, useEffect, useState } from 'react';
import { useChatStore } from '@/store/chatStore';
import { getSocket } from '@/lib/socket';
import { useAuthStore } from '@/store/authStore';
import api from '@/lib/axios';
import GroupMessageBubble from './GroupMessageBubble';
import GroupInfoModal from './GroupInfoModal';
import Avatar from './Avatar';

export default function GroupChatWindow() {
  const { user, token } = useAuthStore();
  const {
    activeGroup,
    groupMessages,
    addGroupMessage,
    setGroupMessageDeleted,
    setMobileListVisible,
    setActiveGroup,
  } = useChatStore();
  const [input, setInput] = useState('');
  const [infoOpen, setInfoOpen] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [groupMessages]);

  useEffect(() => {
    if (!token || !activeGroup) return;
    const socket = getSocket(token);
    socket.emit('join_group_room', activeGroup._id);
    const onMsg = (msg: Parameters<typeof addGroupMessage>[0]) => {
      addGroupMessage(msg);
    };
    const onMemberLeft = (payload: { groupId: string }) => {
      if (payload.groupId === activeGroup._id) {
        api.get<typeof activeGroup>(`/api/groups/${activeGroup._id}`).then(({ data }) => {
          setActiveGroup(data);
        }).catch(() => {});
      }
    };
    const onUnsent = (payload: { messageId: string }) => {
      setGroupMessageDeleted(payload.messageId);
    };
    socket.on('new_group_message', onMsg);
    socket.on('group_member_left', onMemberLeft);
    socket.on('message_unsent', onUnsent);
    return () => {
      socket.off('new_group_message', onMsg);
      socket.off('group_member_left', onMemberLeft);
      socket.off('message_unsent', onUnsent);
    };
  }, [token, activeGroup, addGroupMessage, setGroupMessageDeleted, setActiveGroup]);

  const sendMessage = () => {
    const text = input.trim();
    if (!text || !activeGroup || !token) return;
    const socket = getSocket(token);
    socket.emit('send_group_message', { groupId: activeGroup._id, text });
    setInput('');
    inputRef.current?.focus();
  };

  const handleUnsend = async (messageId: string) => {
    if (!activeGroup) return;
    try {
      await api.post(`/api/groups/${activeGroup._id}/messages/${messageId}/unsend`);
      setGroupMessageDeleted(messageId);
    } catch {
      // ignore
    }
  };

  if (!activeGroup) return null;

  return (
    <div className="flex-1 flex flex-col bg-white min-h-0">
      <div className="shrink-0 px-2 md:px-4 py-3 border-b border-slate-200 flex items-center gap-2 min-h-[56px] safe-area-top bg-white">
        <button
          type="button"
          onClick={() => setMobileListVisible(true)}
          className="flex md:hidden shrink-0 min-h-[44px] pr-2 -ml-1 flex items-center gap-1.5 rounded-xl hover:bg-slate-100 active:opacity-80 text-slate-700 font-medium"
          aria-label="Back"
        >
          <svg className="w-6 h-6 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          <span className="text-sm">Back</span>
        </button>
        <Avatar
          src={activeGroup.profilePic}
          name={activeGroup.name}
          size="sm"
          className="shrink-0 w-10 h-10 md:w-8 md:h-8 rounded-full bg-indigo-500 text-white [&>img]:rounded-full"
        />
        <div
          className="flex-1 min-w-0 cursor-pointer"
          onClick={() => setInfoOpen(true)}
          onKeyDown={(e) => e.key === 'Enter' && setInfoOpen(true)}
          role="button"
          tabIndex={0}
          aria-label="Group info"
        >
          <span className="font-semibold text-slate-800 block truncate text-base">
            {activeGroup.name}
          </span>
          <span className="text-xs text-slate-500">
            {activeGroup.members?.length || 0} members
          </span>
        </div>
      </div>
      <GroupInfoModal
        group={activeGroup}
        open={infoOpen}
        onClose={() => setInfoOpen(false)}
        onLeave={() => setMobileListVisible(true)}
      />

      <div className="flex-1 overflow-y-auto overflow-x-hidden p-4 space-y-1 overscroll-contain bg-slate-50/30">
        {groupMessages.map((msg) => (
          <GroupMessageBubble
            key={msg._id}
            message={msg}
            currentUserId={user?._id}
            onUnsend={handleUnsend}
          />
        ))}
        <div ref={messagesEndRef} />
      </div>

      <div className="shrink-0 p-3 md:p-4 border-t border-slate-200 flex gap-2 safe-area-bottom bg-white">
        <input
          ref={inputRef}
          type="text"
          placeholder="Type a message..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && sendMessage()}
          className="flex-1 min-h-[44px] px-4 py-3 md:py-2 rounded-xl border border-slate-200 bg-slate-50/50 text-slate-800 text-base placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
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
