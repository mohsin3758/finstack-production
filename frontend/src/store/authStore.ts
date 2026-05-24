import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import api, { setToken, clearToken } from '@/lib/api';
import type { User, Company, LoginInput, RegisterInput } from '@/types';

interface AuthStore {
  user: User | null; company: Company | null; token: string | null;
  isLoading: boolean; isLoggedIn: boolean;
  login(d: LoginInput): Promise<void>;
  register(d: RegisterInput): Promise<void>;
  logout(): Promise<void>; fetchMe(): Promise<void>;
  updateUser(u: Partial<User>): void; clearAuth(): void;
}

export const useAuthStore = create<AuthStore>()(persist((set, get) => ({
  user: null, company: null, token: null, isLoading: false, isLoggedIn: false,
  async login(data) {
    set({ isLoading: true });
    try {
      const res = await api.post('/auth/login', data);
      const { access_token, user, company } = res.data.data;
      setToken(access_token, data.remember_me);
      set({ user, company, token: access_token, isLoggedIn: true });
    } finally { set({ isLoading: false }); }
  },
  async register(data) {
    set({ isLoading: true });
    try { await api.post('/auth/register', data); } finally { set({ isLoading: false }); }
  },
  async logout() {
    try { await api.post('/auth/logout'); } catch { /* ignore */ }
    clearToken(); set({ user: null, company: null, token: null, isLoggedIn: false });
    if (typeof window !== 'undefined') window.location.href = '/login';
  },
  async fetchMe() {
    try { const res = await api.get('/auth/me'); set({ user: res.data.data, isLoggedIn: true }); }
    catch { get().clearAuth(); }
  },
  updateUser(u) { set(s => ({ user: s.user ? { ...s.user, ...u } : null })); },
  clearAuth() { clearToken(); set({ user: null, company: null, token: null, isLoggedIn: false }); },
}), {
  name: 'finstack-auth',
  partialize: s => ({ token: s.token, user: s.user, company: s.company, isLoggedIn: s.isLoggedIn }),
  onRehydrateStorage: () => state => {
    if (state?.token) {
      setToken(state.token);
      // Restore isLoggedIn so the auth guard doesn't flash-redirect to /login
      if (state) state.isLoggedIn = true;
    }
  },
}));
