import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { settingsApi } from '@/services/api';
import toast from 'react-hot-toast';
import type { Company } from '@/types';

// ── Get company settings ───────────────────────────────────────────────────
export function useSettings() {
  return useQuery({
    queryKey: ['settings'],
    queryFn:  async () => {
      const r = await settingsApi.get();
      return r.data.data as Company;
    },
    staleTime: 5 * 60 * 1000,
  });
}

// ── Update company settings ────────────────────────────────────────────────
export function useUpdateSettings() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (data: Partial<Company>) => settingsApi.update(data),
    onSuccess: (res) => {
      const updated = res.data.data as Company;
      // Update cache directly so UI reflects new values immediately
      qc.setQueryData(['settings'], updated);
      qc.invalidateQueries({ queryKey: ['settings'] });
      toast.success('Settings saved');
    },
    onError: (e: unknown) => {
      const msg = (e as { response?: { data?: { message?: string } } })?.response?.data?.message;
      toast.error(msg || 'Failed to save settings');
    },
  });
}
