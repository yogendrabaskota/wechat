import Link from 'next/link';

export default function Home() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-6 sm:p-8">
      <h1 className="text-2xl sm:text-3xl font-bold mb-6 text-center">Personal Chat</h1>
      <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 w-full max-w-xs sm:max-w-none sm:w-auto">
        <Link
          href="/login"
          className="min-h-[48px] flex items-center justify-center px-6 py-3 rounded-xl bg-blue-600 text-white hover:bg-blue-700 active:opacity-90"
        >
          Login
        </Link>
        <Link
          href="/register"
          className="min-h-[48px] flex items-center justify-center px-6 py-3 rounded-xl border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800 active:opacity-90"
        >
          Register
        </Link>
      </div>
    </main>
  );
}
