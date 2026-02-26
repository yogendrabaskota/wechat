'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import api from '@/lib/axios';
import { useAuthStore } from '@/store/authStore';
import { useChatStore } from '@/store/chatStore';
import { getSocket, disconnectSocket } from '@/lib/socket';
import Avatar from './Avatar';
import PostCard from './PostCard';
import CreatePostModal from './CreatePostModal';
import Notifications from './Notifications';
import ChatModal from './ChatModal';
import type { ConversationUser } from '@/store/chatStore';

const SEARCH_HISTORY_KEY = 'feed-search-history';
const SEARCH_HISTORY_MAX = 5;
const SUGGESTION_DEBOUNCE_MS = 3000;

function getSearchHistory(): string[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(SEARCH_HISTORY_KEY);
    const arr = raw ? JSON.parse(raw) : [];
    return Array.isArray(arr) ? arr.slice(0, SEARCH_HISTORY_MAX) : [];
  } catch {
    return [];
  }
}

function addToSearchHistory(query: string) {
  const q = query.trim();
  if (!q) return;
  const prev = getSearchHistory().filter((s) => s.toLowerCase() !== q.toLowerCase());
  const next = [q, ...prev].slice(0, SEARCH_HISTORY_MAX);
  try {
    localStorage.setItem(SEARCH_HISTORY_KEY, JSON.stringify(next));
  } catch {
    // ignore
  }
}

export interface PostAuthor {
  _id: string;
  name: string;
  profilePic?: string | null;
}

export interface PostComment {
  _id?: string;
  author: PostAuthor;
  text: string;
  createdAt: string;
}

export interface Post {
  _id: string;
  author: PostAuthor;
  caption: string;
  image?: string | null;
  likes: string[];
  comments: PostComment[];
  createdAt: string;
}

