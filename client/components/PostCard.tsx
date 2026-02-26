'use client';

import { useState } from 'react';
import Link from 'next/link';
import api from '@/lib/axios';
import { useAuthStore } from '@/store/authStore';
import Avatar from './Avatar';
import type { Post } from './Feed';

interface PostCardProps {
  post: Post;
  onUpdate: (updated: Post) => void;
  /** Called when post is moved to trash (author only). Remove from feed. */
  onTrash?: (postId: string) => void;
}

export default function PostCard({ post, onUpdate, onTrash }: PostCardProps) {
  const { user } = useAuthStore();
  const [commentText, setCommentText] = useState('');
  const [liking, setLiking] = useState(false);
  const [commenting, setCommenting] = useState(false);
  const [trashing, setTrashing] = useState(false);
  const isAuthor = user && post.author._id === user._id;

  const isLiked = user && post.likes.includes(user._id);
  const likeCount = post.likes.length;
  const commentCount = post.comments.length;

  const handleLike = async () => {
    if (!user || liking) return;
    setLiking(true);
    try {
      const { data } = await api.post<Post>(`/api/posts/${post._id}/like`);
      onUpdate(data);
    } catch {
      // ignore
    } finally {
      setLiking(false);
    }
  };

  const handleComment = async (e: React.FormEvent) => {
    e.preventDefault();
    const text = commentText.trim();
    if (!text || !user || commenting) return;
    setCommenting(true);
    try {
      const { data } = await api.post<Post>(`/api/posts/${post._id}/comments`, { text });
      onUpdate(data);
      setCommentText('');
    } catch {
      // ignore
    } finally {
      setCommenting(false);
    }
  };

  const handleTrash = async () => {
    if (!isAuthor || trashing || !onTrash) return;
    if (!confirm('Move this post to trash? It will be permanently deleted after 30 days.')) return;
    setTrashing(true);
    try {
      await api.post(`/api/posts/${post._id}/trash`);
      onTrash(post._id);
    } catch {
      // ignore
    } finally {
      setTrashing(false);
    }
  };

  const timeAgo = (dateStr: string) => {
    const d = new Date(dateStr);
    const now = new Date();
    const s = Math.floor((now.getTime() - d.getTime()) / 1000);
    if (s < 60) return 'Just now';
    if (s < 3600) return `${Math.floor(s / 60)}m`;
    if (s < 86400) return `${Math.floor(s / 3600)}h`;
    if (s < 604800) return `${Math.floor(s / 86400)}d`;
    return d.toLocaleDateString();
  };

  return (
    <article className="rounded-2xl bg-white border border-slate-200 overflow-hidden shadow-sm hover:shadow-md transition-shadow duration-200 max-w-full">
      {/* Author */}
      <div className="px-3 sm:px-4 pt-3 sm:pt-4 pb-2.5 sm:pb-3 flex items-center gap-3">
        <Link
          href={`/profile/${post.author._id}`}
          className="shrink-0 rounded-full ring-2 ring-slate-100 hover:ring-slate-200 focus:ring-2 focus:ring-blue-500 transition-shadow"
          aria-label={`View ${post.author.name}'s profile`}
        >
          <Avatar src={post.author.profilePic} name={post.author.name} size="md" className="w-11 h-11" />
        </Link>
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-slate-800 truncate">{post.author.name}</p>
          <p className="text-xs text-slate-500">{timeAgo(post.createdAt)}</p>
        </div>
        {isAuthor && onTrash && (
          <button
            type="button"
            onClick={handleTrash}
            disabled={trashing}
            className="shrink-0 min-h-[40px] min-w-[40px] flex items-center justify-center rounded-xl text-slate-400 hover:text-red-600 hover:bg-red-50 disabled:opacity-50"
            aria-label="Move to trash"
            title="Move to trash (permanently deleted after 30 days)"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        )}
      </div>

      {/* Caption */}
      {post.caption ? (
        <div className="px-3 sm:px-4 pb-2.5 sm:pb-3">
          <p className="text-slate-700 leading-relaxed whitespace-pre-wrap break-words text-sm sm:text-base">{post.caption}</p>
        </div>
      ) : null}

      {/* Image */}
      {post.image ? (
        <div className="w-full bg-slate-100 overflow-hidden">
          <img
            src={post.image}
            alt="Post"
            className="w-full max-w-full max-h-[70vh] object-contain"
          />
        </div>
      ) : null}

      {/* Actions */}
      <div className="px-3 sm:px-4 py-2.5 sm:py-3 flex items-center gap-4 sm:gap-6 border-t border-slate-100">
        <button
          type="button"
          onClick={handleLike}
          disabled={!user || liking}
          className={`flex items-center gap-2 min-h-[44px] min-w-[44px] sm:min-w-0 px-3 rounded-xl transition-all duration-200 ${
            isLiked
              ? 'text-blue-600 bg-blue-50'
              : 'text-slate-500 hover:bg-slate-50 hover:text-slate-700'
          }`}
        >
          <svg
            className="w-5 h-5 shrink-0"
            fill={isLiked ? 'currentColor' : 'none'}
            stroke="currentColor"
            strokeWidth={1.5}
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
            />
          </svg>
          <span className="text-sm font-medium">
            {likeCount} {likeCount === 1 ? 'Like' : 'Likes'}
          </span>
        </button>
        <div className="flex items-center gap-2 text-slate-500">
          <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 2 13.574 2 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
          <span className="text-sm">{commentCount} {commentCount === 1 ? 'Comment' : 'Comments'}</span>
        </div>
      </div>

      {/* Comments list */}
      {commentCount > 0 && (
        <div className="px-3 sm:px-4 pb-2.5 sm:pb-3 pt-1 space-y-3 max-h-52 overflow-y-auto border-t border-slate-50">
          {post.comments.map((c, i) => (
            <div key={c._id || i} className="flex gap-3">
              <Avatar src={c.author.profilePic} name={c.author.name} size="xs" className="shrink-0 mt-0.5 w-7 h-7" />
              <div className="min-w-0 flex-1">
                <p className="text-sm leading-snug">
                  <span className="font-semibold text-slate-800">{c.author.name}</span>
                  {' '}
                  <span className="text-slate-600">{c.text}</span>
                </p>
                <p className="text-xs text-slate-400 mt-0.5">{timeAgo(c.createdAt)}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Comment input */}
      {user && (
        <form onSubmit={handleComment} className="p-2.5 sm:p-3 pt-2 border-t border-slate-100 flex gap-2 items-center bg-slate-50/50">
          <Avatar src={user.profilePic} name={user.name} size="xs" className="shrink-0 w-8 h-8" />
          <input
            type="text"
            placeholder="Write a comment..."
            value={commentText}
            onChange={(e) => setCommentText(e.target.value)}
            disabled={commenting}
            className="flex-1 min-h-[44px] min-w-0 pl-3 sm:pl-4 pr-3 sm:pr-4 py-2 rounded-full border border-slate-200 bg-white text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 [font-size:16px]"
          />
          <button
            type="submit"
            disabled={!commentText.trim() || commenting}
            className="text-sm font-semibold text-blue-600 hover:text-blue-700 disabled:opacity-50 disabled:cursor-not-allowed shrink-0 px-2"
          >
            Post
          </button>
        </form>
      )}
    </article>
  );
}
