'use client';

import { useState, useCallback } from 'react';
import api from '@/lib/axios';
import type { ConversationUser } from '@/store/chatStore';
import Avatar from './Avatar';

interface SearchUserProps {
  onSelectUser: (user: ConversationUser) => void;
}

export default function SearchUser({ onSelectUser }: SearchUserProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<ConversationUser[]>([]);
  const [loading, setLoading] = useState(false);

  const search = useCallback(async () => {
    const q = query.trim();
    if (!q) {
      setResults([]);
      return;
    }
    setLoading(true);
    try {
      const { data } = await api.get<ConversationUser[]>('/api/users/search', {
        params: { query: q },
      });
      setResults(data);
    } catch {
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, [query]);

  return (
    <div className="p-2 md:p-2 border-b border-slate-200">
      <div className="flex gap-2">
        <input
          type="text"
          placeholder="Search by name or email"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && search()}
          className="flex-1 min-h-[44px] px-3 py-2.5 md:py-2 rounded-xl border border-slate-200 bg-slate-50/50 text-slate-800 text-base placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
        />
        <button
          type="button"
          onClick={search}
          disabled={loading}
          className="min-h-[44px] min-w-[44px] px-4 py-2.5 md:py-2 rounded-xl bg-blue-600 text-white hover:bg-blue-700 active:opacity-90 disabled:opacity-50"
        >
          {loading ? '...' : 'Search'}
        </button>
      </div>
      {results.length > 0 && (
        <ul className="mt-2 space-y-0.5 max-h-48 overflow-y-auto">
          {results.map((user) => (
            <li key={user._id}>
              <button
                type="button"
                onClick={() => {
                  onSelectUser(user);
                  setQuery('');
                  setResults([]);
                }}
                className="w-full text-left px-3 py-3 min-h-[48px] rounded-xl hover:bg-slate-50 active:opacity-90 flex items-center gap-3"
              >
                <Avatar src={user.profilePic} name={user.name} size="sm" className="shrink-0" />
                <span className="flex-1 min-w-0 font-medium text-slate-800 truncate">
                  {user.name}
                </span>
                <span className="text-sm text-slate-500 truncate max-w-[40%] shrink-0">
                  {user.email}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
