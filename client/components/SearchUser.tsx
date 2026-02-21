'use client';

import { useState, useCallback } from 'react';
import api from '@/lib/axios';
import type { ConversationUser } from '@/store/chatStore';

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
    <div className="p-2 border-b border-gray-200 dark:border-gray-700">
      <div className="flex gap-2">
        <input
          type="text"
          placeholder="Search by name or email"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && search()}
          className="flex-1 px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
        <button
          type="button"
          onClick={search}
          disabled={loading}
          className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? '...' : 'Search'}
        </button>
      </div>
      {results.length > 0 && (
        <ul className="mt-2 space-y-1 max-h-48 overflow-y-auto">
          {results.map((user) => (
            <li key={user._id}>
              <button
                type="button"
                onClick={() => {
                  onSelectUser(user);
                  setQuery('');
                  setResults([]);
                }}
                className="w-full text-left px-3 py-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 flex justify-between items-center"
              >
                <span className="font-medium text-gray-900 dark:text-gray-100">
                  {user.name}
                </span>
                <span className="text-sm text-gray-500 dark:text-gray-400 truncate max-w-[120px]">
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
