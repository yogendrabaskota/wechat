'use client';

import Link from 'next/link';
import { useEffect, useCallback, useState } from 'react';
import { useAuthStore } from '@/store/authStore';
import { useChatStore, type Conversation, type ConversationUser, type Message, type Group } from '@/store/chatStore';
import SearchUser from './SearchUser';
import CreateGroupModal from './CreateGroupModal';
import Avatar from './Avatar';
import api from '@/lib/axios';

interface SidebarProps {
  onSelectConversation: (conv: Conversation, other: ConversationUser) => void;
  /** When true (e.g. inside ChatModal), header is compact (avatar + name only). When false, show "Back to feed" link. */
  embedded?: boolean;
}

export default function Sidebar({ onSelectConversation, embedded = false }: SidebarProps) {
  const { user } = useAuthStore();
  const {
    conversations,
    setConversations,
    setActiveConversation,
    setMessages,
    setActiveGroup,
    setGroupMessages,
    activeReceiver,
    activeConversation,
    activeGroup,
    groups,
    setGroups,
    onlineUserIds,
    prependConversation,
    setMobileListVisible,
  } = useChatStore();
  const [createGroupOpen, setCreateGroupOpen] = useState(false);

  const loadConversations = useCallback(async () => {
    if (!user) return;
    try {
      const { data } = await api.get<Conversation[]>('/api/conversations');
      setConversations(Array.isArray(data) ? data : []);
    } catch {
      setConversations([]);
    }
  }, [user, setConversations]);

  const loadGroups = useCallback(async () => {
    if (!user) return;
    try {
      const { data } = await api.get<Group[]>('/api/groups');
      setGroups(Array.isArray(data) ? data : []);
    } catch {
      setGroups([]);
    }
  }, [user, setGroups]);

  useEffect(() => {
    loadConversations();
    loadGroups();
  }, [loadConversations, loadGroups]);

  const handleSelectUser = async (selected: ConversationUser) => {
    try {
      setActiveGroup(null);
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

  const otherMember = (conv: Conversation): ConversationUser | null => {
    const other = conv.members?.find((m) => m._id !== user?._id);
    return other || null;
  };

  const handleConversationClick = (conv: Conversation, other: ConversationUser) => {
    setActiveGroup(null);
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

  const handleGroupClick = (group: Group) => {
    setActiveConversation(null, null);
    setActiveGroup(group);
    setGroupMessages([]);
    api
      .get<Parameters<typeof setGroupMessages>[0]>(`/api/groups/${group._id}/messages`)
      .then(({ data }) => setGroupMessages(data || []));
    setMobileListVisible(false);
  };

  return (
    <div className="w-full h-full min-w-0 flex flex-col bg-white border-r border-slate-200 overflow-hidden">
      <div className="p-3 md:p-4 border-b border-slate-200 flex items-center gap-2 min-h-[56px] safe-area-top">
        <Avatar src={user?.profilePic} name={user?.name ?? ''} size="sm" className="shrink-0" />
        <span className="font-semibold text-slate-800 truncate text-base flex-1 min-w-0">
          {user?.name}
        </span>
      </div>

      <SearchUser onSelectUser={handleSelectUser} />

      <div className="flex-1 min-w-0 overflow-y-auto overflow-x-hidden">
        <div className="px-3 py-2 flex items-center justify-between">
          <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">
            Chats
          </p>
          <button
            type="button"
            onClick={() => setCreateGroupOpen(true)}
            className="text-xs font-medium text-blue-600 hover:text-blue-700"
          >
            New group
          </button>
        </div>
        {conversations.length === 0 && (
          <p className="px-3 py-2 text-sm text-slate-500">
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
                  className={`w-full text-left px-3 py-3 md:py-2.5 flex items-center gap-3 rounded-xl mx-2 min-h-[56px] md:min-h-0 active:opacity-90 ${
                    isActive
                      ? 'bg-blue-50 text-blue-700'
                      : 'hover:bg-slate-50 text-slate-800'
                  }`}
                >
                  <span className="relative flex shrink-0">
                    <Avatar
                      src={other.profilePic}
                      name={other.name}
                      size="md"
                      className="w-10 h-10 md:w-8 md:h-8"
                    />
                    {isOnline && (
                      <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-500 border-2 border-white rounded-full" />
                    )}
                  </span>
                  <span className="flex-1 min-w-0">
                    <span className="block truncate font-medium text-slate-800 text-base md:text-sm">
                      {other.name}
                    </span>
                    <span className="block truncate text-xs text-slate-500">
                      {other.email}
                    </span>
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
        <p className="px-3 py-2 text-xs font-medium text-slate-500 uppercase tracking-wide">
          Groups
        </p>
        {groups.length === 0 && (
          <p className="px-3 py-2 text-sm text-slate-500">
            No groups yet. Create one or accept an invite.
          </p>
        )}
        <ul className="space-y-0.5 pb-4">
          {groups.map((group) => {
            const isActive = activeGroup?._id === group._id;
            return (
              <li key={group._id}>
                <button
                  type="button"
                  onClick={() => handleGroupClick(group)}
                  className={`w-full text-left px-3 py-3 md:py-2.5 flex items-center gap-3 rounded-xl mx-2 min-h-[56px] md:min-h-0 active:opacity-90 ${
                    isActive
                      ? 'bg-blue-50 text-blue-700'
                      : 'hover:bg-slate-50 text-slate-800'
                  }`}
                >
                  <Avatar
                    src={group.profilePic}
                    name={group.name}
                    size="md"
                    className="w-10 h-10 md:w-8 md:h-8 rounded-full bg-indigo-500 text-white font-medium [&>img]:rounded-full"
                  />
                  <span className="flex-1 min-w-0">
                    <span className="block truncate font-medium text-slate-800 text-base md:text-sm">
                      {group.name}
                    </span>
                    <span className="block truncate text-xs text-slate-500">
                      {group.members?.length || 0} members
                    </span>
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </div>
      <CreateGroupModal open={createGroupOpen} onClose={() => setCreateGroupOpen(false)} />
    </div>
  );
}
