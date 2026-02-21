import { create } from 'zustand';

export interface Message {
  _id: string;
  senderId: { _id: string; name: string };
  receiverId: { _id: string; name: string };
  conversationId: string;
  text: string;
  seen: boolean;
  createdAt: string;
  deleted?: boolean;
  deletedAt?: string;
}

export interface ConversationUser {
  _id: string;
  name: string;
  email: string;
}

export interface Conversation {
  _id: string;
  members: ConversationUser[];
  createdAt: string;
}

export interface GroupMember {
  _id: string;
  name: string;
  email: string;
}

export interface Group {
  _id: string;
  name: string;
  createdBy: GroupMember;
  members: GroupMember[];
  admins?: GroupMember[];
  createdAt?: string;
}

export interface GroupMessage {
  _id: string;
  groupId: string;
  senderId: { _id: string; name: string } | null;
  text: string;
  createdAt: string;
  type?: 'message' | 'system';
  deleted?: boolean;
  deletedAt?: string;
}

export interface NotificationItem {
  _id: string;
  type: string;
  fromUserId: ConversationUser;
  groupId?: { _id: string; name: string };
  message?: string;
  createdAt: string;
}

interface ChatState {
  conversations: Conversation[];
  activeConversation: Conversation | null;
  messages: Message[];
  activeReceiver: ConversationUser | null;
  onlineUserIds: Set<string>;
  typingUserId: string | null;
  groups: Group[];
  activeGroup: Group | null;
  groupMessages: GroupMessage[];
  notifications: NotificationItem[];
  setConversations: (list: Conversation[]) => void;
  setActiveConversation: (conv: Conversation | null, receiver: ConversationUser | null) => void;
  setMessages: (messages: Message[]) => void;
  addMessage: (message: Message) => void;
  setMessageSeen: (messageId: string) => void;
  setOnlineUserIds: (ids: string[]) => void;
  addOnlineUser: (userId: string) => void;
  removeOnlineUser: (userId: string) => void;
  prependConversation: (conv: Conversation) => void;
  setTypingUser: (userId: string | null, isTyping: boolean) => void;
  mobileListVisible: boolean;
  setMobileListVisible: (visible: boolean) => void;
  setGroups: (list: Group[]) => void;
  setActiveGroup: (group: Group | null) => void;
  setGroupMessages: (messages: GroupMessage[]) => void;
  addGroupMessage: (message: GroupMessage) => void;
  setMessageDeleted: (messageId: string) => void;
  setGroupMessageDeleted: (messageId: string) => void;
  prependGroup: (group: Group) => void;
  setNotifications: (list: NotificationItem[]) => void;
  addNotification: (n: NotificationItem) => void;
  removeNotification: (id: string) => void;
}

export const useChatStore = create<ChatState>((set) => ({
  conversations: [],
  activeConversation: null,
  messages: [],
  activeReceiver: null,
  onlineUserIds: new Set(),
  typingUserId: null,
  mobileListVisible: true,
  groups: [],
  activeGroup: null,
  groupMessages: [],
  notifications: [],

  setConversations: (list) => set({ conversations: list }),

  setActiveConversation: (conv, receiver) =>
    set({ activeConversation: conv, activeReceiver: receiver }),

  setMessages: (messages) => set({ messages }),

  addMessage: (message) =>
    set((state) => ({
      messages: [...state.messages, message],
    })),

  setMessageSeen: (messageId) =>
    set((state) => ({
      messages: state.messages.map((m) =>
        m._id === messageId ? { ...m, seen: true } : m
      ),
    })),

  setOnlineUserIds: (ids) => set({ onlineUserIds: new Set(ids) }),

  addOnlineUser: (userId) =>
    set((state) => {
      const next = new Set(state.onlineUserIds);
      next.add(userId);
      return { onlineUserIds: next };
    }),

  removeOnlineUser: (userId) =>
    set((state) => {
      const next = new Set(state.onlineUserIds);
      next.delete(userId);
      return { onlineUserIds: next };
    }),

  prependConversation: (conv) =>
    set((state) => {
      const exists = state.conversations.some((c) => c._id === conv._id);
      if (exists) return state;
      return {
        conversations: [conv, ...state.conversations],
      };
    }),

  setTypingUser: (userId, isTyping) =>
    set((state) => ({
      typingUserId: isTyping
        ? userId
        : userId === null || state.typingUserId === userId
          ? null
          : state.typingUserId,
    })),

  setMobileListVisible: (visible) => set({ mobileListVisible: visible }),

  setGroups: (list) => set({ groups: list }),
  setActiveGroup: (group) => set({ activeGroup: group }),
  setGroupMessages: (messages) => set({ groupMessages: messages }),
  addGroupMessage: (message) =>
    set((state) => ({ groupMessages: [...state.groupMessages, message] })),
  setMessageDeleted: (messageId) =>
    set((state) => ({
      messages: state.messages.map((m) =>
        m._id === messageId ? { ...m, deleted: true, deletedAt: new Date().toISOString() } : m
      ),
    })),
  setGroupMessageDeleted: (messageId) =>
    set((state) => ({
      groupMessages: state.groupMessages.map((m) =>
        m._id === messageId ? { ...m, deleted: true, deletedAt: new Date().toISOString() } : m
      ),
    })),
  prependGroup: (group) =>
    set((state) => {
      if (state.groups.some((g) => g._id === group._id)) return state;
      return { groups: [group, ...state.groups] };
    }),
  setNotifications: (list) => set({ notifications: list }),
  addNotification: (n) =>
    set((state) => ({
      notifications: [n, ...state.notifications.filter((x) => x._id !== n._id)],
    })),
  removeNotification: (id) =>
    set((state) => ({
      notifications: state.notifications.filter((x) => x._id !== id),
    })),
}));
