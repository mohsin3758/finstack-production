import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { transactionsApi } from '@/services/api';
import toast from 'react-hot-toast';
import type { Transaction } from '@/types';

interface UseTransactionsParams {
  [key: string]: unknown;
  type?:   string;
  from?:   string;
  to?:     string;
  month?:  number;
  year?:   number;
  search?: string;
  page?:   number;
  limit?:  number;
}

// ── List ───────────────────────────────────────────────────────────────────
export function useTransactions(params: UseTransactionsParams = {}) {
  return useQuery({
    queryKey: ['transactions', params],
    queryFn:  async () => {
      const r = await transactionsApi.list(params);
      return r.data;
    },
    staleTime: 30 * 1000,
  });
}

// ── P&L Summary ────────────────────────────────────────────────────────────
export function useProfitLoss(params: { from?: string; to?: string; month?: number; year?: number }) {
  return useQuery({
    queryKey: ['profit-loss', params],
    queryFn:  async () => {
      const r = await transactionsApi.profitLoss(params);
      return r.data.data as { income: number; expense: number; net: number; period: { from?: string; to?: string } };
    },
    staleTime: 60 * 1000,
  });
}

// ── Create ─────────────────────────────────────────────────────────────────
export function useCreateTransaction() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<Transaction>) => transactionsApi.create(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['transactions'] });
      qc.invalidateQueries({ queryKey: ['profit-loss'] });
      qc.invalidateQueries({ queryKey: ['dashboard'] });
      toast.success('Transaction recorded');
    },
    onError: (e: unknown) => {
      const msg = (e as { response?: { data?: { message?: string } } })?.response?.data?.message;
      toast.error(msg || 'Failed to record transaction');
    },
  });
}

// ── Update ─────────────────────────────────────────────────────────────────
export function useUpdateTransaction() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Transaction> }) =>
      transactionsApi.update(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['transactions'] });
      qc.invalidateQueries({ queryKey: ['profit-loss'] });
      toast.success('Transaction updated');
    },
    onError: () => toast.error('Failed to update transaction'),
  });
}

// ── Delete ─────────────────────────────────────────────────────────────────
export function useDeleteTransaction() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => transactionsApi.remove(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['transactions'] });
      qc.invalidateQueries({ queryKey: ['profit-loss'] });
      qc.invalidateQueries({ queryKey: ['dashboard'] });
      toast.success('Transaction deleted');
    },
    onError: () => toast.error('Failed to delete transaction'),
  });
}
