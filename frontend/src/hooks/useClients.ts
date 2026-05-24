import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { clientsApi } from '@/services/api';
import toast from 'react-hot-toast';
import type { Client } from '@/types';

interface UseClientsParams {
  [key: string]: unknown; page?: number; limit?: number; search?: string; active?: string; }

export function useClients(params: UseClientsParams = {}) {
  return useQuery({
    queryKey: ['clients', params],
    queryFn:  async () => { const r = await clientsApi.list(params); return r.data; },
    staleTime: 60 * 1000,
  });
}

export function useClient(id: string | null) {
  return useQuery({
    queryKey: ['client', id],
    queryFn:  async () => { const r = await clientsApi.getOne(id!); return r.data.data as Client; },
    enabled:  !!id,
  });
}

export function useCreateClient() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<Client>) => clientsApi.create(data),
    onSuccess:  () => { qc.invalidateQueries({ queryKey: ['clients'] }); toast.success('Client added'); },
    onError:    (e: unknown) => toast.error((e as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Failed'),
  });
}

export function useUpdateClient() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Client> }) => clientsApi.update(id, data),
    onSuccess:  () => { qc.invalidateQueries({ queryKey: ['clients'] }); toast.success('Client updated'); },
    onError:    () => toast.error('Failed to update client'),
  });
}

export function useDeleteClient() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => clientsApi.remove(id),
    onSuccess:  () => { qc.invalidateQueries({ queryKey: ['clients'] }); toast.success('Client removed'); },
    onError:    () => toast.error('Failed to remove client'),
  });
}
