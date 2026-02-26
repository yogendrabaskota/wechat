import type { Metadata, Viewport } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Personal Chat',
  description: 'One-to-one personal chat application',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="touch-manipulation">
      <body className="antialiased min-h-screen min-h-[100dvh] bg-slate-50 text-slate-800">
        {children}
      </body>
    </html>
  );
}
