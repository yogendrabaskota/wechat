'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import api from '@/lib/axios';
import { useAuthStore } from '@/store/authStore';
import { getSocket } from '@/lib/socket';
import Avatar from '@/components/Avatar';

const fileToBase64 = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
  });

export default function RegisterPage() {
  const router = useRouter();
  const setAuth = useAuthStore((s) => s.setAuth);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [profilePicFile, setProfilePicFile] = useState<File | null>(null);
  const [profilePicPreview, setProfilePicPreview] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !file.type.startsWith('image/')) return;
    setProfilePicFile(file);
    const url = URL.createObjectURL(file);
    setProfilePicPreview(url);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      let profilePicBase64: string | undefined;
      if (profilePicFile) {
        profilePicBase64 = await fileToBase64(profilePicFile);
      }
      const { data } = await api.post<{
        user: { _id: string; name: string; email: string; profilePic?: string | null };
        token: string;
      }>('/api/auth/register', {
        name,
        email,
        password,
        ...(profilePicBase64 && { profilePic: profilePicBase64 }),
      });
      setAuth(data.user, data.token);
      getSocket(data.token);
      router.push('/chat');
    } catch (err: unknown) {
      const ax = err as { response?: { data?: { message?: string } } };
      setError(ax.response?.data?.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen flex items-center justify-center p-4 safe-area-top safe-area-bottom">
      <div className="w-full max-w-md rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-6 sm:p-8 shadow-lg">
        <h1 className="text-2xl font-bold mb-6 text-center">Register</h1>
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <p className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 px-3 py-2 rounded-lg">
              {error}
            </p>
          )}
          <div>
            <label htmlFor="name" className="block text-sm font-medium mb-1">
              Name
            </label>
            <input
              id="name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="w-full min-h-[48px] px-3 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-base focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label htmlFor="email" className="block text-sm font-medium mb-1">
              Email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full min-h-[48px] px-3 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-base focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Profile picture (optional)</label>
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-14 h-14 rounded-full overflow-hidden bg-gray-100 dark:bg-gray-700">
                {profilePicPreview ? (
                  <img src={profilePicPreview} alt="Preview" className="w-full h-full object-cover" />
                ) : (
                  <Avatar name={name || '?'} size="lg" className="w-14 h-14" />
                )}
              </div>
              <div className="flex-1">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
                >
                  Choose image
                </button>
                {profilePicFile && (
                  <button
                    type="button"
                    onClick={() => {
                      setProfilePicFile(null);
                      setProfilePicPreview(null);
                    }}
                    className="block text-sm text-gray-500 hover:underline mt-0.5"
                  >
                    Remove
                  </button>
                )}
              </div>
            </div>
          </div>
          <div>
            <label htmlFor="password" className="block text-sm font-medium mb-1">
              Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              className="w-full min-h-[48px] px-3 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-base focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full min-h-[48px] py-3 rounded-lg bg-blue-600 text-white hover:bg-blue-700 active:opacity-90 disabled:opacity-50"
          >
            {loading ? 'Creating account...' : 'Register'}
          </button>
        </form>
        <p className="mt-4 text-center text-sm text-gray-500 dark:text-gray-400">
          Already have an account?{' '}
          <Link href="/login" className="text-blue-600 hover:underline">
            Login
          </Link>
        </p>
      </div>
    </main>
  );
}
