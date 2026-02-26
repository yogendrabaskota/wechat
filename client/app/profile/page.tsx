'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import api from '@/lib/axios';
import { useAuthStore } from '@/store/authStore';
import Avatar from '@/components/Avatar';
import PostCard from '@/components/PostCard';
import type { Post } from '@/components/Feed';

interface FriendUser {
  _id: string;
  name: string;
  email: string;
  profilePic?: string | null;
}

export default function ProfilePage() {
  const router = useRouter();
  const { user, token } = useAuthStore();
  const [posts, setPosts] = useState<Post[]>([]);
  const [friends, setFriends] = useState<FriendUser[]>([]);
  const [loading, setLoading] = useState(true);

  const loadPosts = useCallback(async () => {
    if (!user?._id || !token) return;
    try {
      const { data } = await api.get<Post[]>(`/api/posts/user/${user._id}`);
      setPosts(Array.isArray(data) ? data : []);
    } catch {
      setPosts([]);
    } finally {
      setLoading(false);
    }
  }, [user?._id, token]);

  const loadFriends = useCallback(async () => {
    if (!token) return;
    try {
      const { data } = await api.get<FriendUser[]>('/api/friends');
      setFriends(Array.isArray(data) ? data : []);
    } catch {
      setFriends([]);
    }
  }, [token]);

  useEffect(() => {
    if (!user || !token) {
      router.push('/login');
      return;
    }
    loadPosts();
    loadFriends();
  }, [user, token, router, loadPosts, loadFriends]);

  const handlePostUpdated = (updated: Post) => {
    setPosts((prev) => prev.map((p) => (p._id === updated._id ? updated : p)));
  };

  const handlePostTrashed = (postId: string) => {
    setPosts((prev) => prev.filter((p) => p._id !== postId));
  };

  if (!user) return null;

  return (
    <main className="min-h-screen flex flex-col bg-slate-50">
      <header className="sticky top-0 z-10 shrink-0 px-4 py-3 border-b border-slate-200 bg-white flex items-center gap-2 safe-area-top shadow-sm">
        <Link
          href="/"
          className="min-h-[44px] min-w-[44px] flex items-center justify-center -ml-1 rounded-xl hover:bg-slate-100 text-slate-600 hover:text-slate-800"
          aria-label="Back to feed"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </Link>
        <h1 className="text-lg sm:text-xl font-semibold text-slate-800 flex-1 truncate">Profile</h1>
      </header>

      <div className="bg-white border-b border-slate-200 px-3 sm:px-4 py-5 sm:py-6">
        <div className="max-w-2xl mx-auto flex flex-col sm:flex-row items-center gap-4">
          <Avatar
            src={user.profilePic}
            name={user.name}
            size="lg"
            className="w-20 h-20 sm:w-24 sm:h-24 shrink-0 ring-2 ring-slate-100"
          />
          <div className="text-center sm:text-left min-w-0">
            <h2 className="text-lg font-semibold text-slate-800 truncate">{user.name}</h2>
            <p className="text-sm text-slate-500 truncate">{user.email}</p>
            <p className="text-sm text-slate-500 mt-1">
              {posts.length} {posts.length === 1 ? 'post' : 'posts'}
            </p>
          </div>
        </div>
      </div>

      {friends.length > 0 && (
        <div className="bg-white border-b border-slate-200 px-4 py-4">
          <div className="max-w-2xl mx-auto">
            <h3 className="text-sm font-semibold text-slate-700 mb-3">Friends ({friends.length})</h3>
            <div className="flex flex-wrap gap-3">
              {friends.map((f) => (
                <Link
                  key={f._id}
                  href={`/profile/${f._id}`}
                  className="flex items-center gap-2 rounded-xl px-3 py-2 hover:bg-slate-50 min-w-0"
                >
                  <Avatar src={f.profilePic} name={f.name} size="sm" className="shrink-0 w-9 h-9" />
                  <span className="text-sm font-medium text-slate-800 truncate max-w-[120px]">{f.name}</span>
                </Link>
              ))}
            </div>
          </div>
        </div>
      )}

      <div className="flex-1 overflow-y-auto pb-8 safe-area-inset-bottom">
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : posts.length === 0 ? (
          <div className="text-center py-12 px-4 text-slate-500">
            <p>No posts yet.</p>
            <Link href="/" className="text-blue-600 hover:underline mt-2 inline-block font-medium">
              Back to feed
            </Link>
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
    </main>
  );
}
