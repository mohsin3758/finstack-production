import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { employeesApi, payrollApi } from '@/services/api';
import toast from 'react-hot-toast';
import type { Employee } from '@/types';

interface UseEmployeesParams {
  [key: string]: unknown; page?: number; limit?: number; status?: string; search?: string; department?: string; }

export function useEmployees(params: UseEmployeesParams = {}) {
  return useQuery({
    queryKey: ['employees', params],
    queryFn:  async () => { const r = await employeesApi.list(params); return r.data; },
    staleTime: 60 * 1000,
  });
}

export function useEmployee(id: string | null) {
  return useQuery({
    queryKey: ['employee', id],
    queryFn:  async () => { const r = await employeesApi.getOne(id!); return r.data.data as Employee; },
    enabled:  !!id,
  });
}

export function useCreateEmployee() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<Employee>) => employeesApi.create(data),
    onSuccess:  () => { qc.invalidateQueries({ queryKey: ['employees'] }); toast.success('Employee added'); },
    onError:    (e: unknown) => toast.error((e as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Failed to add employee'),
  });
}

export function useUpdateEmployee() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Employee> }) => employeesApi.update(id, data),
    onSuccess:  () => { qc.invalidateQueries({ queryKey: ['employees'] }); toast.success('Employee updated'); },
    onError:    () => toast.error('Failed to update employee'),
  });
}

export function useDeleteEmployee() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => employeesApi.remove(id),
    onSuccess:  () => { qc.invalidateQueries({ queryKey: ['employees'] }); toast.success('Employee removed'); },
    onError:    () => toast.error('Failed to remove employee'),
  });
}

export function useEmployeePayroll(id: string | null, year?: number) {
  return useQuery({
    queryKey: ['employee-payroll', id, year],
    queryFn:  async () => { const r = await employeesApi.payrollHistory(id!, year); return r.data.data; },
    enabled:  !!id,
  });
}

export function useProcessPayroll() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: payrollApi.process,
    onSuccess:  () => { qc.invalidateQueries({ queryKey: ['employees'] }); toast.success('Payroll processed'); },
    onError:    (e: unknown) => toast.error((e as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Payroll processing failed'),
  });
}
