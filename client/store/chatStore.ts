import { create } from 'zustand';

export interface Message {
  _id: string;
  senderId: { _id: string; name: string };
  receiverId: { _id: string; name: string };
  conversationId: string;
  text: string;
  seen: boolean;
  createdAt: string;
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

interface ChatState {
  conversations: Conversation[];
  activeConversation: Conversation | null;
  messages: Message[];
  activeReceiver: ConversationUser | null;
  onlineUserIds: Set<string>;
  typingUserId: string | null;
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
}

export const useChatStore = create<ChatState>((set) => ({
  conversations: [],
  activeConversation: null,
  messages: [],
  activeReceiver: null,
  onlineUserIds: new Set(),
  typingUserId: null,

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
}));
