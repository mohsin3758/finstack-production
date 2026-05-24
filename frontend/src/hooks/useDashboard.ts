import { useQuery } from '@tanstack/react-query';
import { dashboardApi } from '@/services/api';
import type { DashboardData } from '@/types';

export function useDashboard() {
  return useQuery<DashboardData>({
    queryKey: ['dashboard'],
    queryFn:  async () => {
      const res = await dashboardApi.summary();
      return res.data.data;
    },
    staleTime:    60 * 1000,   // 1 minute
    refetchInterval: 5 * 60 * 1000,  // auto-refresh every 5 min
  });
}
