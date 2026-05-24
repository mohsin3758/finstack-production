'use client';
import Link           from 'next/link';
import { usePathname } from 'next/navigation';
import { Menu, Bell }  from 'lucide-react';
import { cn, fmtDate, getInitials } from '@/lib/utils';
import { notificationsApi }  from '@/services/api';
import { useAuthStore }  from '@/store/authStore';
import { useAppStore }   from '@/store/appStore';
import { useState, useEffect } from 'react';

const PAGE_TITLES: Record<string, string> = {
  '/dashboard':  'Dashboard',
  '/invoices':   'Invoices',
  '/employees':  'Employees',
  '/payroll':    'Payroll',
  '/clients':    'Clients',
  '/accounts':   'Accounts & Ledger',
  '/leaves':     'Leave Management',
  '/compliance': 'Compliance',
  '/reports':    'Reports',
  '/settings':   'Settings',
};

export function Topbar() {
  const pathname  = usePathname();
  const { user, company } = useAuthStore();
  const { sidebarOpen, toggleSidebar, unreadCount } = useAppStore();
  const [showProfile, setShowProfile] = useState(false);
  const setNotifications = useAppStore(s => s.setNotifications);

  // Fetch notifications on mount and every 2 minutes
  useEffect(() => {
    const fetchNotifs = async () => {
      try {
        const res = await notificationsApi.list();
        setNotifications(res.data.data || []);
      } catch { /* fail silently */ }
    };
    fetchNotifs();
    const interval = setInterval(fetchNotifs, 2 * 60 * 1000);
    return () => clearInterval(interval);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const title = PAGE_TITLES[pathname] || PAGE_TITLES['/' + pathname.split('/')[1]] || 'FinStack ERP';

  return (
    <header className="sticky top-0 z-20 h-16 bg-white border-b border-gray-200 flex items-center px-4 gap-4 flex-shrink-0">
      {/* Mobile menu toggle */}
      <button
        onClick={toggleSidebar}
        className="p-2 rounded-lg hover:bg-gray-100 text-gray-500 lg:hidden"
      >
        <Menu className="w-5 h-5" />
      </button>

      {/* Page title */}
      <div className="flex-1 min-w-0">
        <h1 className="text-base font-semibold text-gray-900 truncate">{title}</h1>
        <p className="text-xs text-gray-400 hidden sm:block">
          {fmtDate(new Date().toISOString(), 'D MMMM YYYY')} · {company?.name}
        </p>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2">
        {/* Notification bell */}
        <button className="relative p-2 rounded-lg hover:bg-gray-100 text-gray-500 transition-colors">
          <Bell className="w-5 h-5" />
          {unreadCount > 0 && (
            <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full border border-white" />
          )}
        </button>

        {/* Subscription badge */}
        <span className={cn(
          'hidden sm:inline-flex px-2 py-0.5 rounded-full text-xs font-medium border',
          company?.subscription === 'trial'
            ? 'text-orange-700 bg-orange-50 border-orange-200'
            : 'text-green-700 bg-green-50 border-green-200'
        )}>
          {company?.subscription?.toUpperCase() || 'TRIAL'}
        </span>

        {/* Profile */}
        <div className="relative">
          <button
            onClick={() => setShowProfile(!showProfile)}
            className="flex items-center gap-2 p-1.5 pr-3 rounded-xl hover:bg-gray-100 transition-colors"
          >
            <div className="w-7 h-7 rounded-full bg-blue-100 flex items-center justify-center">
              <span className="text-xs font-bold text-blue-700">{getInitials(user?.name || 'U')}</span>
            </div>
            <span className="hidden md:block text-sm font-medium text-gray-700">{user?.name}</span>
          </button>

          {showProfile && (
            <div className="absolute right-0 top-full mt-2 w-56 bg-white rounded-xl border border-gray-200 shadow-lg py-2 animate-in slide-in">
              <div className="px-4 py-2 border-b border-gray-100">
                <p className="text-sm font-semibold text-gray-900">{user?.name}</p>
                <p className="text-xs text-gray-400">{user?.email}</p>
                <span className="text-xs text-blue-600 capitalize font-medium">{user?.role?.replace(/_/g,' ')}</span>
              </div>
              <Link href="/settings" onClick={() => setShowProfile(false)}
                className="flex items-center gap-2 px-4 py-2 text-sm text-gray-600 hover:bg-gray-50">
                Settings
              </Link>
              <button
                onClick={() => { setShowProfile(false); useAuthStore.getState().logout(); }}
                className="flex items-center gap-2 w-full px-4 py-2 text-sm text-red-600 hover:bg-red-50"
              >
                Sign Out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