export default function Feed() {
  const router = useRouter();
  const { user, token, logout } = useAuthStore();
  const { addNotification } = useChatStore();
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<ConversationUser[]>([]);
  const [searching, setSearching] = useState(false);
  const [searchFocused, setSearchFocused] = useState(false);
  const [searchHistory, setSearchHistory] = useState<string[]>([]);
  const searchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const searchContainerRef = useRef<HTMLDivElement>(null);

  const runSearch = useCallback(async (query?: string) => {
    const q = (query ?? searchQuery).trim();
    if (!q) {
      setSearchResults([]);
      return;
    }
    setSearching(true);
    try {
      const { data } = await api.get<ConversationUser[]>('/api/users/search', { params: { query: q } });
      setSearchResults(Array.isArray(data) ? data : []);
      addToSearchHistory(q);
      setSearchHistory(getSearchHistory());
    } catch {
      setSearchResults([]);
    } finally {
      setSearching(false);
    }
  }, [searchQuery]);

  const fetchSuggestions = useCallback(async (q: string) => {
    if (!q.trim()) {
      setSearchResults([]);
      return;
    }
    setSearching(true);
    try {
      const { data } = await api.get<ConversationUser[]>('/api/users/search', { params: { query: q.trim() } });
      setSearchResults(Array.isArray(data) ? data : []);
    } catch {
      setSearchResults([]);
    } finally {
      setSearching(false);
    }
  }, []);

  useEffect(() => {
    if (searchQuery.trim() === '') {
      if (searchDebounceRef.current) {
        clearTimeout(searchDebounceRef.current);
        searchDebounceRef.current = null;
      }
      setSearchResults([]);
      return;
    }
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    searchDebounceRef.current = setTimeout(() => {
      searchDebounceRef.current = null;
      fetchSuggestions(searchQuery);
    }, SUGGESTION_DEBOUNCE_MS);
    return () => {
      if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    };
  }, [searchQuery, fetchSuggestions]);

  const handleSearchUserClick = (u: ConversationUser) => {
    const q = searchQuery.trim();
    if (q) addToSearchHistory(q);
    setSearchHistory(getSearchHistory());
    setSearchQuery('');
    setSearchResults([]);
    setSearchFocused(false);
    router.push(`/profile/${u._id}`);
  };

  const handleHistoryClick = (term: string) => {
    setSearchQuery(term);
    setSearchFocused(false);
    runSearch(term);
  };

  useEffect(() => {
    setSearchHistory(getSearchHistory());
  }, []);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (searchContainerRef.current && !searchContainerRef.current.contains(e.target as Node)) {
        setSearchFocused(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (!token) return;
    const socket = getSocket(token);
    const onNotif = (n: Parameters<typeof addNotification>[0]) => addNotification(n);
    socket.on('new_notification', onNotif);
    return () => socket.off('new_notification', onNotif);
  }, [token, addNotification]);

  const loadFeed = useCallback(async () => {
    try {
      const { data } = await api.get<Post[]>('/api/posts');
      setPosts(Array.isArray(data) ? data : []);
    } catch {
      setPosts([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadFeed();
  }, [loadFeed]);

  const handlePostCreated = (newPost: Post) => {
    setPosts((prev) => [newPost, ...prev]);
    setCreateOpen(false);
  };

  const handlePostUpdated = (updated: Post) => {
    setPosts((prev) => prev.map((p) => (p._id === updated._id ? updated : p)));
  };

  const handlePostTrashed = (postId: string) => {
    setPosts((prev) => prev.filter((p) => p._id !== postId));
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

  const showHistory = searchFocused && searchQuery.trim() === '' && searchHistory.length > 0;
  const showDropdown = searchFocused && (showHistory || searchResults.length > 0);

  return (
    <main className="min-h-screen min-h-[100dvh] flex flex-col bg-slate-50">
      <header className="sticky top-0 z-10 shrink-0 px-2 py-2 sm:px-4 sm:py-3 border-b border-slate-200 bg-white flex items-center gap-1.5 sm:gap-2 safe-area-top shadow-sm flex-wrap sm:flex-nowrap">
        <h1 className="text-base sm:text-xl font-semibold text-slate-800 shrink-0 min-w-0 truncate">Feed</h1>
        <div className="flex items-center shrink-0">
          <Notifications />
        </div>
        <div ref={searchContainerRef} className="flex-1 min-w-0 flex flex-col relative w-full max-w-md mx-auto order-last sm:order-none basis-full sm:basis-auto">
          <input
            type="text"
            placeholder="Search users..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onFocus={() => setSearchFocused(true)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                runSearch();
                setSearchFocused(true);
              }
            }}
            className="w-full min-h-[40px] sm:min-h-[44px] px-3 sm:px-4 py-2 rounded-xl border border-slate-200 bg-slate-50/50 text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm"
          />
          {showDropdown && (
            <ul className="absolute top-full left-0 right-0 mt-1 rounded-xl border border-slate-200 bg-white shadow-lg overflow-hidden max-h-60 overflow-y-auto z-20">
              {showHistory ? (
                searchHistory.map((term, i) => (
                  <li key={i}>
                    <button
                      type="button"
                      onClick={() => handleHistoryClick(term)}
                      className="w-full text-left px-3 py-3 flex items-center gap-3 hover:bg-slate-50 text-slate-800"
                    >
                      <span className="text-slate-400 shrink-0" aria-hidden>
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </span>
                      <span className="truncate">{term}</span>
                    </button>
                  </li>
                ))
              ) : (
                searchResults.map((u) => (
                  <li key={u._id}>
                    <button
                      type="button"
                      onClick={() => handleSearchUserClick(u)}
                      className="w-full text-left px-3 py-3 flex items-center gap-3 hover:bg-slate-50"
                    >
                      <Avatar src={u.profilePic} name={u.name} size="sm" className="shrink-0" />
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-slate-800 truncate">{u.name}</p>
                        <p className="text-xs text-slate-500 truncate">{u.email}</p>
                      </div>
                    </button>
                  </li>
                ))
              )}
            </ul>
          )}
        </div>
        <div className="flex items-center gap-0.5 sm:gap-2 shrink-0">
          <Link
            href="/profile"
            className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-full ring-2 ring-transparent hover:ring-slate-200 focus:ring-2 focus:ring-blue-500 transition-shadow -mr-0.5 sm:mr-0"
            aria-label="Profile"
          >
            <Avatar src={user?.profilePic} name={user?.name ?? ''} size="sm" className="w-9 h-9 sm:w-10 sm:h-10" />
          </Link>
          <button
            type="button"
            onClick={() => setChatOpen(true)}
            className="min-h-[44px] min-w-[44px] sm:min-w-0 sm:px-4 py-2 rounded-xl bg-blue-600 text-white hover:bg-blue-700 active:opacity-90 font-medium text-sm flex items-center justify-center gap-2 shadow-sm"
          >
            <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 2 13.574 2 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
            <span className="hidden sm:inline">Chat</span>
          </button>
          <button
            type="button"
            onClick={handleLogout}
            className="text-red-600 hover:text-red-700 active:opacity-80 min-h-[44px] min-w-[44px] sm:min-w-0 px-2 sm:px-3 py-2 rounded-xl hover:bg-red-50 font-medium flex items-center justify-center text-sm"
            aria-label="Logout"
          >
            <span className="hidden sm:inline">Logout</span>
            <svg className="w-5 h-5 sm:hidden" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
          </button>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto pb-24 safe-area-inset-bottom">
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : posts.length === 0 ? (
          <div className="text-center py-12 px-4 text-slate-500">
            <p className="mb-2 font-medium text-slate-600">No posts yet.</p>
            <p className="text-sm">Be the first to share something!</p>
          </div>
        ) : (
          <ul className="max-w-2xl mx-auto w-full px-2 sm:px-3 py-4 space-y-4">
            {posts.map((post) => (
              <li key={post._id}>
                <PostCard post={post} onUpdate={handlePostUpdated} onTrash={handlePostTrashed} />
              </li>
            ))}
          </ul>
        )}
      </div>

      <button
        type="button"
        onClick={() => setCreateOpen(true)}
        className="fixed bottom-5 right-5 sm:bottom-6 sm:right-6 w-14 h-14 rounded-full bg-blue-600 text-white hover:bg-blue-700 active:opacity-90 shadow-lg hover:shadow-xl transition-shadow flex items-center justify-center safe-area-bottom z-[5]"
        aria-label="Create post"
      >
        <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
        </svg>
      </button>

      <CreatePostModal open={createOpen} onClose={() => setCreateOpen(false)} onCreated={handlePostCreated} />
      <ChatModal open={chatOpen} onClose={() => setChatOpen(false)} />
    </main>
  );
}
