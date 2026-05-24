'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';

export default function HomePage() {
  const router    = useRouter();
  const isLoggedIn = useAuthStore(s => s.isLoggedIn);

  useEffect(() => {
    router.replace(isLoggedIn ? '/dashboard' : '/login');
  }, [isLoggedIn, router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="flex flex-col items-center gap-4">
        <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
        <p className="text-sm text-gray-500">Loading FinStack ERP…</p>
      </div>
    </div>
  );
}
