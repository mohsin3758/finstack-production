import api from '@/lib/api';
import type {
  Invoice, Employee, Client, Transaction,
  LeaveRequest, PayrollRecord, DashboardData, User, Company
} from '@/types';

// ── Dashboard ─────────────────────────────────────────────────────────────
export const dashboardApi = {
  summary: () => api.get<{ success: boolean; data: DashboardData }>('/dashboard'),
};

// ── Invoices ──────────────────────────────────────────────────────────────
export const invoicesApi = {
  list:     (params?: Record<string, unknown>) => api.get('/invoices', { params }),
  getOne:   (id: string)  => api.get(`/invoices/${id}`),
  create:   (data: Partial<Invoice>) => api.post('/invoices', data),
  update:   (id: string, data: Partial<Invoice>) => api.put(`/invoices/${id}`, data),
  remove:   (id: string)  => api.delete(`/invoices/${id}`),
  pay:      (id: string, data: { amount: number; pay_date: string; pay_mode?: string; utr_number?: string }) =>
              api.post(`/invoices/${id}/payment`, data),
  hold:     (id: string, reason: string) => api.post(`/invoices/${id}/hold`, { reason }),
  release:  (id: string)  => api.post(`/invoices/${id}/release`),
  whatsapp: (id: string)  => api.post(`/invoices/${id}/whatsapp`),
  gstr1:    (params: { month: number; year: number }) => api.get('/invoices/gstr1', { params }),
};

// ── Employees ─────────────────────────────────────────────────────────────
export const employeesApi = {
  list:           (params?: Record<string, unknown>) => api.get('/employees', { params }),
  getOne:         (id: string) => api.get(`/employees/${id}`),
  create:         (data: Partial<Employee>) => api.post('/employees', data),
  update:         (id: string, data: Partial<Employee>) => api.put(`/employees/${id}`, data),
  remove:         (id: string) => api.delete(`/employees/${id}`),
  payrollHistory: (id: string, year?: number) => api.get(`/employees/${id}/payroll`, { params: { year } }),
  exportBank:     (month: number, year: number) =>
                    api.get('/employees/export/bank', { params: { month, year }, responseType: 'blob' }),
};

// ── Payroll ───────────────────────────────────────────────────────────────
export const payrollApi = {
  process: (data: { month: number; year: number; employees: Array<{ employee_id: string; present_days: number }> }) =>
             api.post('/payroll/process', data),
};

// ── Clients ───────────────────────────────────────────────────────────────
export const clientsApi = {
  list:   (params?: Record<string, unknown>) => api.get('/clients', { params }),
  getOne: (id: string) => api.get(`/clients/${id}`),
  create: (data: Partial<Client>) => api.post('/clients', data),
  update: (id: string, data: Partial<Client>) => api.put(`/clients/${id}`, data),
  remove: (id: string) => api.delete(`/clients/${id}`),
};

// ── Transactions ──────────────────────────────────────────────────────────
export const transactionsApi = {
  list:       (params?: Record<string, unknown>) => api.get('/transactions', { params }),
  create:     (data: Partial<Transaction>) => api.post('/transactions', data),
  update:     (id: string, data: Partial<Transaction>) => api.put(`/transactions/${id}`, data),
  remove:     (id: string) => api.delete(`/transactions/${id}`),
  profitLoss: (params: { from?: string; to?: string; month?: number; year?: number }) =>
                api.get('/transactions/pl', { params }),
};

// ── Leaves ────────────────────────────────────────────────────────────────
export const leavesApi = {
  list:    (params?: Record<string, unknown>) => api.get('/leaves', { params }),
  create:  (data: Partial<LeaveRequest>) => api.post('/leaves', data),
  approve: (id: string) => api.put(`/leaves/${id}/approve`),
  reject:  (id: string, reason: string) => api.put(`/leaves/${id}/reject`, { reason }),
};

// ── Settings ──────────────────────────────────────────────────────────────
export const settingsApi = {
  get:    () => api.get<{ success: boolean; data: Company }>('/settings'),
  update: (data: Partial<Company>) => api.put('/settings', data),
};

// ── Users ─────────────────────────────────────────────────────────────────
export const usersApi = {
  list:   () => api.get<{ success: boolean; data: User[] }>('/users'),
  invite: (data: { name: string; email: string; role: string; phone?: string }) => api.post('/users', data),
  update: (id: string, data: Partial<User>) => api.put(`/users/${id}`, data),
  remove: (id: string) => api.delete(`/users/${id}`),
};

// ── Audit ─────────────────────────────────────────────────────────────────
export const auditApi = {
  list: (params?: Record<string, unknown>) => api.get('/audit', { params }),
};

// ── Notifications ──────────────────────────────────────────────────────────
export const notificationsApi = {
  list:       () => api.get('/notifications'),
  markRead:   (id: string) => api.patch(`/notifications/${id}/read`),
  markAllRead:() => api.patch('/notifications/read-all'),
};

// ── Upload ────────────────────────────────────────────────────────────────
export const uploadApi = {
  file:      (file: File) => {
    const form = new FormData();
    form.append('file', file);
    return api.post('/upload', form, { headers: { 'Content-Type': 'multipart/form-data' } });
  },
  timesheet: (file: File) => {
    const form = new FormData();
    form.append('file', file);
    return api.post('/upload/timesheet', form, { headers: { 'Content-Type': 'multipart/form-data' } });
  },
};
