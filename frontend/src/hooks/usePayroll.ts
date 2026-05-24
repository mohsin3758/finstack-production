import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { payrollApi, employeesApi } from '@/services/api';
import toast from 'react-hot-toast';

// ── Process payroll ────────────────────────────────────────────────────────
export function useProcessPayroll() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: payrollApi.process,
    onSuccess: (res) => {
      const count = res.data?.data?.length ?? 0;
      qc.invalidateQueries({ queryKey: ['employees'] });
      qc.invalidateQueries({ queryKey: ['payroll'] });
      toast.success(`Payroll processed for ${count} employee${count !== 1 ? 's' : ''}`);
    },
    onError: (e: unknown) => {
      const msg = (e as { response?: { data?: { message?: string } } })?.response?.data?.message;
      toast.error(msg || 'Payroll processing failed');
    },
  });
}

// ── Export bank file ───────────────────────────────────────────────────────
export function useExportBankFile() {
  return useMutation({
    mutationFn: ({ month, year }: { month: number; year: number }) =>
      employeesApi.exportBank(month, year),
    onSuccess: (res, vars) => {
      const blob = new Blob([res.data as BlobPart], { type: 'text/csv' });
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement('a');
      a.href     = url;
      a.download = `BankPayment_${vars.month}_${vars.year}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success('Bank file downloaded');
    },
    onError: () => toast.error('Failed to export bank file'),
  });
}

// ── Payroll history for a single employee ─────────────────────────────────
export function usePayrollHistory(employeeId: string | null, year?: number) {
  return useQuery({
    queryKey: ['payroll-history', employeeId, year],
    queryFn:  async () => {
      const r = await employeesApi.payrollHistory(employeeId!, year);
      return r.data.data;
    },
    enabled:   !!employeeId,
    staleTime: 5 * 60 * 1000,
  });
}
