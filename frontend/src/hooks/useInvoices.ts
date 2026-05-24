import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { invoicesApi } from '@/services/api';
import toast from 'react-hot-toast';
import type { Invoice } from '@/types';

// ── List ───────────────────────────────────────────────────────────────────
interface UseInvoicesParams {
  [key: string]: unknown;
  page?:   number; limit?: number; status?: string;
  search?: string; from?: string; to?: string;
  client_id?: string; sort?: string; order?: string;
}
export function useInvoices(params: UseInvoicesParams = {}) {
  return useQuery({
    queryKey: ['invoices', params],
    queryFn:  async () => { const r = await invoicesApi.list(params); return r.data; },
    staleTime: 30 * 1000,
  });
}

// ── Single ─────────────────────────────────────────────────────────────────
export function useInvoice(id: string | null) {
  return useQuery({
    queryKey: ['invoice', id],
    queryFn:  async () => { const r = await invoicesApi.getOne(id!); return r.data.data as Invoice; },
    enabled:  !!id,
  });
}

// ── Mutations ──────────────────────────────────────────────────────────────
export function useCreateInvoice() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<Invoice>) => invoicesApi.create(data),
    onSuccess:  () => { qc.invalidateQueries({ queryKey: ['invoices'] }); toast.success('Invoice created'); },
    onError:    (e: unknown) => toast.error((e as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Failed to create invoice'),
  });
}

export function useUpdateInvoice() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Invoice> }) => invoicesApi.update(id, data),
    onSuccess:  () => { qc.invalidateQueries({ queryKey: ['invoices'] }); toast.success('Invoice updated'); },
    onError:    (e: unknown) => toast.error((e as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Failed to update'),
  });
}

export function useDeleteInvoice() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => invoicesApi.remove(id),
    onSuccess:  () => { qc.invalidateQueries({ queryKey: ['invoices'] }); toast.success('Invoice deleted'); },
    onError:    () => toast.error('Cannot delete this invoice'),
  });
}

export function useRecordPayment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: { id: string; amount: number; pay_date: string; pay_mode?: string; utr_number?: string }) =>
      invoicesApi.pay(id, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['invoices'] }); toast.success('Payment recorded'); },
    onError:   () => toast.error('Failed to record payment'),
  });
}

export function useHoldInvoice() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) => invoicesApi.hold(id, reason),
    onSuccess:  () => { qc.invalidateQueries({ queryKey: ['invoices'] }); toast.success('Invoice put on hold'); },
    onError:    () => toast.error('Failed to hold invoice'),
  });
}

export function useReleaseInvoice() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => invoicesApi.release(id),
    onSuccess:  () => { qc.invalidateQueries({ queryKey: ['invoices'] }); toast.success('Invoice released'); },
    onError:    () => toast.error('Failed to release invoice'),
  });
}

export function useWhatsApp() {
  return useMutation({
    mutationFn: (id: string) => invoicesApi.whatsapp(id),
    onSuccess:  (res) => {
      const url = res.data.data.wa_url;
      if (typeof window !== 'undefined') window.open(url, '_blank');
    },
    onError: () => toast.error('Failed to generate WhatsApp link'),
  });
}
