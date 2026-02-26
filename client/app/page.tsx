'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { useAuthStore } from '@/store/authStore';
import Feed from '@/components/Feed';

export default function Home() {
  const { user, token } = useAuthStore();

  if (user && token) {
    return <Feed />;
  }

  return (
    <main className="min-h-screen min-h-[100dvh] flex flex-col items-center justify-center p-4 sm:p-8 bg-slate-50 safe-area-top safe-area-bottom">
      <h1 className="text-2xl sm:text-3xl font-bold mb-6 text-center text-slate-800 px-2">Personal Chat</h1>
      <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 w-full max-w-[280px] sm:max-w-none sm:w-auto">
        <Link
          href="/login"
          className="min-h-[48px] flex items-center justify-center px-6 py-3 rounded-xl bg-blue-600 text-white hover:bg-blue-700 active:opacity-90 font-medium shadow-sm"
        >
          Login
        </Link>
        <Link
          href="/register"
          className="min-h-[48px] flex items-center justify-center px-6 py-3 rounded-xl border border-slate-200 bg-white text-slate-800 hover:bg-slate-50 active:opacity-90 font-medium"
        >
          Register
        </Link>
      </div>
    </main>
  );
}
