'use client';

import { useState, useRef } from 'react';
import api from '@/lib/axios';
import type { Post } from './Feed';

const fileToBase64 = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
  });

interface CreatePostModalProps {
  open: boolean;
  onClose: () => void;
  onCreated: (post: Post) => void;
}

export default function CreatePostModal({ open, onClose, onCreated }: CreatePostModalProps) {
  const [caption, setCaption] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [posting, setPosting] = useState(false);
  const [error, setError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !file.type.startsWith('image/')) return;
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!caption.trim() && !imageFile) {
      setError('Add a caption or a photo.');
      return;
    }
    setError('');
    setPosting(true);
    try {
      let imageBase64: string | undefined;
      if (imageFile) imageBase64 = await fileToBase64(imageFile);
      const { data } = await api.post<Post>('/api/posts', {
        caption: caption.trim(),
        ...(imageBase64 && { image: imageBase64 }),
      });
      onCreated(data);
      setCaption('');
      setImageFile(null);
      setImagePreview(null);
      onClose();
    } catch (err: unknown) {
      const ax = err as { response?: { data?: { message?: string } } };
      setError(ax.response?.data?.message || 'Failed to create post');
    } finally {
      setPosting(false);
    }
  };

  const handleClose = () => {
    onClose();
    setCaption('');
    setImageFile(null);
    setImagePreview(null);
    setError('');
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-900/40 backdrop-blur-sm safe-area-top">
      <div className="w-full max-w-md rounded-t-2xl sm:rounded-2xl bg-white shadow-xl max-h-[90vh] max-h-[90dvh] flex flex-col border border-slate-200 border-b-0 sm:border-b">
        <div className="p-3 sm:p-4 border-b border-slate-200 flex items-center justify-between safe-area-top">
          <h2 className="font-semibold text-slate-800 text-base sm:text-lg">New post</h2>
          <button
            type="button"
            onClick={handleClose}
            className="min-h-[44px] min-w-[44px] flex items-center justify-center p-2 rounded-xl hover:bg-slate-100 text-slate-500 hover:text-slate-700"
            aria-label="Close"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
          <div className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-4">
            {error && (
              <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-xl">
                {error}
              </p>
            )}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Caption</label>
              <textarea
                placeholder="What's on your mind?"
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
                rows={3}
                className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 resize-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Photo (optional)</label>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                className="hidden"
              />
              {imagePreview ? (
                <div className="relative rounded-xl overflow-hidden bg-slate-100">
                  <img src={imagePreview} alt="Preview" className="w-full max-h-64 object-contain" />
                  <button
                    type="button"
                    onClick={() => {
                      setImageFile(null);
                      setImagePreview(null);
                    }}
                    className="absolute top-2 right-2 p-1.5 rounded-full bg-slate-800/60 text-white hover:bg-slate-800"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full min-h-[120px] rounded-xl border-2 border-dashed border-slate-200 hover:border-blue-400 flex items-center justify-center gap-2 text-slate-500 hover:text-blue-600 hover:bg-blue-50/50 transition-colors"
                >
                  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6 6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  Add photo
                </button>
              )}
            </div>
          </div>

          <div className="p-3 sm:p-4 border-t border-slate-200 safe-area-inset-bottom">
            <button
              type="submit"
              disabled={posting || (!caption.trim() && !imageFile)}
              className="w-full min-h-[48px] rounded-xl bg-blue-600 text-white hover:bg-blue-700 font-medium disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
            >
              {posting ? 'Posting...' : 'Post'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
