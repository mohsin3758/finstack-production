'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard, Users, FileText, CreditCard, BookOpen,
  Calendar, UserCheck, Settings, BarChart3, Shield,
  ChevronLeft, ChevronRight, Building2, LogOut, Wallet
} from 'lucide-react';
import { cn, getInitials } from '@/lib/utils';
import { useAuthStore }  from '@/store/authStore';
import { useAppStore }   from '@/store/appStore';

const NAV_ITEMS = [
  { href: '/dashboard',   icon: LayoutDashboard, label: 'Dashboard',     group: 'main' },
  { href: '/invoices',    icon: FileText,         label: 'Invoices',      group: 'main' },
  { href: '/employees',   icon: Users,            label: 'Employees',     group: 'hr' },
  { href: '/payroll',     icon: CreditCard,       label: 'Payroll',       group: 'hr' },
  { href: '/leaves',      icon: Calendar,         label: 'Leaves',        group: 'hr' },
  { href: '/clients',     icon: Building2,        label: 'Clients',       group: 'main' },
  { href: '/accounts',    icon: Wallet,           label: 'Accounts',      group: 'finance' },
  { href: '/compliance',  icon: Shield,           label: 'Compliance',    group: 'finance' },
  { href: '/reports',     icon: BarChart3,        label: 'Reports',       group: 'finance' },
  { href: '/settings',    icon: Settings,         label: 'Settings',      group: 'admin' },
];

const GROUP_LABELS: Record<string, string> = {
  main:    'MAIN',
  hr:      'HR & PAYROLL',
  finance: 'FINANCE',
  admin:   'ADMIN',
};

export function Sidebar() {
  const pathname   = usePathname();
  const { user, company, logout } = useAuthStore();
  const { sidebarOpen, toggleSidebar } = useAppStore();

  const groups = ['main','hr','finance','admin'];

  return (
    <>
      {/* Overlay for mobile */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-20 bg-black/40 lg:hidden"
          onClick={toggleSidebar}
        />
      )}

      <aside className={cn(
        'fixed left-0 top-0 z-30 h-screen bg-white border-r border-gray-200',
        'flex flex-col transition-all duration-300 ease-in-out',
        sidebarOpen ? 'w-64' : 'w-16',
        // On desktop: always visible. On mobile: slide in/out via translate
        'lg:translate-x-0',
        !sidebarOpen && '-translate-x-full lg:translate-x-0'
      )}>
        {/* Logo */}
        <div className={cn(
          'flex items-center h-16 border-b border-gray-100 px-4 flex-shrink-0',
          sidebarOpen ? 'justify-between' : 'justify-center'
        )}>
          {sidebarOpen && (
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center flex-shrink-0">
                <span className="text-white font-bold text-sm">F</span>
              </div>
              <div className="min-w-0">
                <p className="text-sm font-bold text-gray-900 truncate">FinStack</p>
                <p className="text-xs text-gray-400 truncate">{company?.name || 'ERP'}</p>
              </div>
            </div>
          )}
          {!sidebarOpen && (
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">F</span>
            </div>
          )}
          <button
            onClick={toggleSidebar}
            className="hidden lg:flex p-1 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 flex-shrink-0"
            title={sidebarOpen ? 'Collapse sidebar' : 'Expand sidebar'}
          >
            {sidebarOpen
              ? <ChevronLeft className="w-4 h-4" />
              : <ChevronRight className="w-4 h-4" />}
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto scrollbar-thin py-4 px-3 space-y-1">
          {groups.map(group => {
            const items = NAV_ITEMS.filter(i => i.group === group);
            return (
              <div key={group}>
                {sidebarOpen && (
                  <p className="text-[10px] font-semibold text-gray-400 tracking-widest px-3 pt-4 pb-1">
                    {GROUP_LABELS[group]}
                  </p>
                )}
                {items.map(item => {
                  const active = pathname === item.href || pathname.startsWith(item.href + '/');
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      title={!sidebarOpen ? item.label : undefined}
                      className={cn('nav-link', active && 'active', !sidebarOpen && 'justify-center px-2')}
                    >
                      <item.icon className={cn('flex-shrink-0', active ? 'w-4 h-4 text-blue-600' : 'w-4 h-4')} />
                      {sidebarOpen && <span className="truncate">{item.label}</span>}
                    </Link>
                  );
                })}
              </div>
            );
          })}
        </nav>

        {/* User footer */}
        <div className={cn(
          'border-t border-gray-100 p-3 flex-shrink-0',
          sidebarOpen ? 'flex items-center gap-3' : 'flex justify-center'
        )}>
          <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
            <span className="text-xs font-bold text-blue-700">{getInitials(user?.name || 'U')}</span>
          </div>
          {sidebarOpen && (
            <>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-gray-800 truncate">{user?.name}</p>
                <p className="text-xs text-gray-400 capitalize truncate">{user?.role?.replace(/_/g,' ')}</p>
              </div>
              <button
                onClick={logout}
                title="Logout"
                className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </>
          )}
        </div>
      </aside>
    </>
  );
}
