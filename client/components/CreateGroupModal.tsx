'use client';

import { useState, useCallback, useRef } from 'react';
import api from '@/lib/axios';
import type { ConversationUser } from '@/store/chatStore';
import { useChatStore } from '@/store/chatStore';
import Avatar from './Avatar';

const fileToBase64 = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
  });

interface CreateGroupModalProps {
  open: boolean;
  onClose: () => void;
}

export default function CreateGroupModal({ open, onClose }: CreateGroupModalProps) {
  const [step, setStep] = useState(1);
  const [selected, setSelected] = useState<ConversationUser[]>([]);
  const [query, setQuery] = useState('');
  const [searchResults, setSearchResults] = useState<ConversationUser[]>([]);
  const [searching, setSearching] = useState(false);
  const [groupName, setGroupName] = useState('');
  const [groupPicFile, setGroupPicFile] = useState<File | null>(null);
  const [groupPicPreview, setGroupPicPreview] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');
  const groupPicInputRef = useRef<HTMLInputElement>(null);
  const { prependGroup, setActiveGroup, setGroupMessages, setMobileListVisible } = useChatStore();

  const search = useCallback(async () => {
    const q = query.trim();
    if (!q) {
      setSearchResults([]);
      return;
    }
    setSearching(true);
    try {
      const { data } = await api.get<ConversationUser[]>('/api/users/search', { params: { query: q } });
      setSearchResults(data || []);
    } catch {
      setSearchResults([]);
    } finally {
      setSearching(false);
    }
  }, [query]);

  const addUser = (user: ConversationUser) => {
    if (selected.some((u) => u._id === user._id)) return;
    setSelected((prev) => [...prev, user]);
  };

  const removeUser = (id: string) => {
    setSelected((prev) => prev.filter((u) => u._id !== id));
  };

  const handleDone = () => {
    if (selected.length === 0) {
      setError('Select at least one person');
      return;
    }
    setError('');
    setStep(2);
  };

  const handleGroupPicChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !file.type.startsWith('image/')) return;
    setGroupPicFile(file);
    setGroupPicPreview(URL.createObjectURL(file));
  };

  const handleCreate = async () => {
    const name = groupName.trim();
    if (!name) {
      setError('Enter a group name');
      return;
    }
    setError('');
    setCreating(true);
    try {
      let profilePicBase64: string | undefined;
      if (groupPicFile) profilePicBase64 = await fileToBase64(groupPicFile);
      const { data } = await api.post<Parameters<typeof prependGroup>[0]>('/api/groups', {
        name,
        memberIds: selected.map((u) => u._id),
        ...(profilePicBase64 && { profilePic: profilePicBase64 }),
      });
      prependGroup(data);
      setActiveGroup(data);
      setGroupMessages([]);
      setMobileListVisible(false);
      onClose();
      setStep(1);
      setSelected([]);
      setGroupName('');
      setGroupPicFile(null);
      setGroupPicPreview(null);
      const { data: messages } = await api.get<Parameters<typeof setGroupMessages>[0]>(
        `/api/groups/${data._id}/messages`
      );
      setGroupMessages(messages || []);
    } catch (err: unknown) {
      const ax = err as { response?: { data?: { message?: string } } };
      setError(ax.response?.data?.message || 'Failed to create group');
    } finally {
      setCreating(false);
    }
  };

  const handleBack = () => {
    setStep(1);
    setError('');
    setGroupPicFile(null);
    setGroupPicPreview(null);
  };

  const handleClose = () => {
    onClose();
    setGroupPicFile(null);
    setGroupPicPreview(null);
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl bg-white shadow-xl max-h-[90vh] flex flex-col border border-slate-200">
        <div className="p-4 border-b border-slate-200 flex items-center justify-between">
          <h2 className="font-semibold text-slate-800">
            {step === 1 ? 'Create group' : 'Group name'}
          </h2>
          <button
            type="button"
            onClick={handleClose}
            className="p-2 rounded-xl hover:bg-slate-100 text-slate-500 hover:text-slate-700"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {error && (
            <p className="mb-3 text-sm text-red-600 bg-red-50 px-3 py-2 rounded-xl">
              {error}
            </p>
          )}

          {step === 1 && (
            <>
              <div className="flex gap-2 mb-4">
                <input
                  type="text"
                  placeholder="Search by name or email"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && search()}
                  className="flex-1 min-h-[44px] px-3 py-2 rounded-xl border border-slate-200 bg-slate-50/50 text-slate-800 text-base focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
                <button
                  type="button"
                  onClick={search}
                  disabled={searching}
                  className="px-4 min-h-[44px] rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
                >
                  Search
                </button>
              </div>
              {searchResults.length > 0 && (
                <ul className="mb-4 space-y-1 max-h-40 overflow-y-auto">
                  {searchResults.map((user) => (
                    <li key={user._id}>
                      <button
                        type="button"
                        onClick={() => addUser(user)}
                        disabled={selected.some((u) => u._id === user._id)}
                        className="w-full text-left px-3 py-2.5 rounded-xl hover:bg-slate-50 flex justify-between items-center disabled:opacity-50"
                      >
                        <span className="font-medium">{user.name}</span>
                        {selected.some((u) => u._id === user._id) ? (
                          <span className="text-xs text-blue-600">Added</span>
                        ) : null}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
              <p className="text-sm text-slate-500 mb-2">Selected ({selected.length})</p>
              {selected.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-4">
                  {selected.map((u) => (
                    <span
                      key={u._id}
                      className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-blue-50 text-blue-700 text-sm font-medium"
                    >
                      {u.name}
                      <button
                        type="button"
                        onClick={() => removeUser(u._id)}
                        className="hover:opacity-80"
                        aria-label="Remove"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </>
          )}

          {step === 2 && (
            <>
              <button
                type="button"
                onClick={handleBack}
                className="mb-3 text-sm text-blue-600 hover:underline"
              >
                ← Back
              </button>
              <div className="mb-4">
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Group picture (optional)
                </label>
                <div className="flex items-center gap-3">
                  <div className="flex items-center justify-center w-14 h-14 rounded-full overflow-hidden bg-slate-100 shrink-0">
                    {groupPicPreview ? (
                      <img src={groupPicPreview} alt="Group" className="w-full h-full object-cover" />
                    ) : (
                      <Avatar name={groupName || 'G'} size="lg" className="w-14 h-14" />
                    )}
                  </div>
                  <div>
                    <input
                      ref={groupPicInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleGroupPicChange}
                      className="hidden"
                    />
                    <button
                      type="button"
                      onClick={() => groupPicInputRef.current?.click()}
                      className="text-sm text-blue-600 hover:underline font-medium"
                    >
                      Choose image
                    </button>
                    {groupPicFile && (
                      <button
                        type="button"
                        onClick={() => {
                          setGroupPicFile(null);
                          setGroupPicPreview(null);
                        }}
                        className="block text-sm text-slate-500 hover:underline mt-0.5"
                      >
                        Remove
                      </button>
                    )}
                  </div>
                </div>
              </div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Group name
              </label>
              <input
                type="text"
                placeholder="Enter group name"
                value={groupName}
                onChange={(e) => setGroupName(e.target.value)}
                className="w-full min-h-[48px] px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-800 text-base mb-2 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              />
            </>
          )}
        </div>

        <div className="p-4 border-t border-slate-200">
          {step === 1 ? (
            <button
              type="button"
              onClick={handleDone}
              className="w-full min-h-[48px] rounded-xl bg-blue-600 text-white hover:bg-blue-700 font-medium"
            >
              Done
            </button>
          ) : (
            <button
              type="button"
              onClick={handleCreate}
              disabled={creating}
              className="w-full min-h-[48px] rounded-lg bg-blue-600 text-white hover:bg-blue-700 font-medium disabled:opacity-50"
            >
              {creating ? 'Creating...' : 'Create group'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
