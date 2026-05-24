import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { leavesApi } from '@/services/api';
import toast from 'react-hot-toast';
import type { LeaveRequest } from '@/types';

interface UseLeaveParams {
  [key: string]: unknown;
  status?:      string;
  employee_id?: string;
  from?:        string;
  to?:          string;
}

// ── List ───────────────────────────────────────────────────────────────────
export function useLeaves(params: UseLeaveParams = {}) {
  return useQuery({
    queryKey: ['leaves', params],
    queryFn:  async () => {
      const r = await leavesApi.list(params);
      return r.data.data as LeaveRequest[];
    },
    staleTime: 30 * 1000,
  });
}

// ── Create ─────────────────────────────────────────────────────────────────
export function useCreateLeave() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<LeaveRequest>) => leavesApi.create(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['leaves'] });
      qc.invalidateQueries({ queryKey: ['dashboard'] });
      toast.success('Leave request submitted');
    },
    onError: (e: unknown) => {
      const msg = (e as { response?: { data?: { message?: string } } })?.response?.data?.message;
      toast.error(msg || 'Failed to submit leave request');
    },
  });
}

// ── Approve ────────────────────────────────────────────────────────────────
export function useApproveLeave() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => leavesApi.approve(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['leaves'] });
      qc.invalidateQueries({ queryKey: ['dashboard'] });
      toast.success('Leave approved');
    },
    onError: () => toast.error('Failed to approve leave'),
  });
}

// ── Reject ─────────────────────────────────────────────────────────────────
export function useRejectLeave() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) =>
      leavesApi.reject(id, reason),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['leaves'] });
      toast.success('Leave rejected');
    },
    onError: () => toast.error('Failed to reject leave'),
  });
}
