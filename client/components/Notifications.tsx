'use client';

import { useState, useEffect, useRef } from 'react';
import api from '@/lib/axios';
import { useChatStore, type NotificationItem } from '@/store/chatStore';
import Avatar from './Avatar';

export default function Notifications() {
  const [open, setOpen] = useState(false);
  const { notifications, setNotifications, addNotification, removeNotification, prependGroup } = useChatStore();
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchNotifications = async () => {
      try {
        const { data } = await api.get<NotificationItem[]>('/api/notifications');
        setNotifications(data || []);
      } catch {
        setNotifications([]);
      }
    };
    fetchNotifications();
  }, [setNotifications]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleAccept = async (n: NotificationItem) => {
    try {
      const { data } = await api.post<{ group: { _id: string; name: string; members: unknown[]; createdBy: unknown } }>(
        `/api/notifications/${n._id}/accept`
      );
      removeNotification(n._id);
      if (data.group) prependGroup(data.group as Parameters<typeof prependGroup>[0]);
      setOpen(false);
    } catch {
      removeNotification(n._id);
    }
  };

  const handleDecline = async (n: NotificationItem) => {
    try {
      await api.post(`/api/notifications/${n._id}/decline`);
      removeNotification(n._id);
    } catch {
      removeNotification(n._id);
    }
  };

  const unreadCount = notifications.length;

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="relative p-2 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 min-h-[44px] min-w-[44px] flex items-center justify-center text-gray-600 dark:text-gray-400"
        aria-label="Notifications"
      >
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
        </svg>
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 h-4 min-w-[16px] px-1 flex items-center justify-center rounded-full bg-red-500 text-white text-xs">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-1 w-80 max-h-[70vh] overflow-y-auto rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-lg z-50">
          <div className="p-2 border-b border-gray-200 dark:border-gray-700 font-medium text-gray-900 dark:text-gray-100">
            Notifications
          </div>
          {notifications.length === 0 ? (
            <div className="p-4 text-sm text-gray-500 dark:text-gray-400">No new notifications</div>
          ) : (
            <ul className="p-2 space-y-2">
              {notifications.map((n) => (
                <li
                  key={n._id}
                  className={`p-3 rounded-lg border border-gray-100 dark:border-gray-600 flex gap-2 ${
                    n.type === 'group_invite_accepted'
                      ? 'bg-green-50 dark:bg-green-900/20'
                      : n.type === 'group_invite_rejected'
                        ? 'bg-amber-50 dark:bg-amber-900/20'
                        : n.type === 'group_member_left'
                          ? 'bg-gray-100 dark:bg-gray-700/50'
                          : 'bg-gray-50 dark:bg-gray-700/50'
                  }`}
                >
                  {n.fromUserId && (
                    <Avatar
                      src={n.fromUserId.profilePic}
                      name={n.fromUserId.name}
                      size="sm"
                      className="shrink-0"
                    />
                  )}
                  <div className="min-w-0 flex-1">
                  <p className="text-sm text-gray-700 dark:text-gray-300">
                    {n.message ||
                      (n.type === 'group_invite' && `${n.fromUserId?.name} invited you to a group`)}
                  </p>
                  {n.groupId && (n.type === 'group_invite' || n.type === 'group_member_left') && (
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                      Group: {n.groupId.name}
                    </p>
                  )}
                  {n.type === 'group_invite' && (
                    <div className="flex gap-2 mt-2">
                      <button
                        type="button"
                        onClick={() => handleAccept(n)}
                        className="flex-1 py-1.5 rounded-lg bg-blue-600 text-white text-sm hover:bg-blue-700"
                      >
                        Accept
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDecline(n)}
                        className="flex-1 py-1.5 rounded-lg border border-gray-300 dark:border-gray-600 text-sm hover:bg-gray-100 dark:hover:bg-gray-700"
                      >
                        Decline
                      </button>
                    </div>
                  )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
