'use client';
import './globals.css';
import Sidebar from '@/components/Sidebar';
import { useAppStore } from '@/lib/store';
import { usePathname } from 'next/navigation';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const { isDemoMode, isAuthenticated } = useAppStore();
  const pathname = usePathname();
  const isLoginPage = pathname === '/login';

  return (
    <html lang="en" className="dark">
      <body suppressHydrationWarning className="bg-[#0B132B] text-slate-50 font-sans antialiased flex h-screen overflow-hidden">
        {isAuthenticated && !isLoginPage && <Sidebar />}
        <main className="flex-1 flex flex-col overflow-y-auto">
          {isDemoMode && (
            <div className="bg-yellow-400 text-slate-900 text-xs font-bold py-1.5 px-4 text-center tracking-wide z-50">
              ⚠️ KASTONOM MVP DEMO MODE: Backend API and AI Providers are Mocked for Hackathon Pitch.
            </div>
          )}
          <div className="p-8">
            {children}
          </div>
        </main>
      </body>
    </html>
  );
}