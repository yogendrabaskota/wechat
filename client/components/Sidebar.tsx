'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useCallback, useState } from 'react';
import { useAuthStore } from '@/store/authStore';
import { useChatStore, type Conversation, type ConversationUser, type Message, type Group } from '@/store/chatStore';
import SearchUser from './SearchUser';
import Notifications from './Notifications';
import CreateGroupModal from './CreateGroupModal';
import Avatar from './Avatar';
import api from '@/lib/axios';
import { disconnectSocket, getSocket } from '@/lib/socket';

interface SidebarProps {
  onSelectConversation: (conv: Conversation, other: ConversationUser) => void;
}

export default function Sidebar({ onSelectConversation }: SidebarProps) {
  const router = useRouter();
  const { user, token, logout } = useAuthStore();
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
    addNotification,
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

  useEffect(() => {
    if (!token) return;
    const socket = getSocket(token);
    const onNotif = (n: Parameters<typeof addNotification>[0]) => {
      addNotification(n);
    };
    socket.on('new_notification', onNotif);
    return () => socket.off('new_notification', onNotif);
  }, [token, addNotification]);

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
    <div className="w-full md:w-80 h-full flex flex-col bg-gray-50 dark:bg-gray-800">
      <div className="p-3 md:p-4 border-b border-gray-200 dark:border-gray-700 flex items-center gap-2 min-h-[56px] safe-area-top">
        <Avatar src={user?.profilePic} name={user?.name ?? ''} size="sm" className="shrink-0" />
        <span className="font-semibold text-gray-900 dark:text-gray-100 truncate text-base flex-1 min-w-0">
          {user?.name}
        </span>
        <Notifications />
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
        <div className="px-3 py-2 flex items-center justify-between">
          <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
            Chats
          </p>
          <button
            type="button"
            onClick={() => setCreateGroupOpen(true)}
            className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
          >
            New group
          </button>
        </div>
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
                    <Avatar
                      src={other.profilePic}
                      name={other.name}
                      size="md"
                      className="w-10 h-10 md:w-8 md:h-8"
                    />
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
        <p className="px-3 py-2 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
          Groups
        </p>
        {groups.length === 0 && (
          <p className="px-3 py-2 text-sm text-gray-500 dark:text-gray-400">
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
                  className={`w-full text-left px-3 py-3 md:py-2.5 flex items-center gap-3 rounded-lg mx-2 min-h-[56px] md:min-h-0 active:opacity-90 ${
                    isActive
                      ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200'
                      : 'hover:bg-gray-200 dark:hover:bg-gray-700'
                  }`}
                >
                  <Avatar
                    src={group.profilePic}
                    name={group.name}
                    size="md"
                    className="w-10 h-10 md:w-8 md:h-8 rounded-full bg-purple-500 dark:bg-purple-600 text-white font-medium [&>img]:rounded-full"
                  />
                  <span className="flex-1 min-w-0">
                    <span className="block truncate font-medium text-gray-900 dark:text-gray-100 text-base md:text-sm">
                      {group.name}
                    </span>
                    <span className="block truncate text-xs text-gray-500 dark:text-gray-400">
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
