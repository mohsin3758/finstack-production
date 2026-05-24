'use client';
import { useEffect } from 'react';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { useRouter } from 'next/navigation';
import { Sidebar } from './Sidebar';
import { Topbar }  from './Topbar';
import { useAuthStore } from '@/store/authStore';
import { useAppStore }  from '@/store/appStore';
import { cn } from '@/lib/utils';

export function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router     = useRouter();
  const isLoggedIn  = useAuthStore(s => s.isLoggedIn);
  const fetchMe     = useAuthStore(s => s.fetchMe);
  const sidebarOpen = useAppStore(s => s.sidebarOpen);

  // Auth guard — run once on mount and when login state changes
  useEffect(() => {
    if (!isLoggedIn) {
      router.replace('/login');
    } else {
      fetchMe();   // Refresh user profile on each navigation
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoggedIn]);

  if (!isLoggedIn) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Sidebar — fixed, out of document flow */}
      <Sidebar />
      {/* Content — offset by sidebar width on lg screens */}
      <div className={cn(
        'flex flex-col min-h-screen transition-all duration-300',
        sidebarOpen ? 'lg:pl-64' : 'lg:pl-16',
      )}>
        <Topbar />
        <main className="flex-1 overflow-y-auto scrollbar-thin p-4 sm:p-6">
          <ErrorBoundary>
            {children}
          </ErrorBoundary>
        </main>
      </div>
    </div>
  );
}
