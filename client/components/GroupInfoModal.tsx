'use client';

import { useState } from 'react';
import api from '@/lib/axios';
import { useChatStore, type Group } from '@/store/chatStore';
import { useAuthStore } from '@/store/authStore';
import Avatar from './Avatar';

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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl bg-white shadow-xl max-h-[85vh] flex flex-col border border-slate-200">
        <div className="p-4 border-b border-slate-200 flex items-center justify-between">
          <h2 className="font-semibold text-slate-800">Group info</h2>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl hover:bg-slate-100 text-slate-500 hover:text-slate-700"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="p-4 border-b border-slate-200 flex items-center gap-3">
          <Avatar
            src={group.profilePic}
            name={group.name}
            size="lg"
            className="w-14 h-14 rounded-full bg-indigo-500 text-white [&>img]:rounded-full shrink-0"
          />
          <div className="min-w-0">
            <p className="font-medium text-slate-800">{group.name}</p>
            <p className="text-sm text-slate-500">
              {group.members?.length || 0} members · Created by {typeof group.createdBy === 'object' && group.createdBy ? group.createdBy.name : '—'}
            </p>
          </div>
        </div>
        {error && (
          <div className="mx-4 mt-2 text-sm text-red-600 bg-red-50 px-3 py-2 rounded-xl">
            {error}
          </div>
        )}
        <div className="flex-1 overflow-y-auto p-4">
          <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-2">Members</p>
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
                  className="flex items-center justify-between gap-2 py-2 px-3 rounded-xl bg-slate-50"
                >
                  <Avatar
                    src={typeof member === 'object' && member && 'profilePic' in member ? (member as { profilePic?: string | null }).profilePic : null}
                    name={name}
                    size="sm"
                    className="shrink-0"
                  />
                  <div className="min-w-0 flex-1">
                    <span className="font-medium text-slate-800 block truncate">
                      {name}
                      {admin && (
                        <span className="ml-1.5 text-xs font-normal text-amber-600">Admin</span>
                      )}
                      {isSelf && (
                        <span className="ml-1.5 text-xs font-normal text-slate-500">(you)</span>
                      )}
                    </span>
                    {email && (
                      <span className="text-xs text-slate-500 truncate block">{email}</span>
                    )}
                  </div>
                  {isCurrentUserAdmin && !admin && !isSelf && (
                    <button
                      type="button"
                      onClick={() => handlePromote(id)}
                      disabled={!!promotingId}
                      className="shrink-0 text-xs px-2 py-1.5 rounded-xl bg-amber-100 text-amber-800 hover:bg-amber-200 disabled:opacity-50 font-medium"
                    >
                      {promotingId === id ? '…' : 'Promote to admin'}
                    </button>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
        <div className="p-4 border-t border-slate-200">
          <button
            type="button"
            onClick={handleLeave}
            disabled={leaving || !canLeave}
            className="w-full min-h-[44px] rounded-xl border border-red-200 text-red-600 hover:bg-red-50 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
          >
            {leaving ? 'Leaving…' : canLeave ? 'Leave group' : 'Promote another admin to leave'}
          </button>
        </div>
      </div>
    </div>
  );
}
