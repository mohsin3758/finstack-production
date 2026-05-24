import { create } from 'zustand';
import type { Notification } from '@/types';

interface AppStore {
  sidebarOpen:     boolean;
  notifications:   Notification[];
  unreadCount:     number;
  toggleSidebar:   () => void;
  setSidebar:      (open: boolean) => void;
  setNotifications:(n: Notification[]) => void;
  markRead:        (id: string) => void;
}

export const useAppStore = create<AppStore>((set) => ({
  sidebarOpen:   true,
  notifications: [],
  unreadCount:   0,

  toggleSidebar: () => set(s => ({ sidebarOpen: !s.sidebarOpen })),
  setSidebar:    (open) => set({ sidebarOpen: open }),

  setNotifications: (n) =>
    set({ notifications: n, unreadCount: n.filter(x => !x.read).length }),

  markRead: (id) =>
    set(s => {
      const updated = s.notifications.map(n => n.id === id ? { ...n, read: true } : n);
      return { notifications: updated, unreadCount: updated.filter(x => !x.read).length };
    }),
}));
