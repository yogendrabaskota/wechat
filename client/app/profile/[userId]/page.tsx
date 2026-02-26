'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { useRouter, useParams } from 'next/navigation';
import api from '@/lib/axios';
import { useAuthStore } from '@/store/authStore';
import Avatar from '@/components/Avatar';
import PostCard from '@/components/PostCard';
import type { Post } from '@/components/Feed';

interface ProfileUser {
  _id: string;
  name: string;
  email: string;
  profilePic?: string | null;
}

type FriendStatus = 'self' | 'none' | 'friends' | 'pending_sent' | 'pending_received';

export default function UserProfilePage() {
  const router = useRouter();
  const params = useParams();
  const userId = typeof params.userId === 'string' ? params.userId : '';
  const { user: currentUser, token } = useAuthStore();
  const [profileUser, setProfileUser] = useState<ProfileUser | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [friendStatus, setFriendStatus] = useState<FriendStatus>('none');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [sendingRequest, setSendingRequest] = useState(false);

  const loadUserAndPosts = useCallback(async () => {
    if (!userId || !token) return;
    if (currentUser && userId === currentUser._id) {
      router.replace('/profile');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const [userRes, postsRes, statusRes] = await Promise.all([
        api.get<ProfileUser>(`/api/users/${userId}`),
        api.get<Post[]>(`/api/posts/user/${userId}`),
        api.get<{ status: FriendStatus }>(`/api/friends/status/${userId}`),
      ]);
      setProfileUser(userRes.data);
      setPosts(Array.isArray(postsRes.data) ? postsRes.data : []);
      setFriendStatus(statusRes.data.status);
    } catch (err: unknown) {
      const ax = err as { response?: { status: number } };
      if (ax.response?.status === 404) setError('User not found');
      else setError('Failed to load profile');
      setProfileUser(null);
      setPosts([]);
      setFriendStatus('none');
    } finally {
      setLoading(false);
    }
  }, [userId, token, currentUser, router]);

  const sendFriendRequest = async () => {
    if (!userId || sendingRequest) return;
    setSendingRequest(true);
    try {
      await api.post(`/api/friends/request/${userId}`);
      setFriendStatus('pending_sent');
    } catch {
      // ignore
    } finally {
      setSendingRequest(false);
    }
  };

  useEffect(() => {
    if (!currentUser || !token) {
      router.push('/login');
      return;
    }
    if (!userId) return;
    if (userId === currentUser._id) {
      router.replace('/profile');
      return;
    }
    loadUserAndPosts();
  }, [currentUser, token, userId, router, loadUserAndPosts]);

  const handlePostUpdated = (updated: Post) => {
    setPosts((prev) => prev.map((p) => (p._id === updated._id ? updated : p)));
  };

  if (!currentUser) return null;

  if (userId === currentUser._id) return null;

  if (loading && !profileUser) {
    return (
      <main className="min-h-screen flex flex-col bg-slate-50">
        <header className="sticky top-0 z-10 shrink-0 px-3 sm:px-4 py-2.5 sm:py-3 border-b border-slate-200 bg-white flex items-center gap-2 safe-area-top shadow-sm">
          <Link href="/" className="min-h-[44px] min-w-[44px] flex items-center justify-center -ml-1 rounded-xl hover:bg-slate-100 text-slate-600" aria-label="Back">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </Link>
          <h1 className="text-lg sm:text-xl font-semibold text-slate-800 flex-1 truncate">Profile</h1>
        </header>
        <div className="flex justify-center py-12">
          <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
        </div>
      </main>
    );
  }

  if (error || !profileUser) {
    return (
      <main className="min-h-screen flex flex-col bg-slate-50">
        <header className="sticky top-0 z-10 shrink-0 px-3 sm:px-4 py-2.5 sm:py-3 border-b border-slate-200 bg-white flex items-center gap-2 safe-area-top shadow-sm">
          <Link href="/" className="min-h-[44px] min-w-[44px] flex items-center justify-center -ml-1 rounded-xl hover:bg-slate-100 text-slate-600" aria-label="Back">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </Link>
          <h1 className="text-lg sm:text-xl font-semibold text-slate-800 flex-1 truncate">Profile</h1>
        </header>
        <div className="flex-1 flex flex-col items-center justify-center px-4 text-center">
          <p className="text-slate-600 mb-4">{error || 'User not found'}</p>
          <Link href="/" className="text-blue-600 hover:underline font-medium">Back to feed</Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen flex flex-col bg-slate-50">
      <header className="sticky top-0 z-10 shrink-0 px-4 py-3 border-b border-slate-200 bg-white flex items-center gap-2 safe-area-top shadow-sm">
        <Link href="/" className="min-h-[44px] min-w-[44px] flex items-center justify-center -ml-1 rounded-xl hover:bg-slate-100 text-slate-600 hover:text-slate-800" aria-label="Back to feed">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </Link>
        <h1 className="text-lg sm:text-xl font-semibold text-slate-800 flex-1 truncate">Profile</h1>
      </header>

      <div className="bg-white border-b border-slate-200 px-3 sm:px-4 py-5 sm:py-6">
        <div className="max-w-2xl mx-auto flex flex-col sm:flex-row items-center gap-4">
          <div className="relative shrink-0">
            <Avatar
              src={profileUser.profilePic}
              name={profileUser.name}
              size="lg"
              className="w-20 h-20 sm:w-24 sm:h-24 ring-2 ring-slate-100"
            />
            <div className="absolute bottom-0 right-0 w-8 h-8 rounded-full bg-white border-2 border-slate-200 flex items-center justify-center shadow-sm">
              {friendStatus === 'friends' ? (
                <Link
                  href={`/chat?userId=${profileUser._id}`}
                  className="text-blue-600 hover:text-blue-700 p-1"
                  aria-label="Message"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 2 13.574 2 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                  </svg>
                </Link>
              ) : friendStatus === 'none' ? (
                <button
                  type="button"
                  onClick={sendFriendRequest}
                  disabled={sendingRequest}
                  className="text-blue-600 hover:text-blue-700 p-1 disabled:opacity-50"
                  aria-label="Add friend"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                </button>
              ) : friendStatus === 'pending_sent' ? (
                <span className="text-slate-400" title="Request sent">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </span>
              ) : null}
            </div>
          </div>
          <div className="text-center sm:text-left min-w-0 flex-1">
            <h2 className="text-lg font-semibold text-slate-800 truncate">{profileUser.name}</h2>
            <p className="text-sm text-slate-500 truncate">{profileUser.email}</p>
            <p className="text-sm text-slate-500 mt-1">
              {posts.length} {posts.length === 1 ? 'post' : 'posts'}
            </p>
            {friendStatus === 'friends' && (
              <Link
                href={`/chat?userId=${profileUser._id}`}
                className="mt-2 inline-flex items-center gap-1.5 text-blue-600 hover:underline text-sm font-medium"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 2 13.574 2 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
                Message
              </Link>
            )}
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto pb-8 safe-area-inset-bottom">
        {posts.length === 0 ? (
          <div className="text-center py-12 px-4 text-slate-500">
            <p>No posts yet.</p>
            <Link href="/" className="text-blue-600 hover:underline mt-2 inline-block font-medium">Back to feed</Link>
          </div>
        ) : (
          <ul className="max-w-2xl mx-auto w-full px-2 sm:px-3 py-4 space-y-4">
            {posts.map((post) => (
              <li key={post._id}>
                <PostCard post={post} onUpdate={handlePostUpdated} />
              </li>
            ))}
          </ul>
        )}
      </div>
    </main>
  );
}
