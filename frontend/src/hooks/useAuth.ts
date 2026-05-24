import { useAuthStore } from '@/store/authStore';
import { useRouter }    from 'next/navigation';
import type { LoginInput, RegisterInput } from '@/types';
import toast from 'react-hot-toast';

export function useAuth() {
  const router = useRouter();
  const { user, company, isLoading, isLoggedIn, login, register, logout, fetchMe } = useAuthStore();

  async function handleLogin(data: LoginInput) {
    try {
      await login(data);
      toast.success('Welcome back!');
      router.push('/dashboard');
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Login failed';
      toast.error(msg);
      throw err;
    }
  }

  async function handleRegister(data: RegisterInput) {
    try {
      await register(data);
      toast.success('Account created! Please login.');
      router.push('/login');
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Registration failed';
      toast.error(msg);
      throw err;
    }
  }

  async function handleLogout() {
    await logout();
    toast.success('Logged out');
  }

  return { user, company, isLoading, isLoggedIn, handleLogin, handleRegister, handleLogout, fetchMe };
}
