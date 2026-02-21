'use client';

import { useState } from 'react';
import api from '@/lib/axios';
import { useChatStore, type Group } from '@/store/chatStore';
import { useAuthStore } from '@/store/authStore';

interface GroupInfoModalProps {
  group: Group;
  open: boolean;
  onClose: () => void;
  onLeave: () => void;
}

export default function GroupInfoModal({ group, open, onClose, onLeave }: GroupInfoModalProps) {
  const { user } = useAuthStore();
  const { setActiveGroup, setGroups } = useChatStore();
  const [leaving, setLeaving] = useState(false);
  const [promotingId, setPromotingId] = useState<string | null>(null);
  const [error, setError] = useState('');

  const adminIds = (group.admins && group.admins.length)
    ? group.admins.map((a) => (typeof a === 'object' && a && '_id' in a ? a._id : a))
    : group.createdBy
      ? [typeof group.createdBy === 'object' && group.createdBy && '_id' in group.createdBy ? group.createdBy._id : group.createdBy]
      : [];
  const isCurrentUserAdmin = user && adminIds.includes(user._id);
  const canLeave = !(isCurrentUserAdmin && adminIds.length === 1);

  const handleLeave = async () => {
    if (!canLeave) {
      setError('Promote another member to admin before leaving.');
      return;
    }
    setError('');
    setLeaving(true);
    try {
      await api.post(`/api/groups/${group._id}/leave`);
      setActiveGroup(null);
      const { data } = await api.get<Group[]>('/api/groups');
      setGroups(Array.isArray(data) ? data : []);
      onLeave();
      onClose();
    } catch (err: unknown) {
      const ax = err as { response?: { data?: { message?: string } } };
      setError(ax.response?.data?.message || 'Failed to leave group');
    } finally {
      setLeaving(false);
    }
  };

  const handlePromote = async (memberId: string) => {
    if (!isCurrentUserAdmin) return;
    setError('');
    setPromotingId(memberId);
    try {
      const { data } = await api.post<Group>(`/api/groups/${group._id}/promote/${memberId}`);
      setActiveGroup(data);
      setGroups(useChatStore.getState().groups.map((g) => (g._id === data._id ? data : g)));
      onClose();
    } catch (err: unknown) {
      const ax = err as { response?: { data?: { message?: string } } };
      setError(ax.response?.data?.message || 'Failed to promote');
    } finally {
      setPromotingId(null);
    }
  };

  const isAdmin = (memberId: string) => adminIds.includes(memberId);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="w-full max-w-md rounded-xl bg-white dark:bg-gray-800 shadow-xl max-h-[85vh] flex flex-col">
        <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
          <h2 className="font-semibold text-gray-900 dark:text-gray-100">Group info</h2>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <p className="font-medium text-gray-900 dark:text-gray-100">{group.name}</p>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {group.members?.length || 0} members · Created by {typeof group.createdBy === 'object' && group.createdBy ? group.createdBy.name : '—'}
          </p>
        </div>
        {error && (
          <div className="mx-4 mt-2 text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 px-3 py-2 rounded-lg">
            {error}
          </div>
        )}
        <div className="flex-1 overflow-y-auto p-4">
          <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase mb-2">Members</p>
          <ul className="space-y-2">
            {(group.members || []).map((member) => {
              const id = typeof member === 'object' && member && '_id' in member ? member._id : member;
              const name = typeof member === 'object' && member && 'name' in member ? member.name : '—';
              const email = typeof member === 'object' && member && 'email' in member ? member.email : '';
              const admin = isAdmin(id);
              const isSelf = user?._id === id;
              return (
                <li
                  key={id}
                  className="flex items-center justify-between gap-2 py-2 px-3 rounded-lg bg-gray-50 dark:bg-gray-700/50"
                >
                  <div className="min-w-0">
                    <span className="font-medium text-gray-900 dark:text-gray-100 block truncate">
                      {name}
                      {admin && (
                        <span className="ml-1.5 text-xs font-normal text-amber-600 dark:text-amber-400">Admin</span>
                      )}
                      {isSelf && (
                        <span className="ml-1.5 text-xs font-normal text-gray-500 dark:text-gray-400">(you)</span>
                      )}
                    </span>
                    {email && (
                      <span className="text-xs text-gray-500 dark:text-gray-400 truncate block">{email}</span>
                    )}
                  </div>
                  {isCurrentUserAdmin && !admin && !isSelf && (
                    <button
                      type="button"
                      onClick={() => handlePromote(id)}
                      disabled={!!promotingId}
                      className="shrink-0 text-xs px-2 py-1.5 rounded-lg bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-200 hover:bg-amber-200 dark:hover:bg-amber-900/50 disabled:opacity-50"
                    >
                      {promotingId === id ? '…' : 'Promote to admin'}
                    </button>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
        <div className="p-4 border-t border-gray-200 dark:border-gray-700">
          <button
            type="button"
            onClick={handleLeave}
            disabled={leaving || !canLeave}
            className="w-full min-h-[44px] rounded-lg border border-red-300 dark:border-red-700 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {leaving ? 'Leaving…' : canLeave ? 'Leave group' : 'Promote another admin to leave'}
          </button>
        </div>
      </div>
    </div>
  );
}
