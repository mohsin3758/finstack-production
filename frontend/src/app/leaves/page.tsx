'use client';
import { useState } from 'react';
import { Card }   from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { StatusBadge } from '@/components/ui/Badge';
import { Select } from '@/components/ui/Input';
import { Table, type Column } from '@/components/ui/Table';
import { Modal, ConfirmDialog } from '@/components/ui/Modal';
import { useLeaves, useCreateLeave, useApproveLeave, useRejectLeave } from '@/hooks/useLeaves';
import { useEmployees } from '@/hooks/useEmployees';
import { fmtDate } from '@/lib/utils';
import { useAuthStore } from '@/store/authStore';
import { Plus, CheckCircle, XCircle, Calendar } from 'lucide-react';
import type { LeaveRequest } from '@/types';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';

const LEAVE_TYPES = [
  { value: 'EL', label: 'Earned Leave (EL)' },
  { value: 'CL', label: 'Casual Leave (CL)' },
  { value: 'SL', label: 'Sick Leave (SL)' },
  { value: 'ML', label: 'Maternity Leave (ML)' },
  { value: 'PL', label: 'Paternity Leave (PL)' },
  { value: 'CO', label: 'Compensatory Off (CO)' },
  { value: 'LWP', label: 'Leave Without Pay (LWP)' },
];

const STATUS_OPTS = [
  { value: '',         label: 'All Statuses' },
  { value: 'pending',  label: 'Pending' },
  { value: 'approved', label: 'Approved' },
  { value: 'rejected', label: 'Rejected' },
];

type LeaveForm = {
  employee_id: string;
  leave_type:  string;
  from_date:   string;
  to_date:     string;
  reason:      string;
};

export default function LeavesPage() {
  const { user } = useAuthStore();
  const isHR     = user?.role === 'admin' || user?.role === 'hr_manager' || user?.role === 'super_admin';

  const [status,   setStatus]   = useState('');
  const [showAdd,  setShowAdd]  = useState(false);
  const [rejectId, setRejectId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  const { data: leavesData, isLoading, refetch } = useLeaves({ status: status || undefined });
  const { data: empData }    = useEmployees({ status: 'active', limit: 200 });
  const createMut  = useCreateLeave();
  const approveMut = useApproveLeave();
  const rejectMut  = useRejectLeave();

  const leaves    = (leavesData ?? []) as LeaveRequest[];
  const employees = (empData?.data ?? []);

  const { register, handleSubmit, reset, formState: { errors } } = useForm<LeaveForm>({
    defaultValues: { leave_type: 'CL' },
  });

  async function onSubmit(data: LeaveForm) {
    await createMut.mutateAsync(data as Parameters<typeof createMut.mutateAsync>[0]);
    setShowAdd(false);
    reset();
  }

  async function handleApprove(id: string) {
    await approveMut.mutateAsync(id);
  }

  async function handleReject() {
    if (!rejectId) return;
    if (!rejectReason.trim()) { toast.error('Please enter a reason for rejection'); return; }
    await rejectMut.mutateAsync({ id: rejectId, reason: rejectReason });
    setRejectId(null);
    setRejectReason('');
  }

  // Summary stats
  const pending  = leaves.filter(l => l.status === 'pending').length;
  const approved = leaves.filter(l => l.status === 'approved').length;
  const rejected = leaves.filter(l => l.status === 'rejected').length;

  const columns: Column<LeaveRequest>[] = [
    {
      key: 'employee', header: 'Employee',
      render: r => (
        <div>
          <p className="font-medium text-sm text-gray-900">{r.employee?.name ?? '—'}</p>
          <p className="text-xs text-gray-400">{r.employee?.department ?? ''}</p>
        </div>
      ),
    },
    { key: 'leave_type', header: 'Type',
      render: r => <span className="text-xs font-semibold px-2 py-1 bg-indigo-50 text-indigo-700 rounded-full">{r.leave_type}</span>,
    },
    {
      key: 'from_date', header: 'From',
      render: r => <span className="text-sm text-gray-700">{fmtDate(r.from_date)}</span>,
    },
    {
      key: 'to_date', header: 'To',
      render: r => <span className="text-sm text-gray-700">{fmtDate(r.to_date)}</span>,
    },
    {
      key: 'days', header: 'Days', align: 'center',
      render: r => <span className="font-semibold text-sm">{r.days}</span>,
    },
    {
      key: 'status', header: 'Status',
      render: r => <StatusBadge status={r.status} />,
    },
    {
      key: 'reason', header: 'Reason',
      render: r => <span className="text-xs text-gray-500 max-w-[180px] truncate block">{r.reason || '—'}</span>,
    },
    ...(isHR ? [{
      key: 'actions', header: 'Actions',
      render: (r: LeaveRequest) => r.status === 'pending' ? (
        <div className="flex items-center gap-2">
          <button
            onClick={() => handleApprove(r.id)}
            disabled={approveMut.isPending}
            className="p-1.5 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
            title="Approve"
          >
            <CheckCircle className="w-4 h-4" />
          </button>
          <button
            onClick={() => { setRejectId(r.id); setRejectReason(''); }}
            className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
            title="Reject"
          >
            <XCircle className="w-4 h-4" />
          </button>
        </div>
      ) : null,
    }] : []),
  ];

  return (
    <div className="space-y-5 animate-in">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-lg font-bold text-gray-900">Leave Management</h2>
          <p className="text-xs text-gray-400">EL · CL · SL · ML · CO · LWP — India compliant</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Select
            options={STATUS_OPTS}
            value={status}
            onChange={e => setStatus(e.target.value)}
            className="w-36"
          />
          <Button variant="secondary" onClick={() => refetch()} size="sm">Refresh</Button>
          <Button
            variant="primary"
            icon={<Plus className="w-4 h-4" />}
            onClick={() => setShowAdd(true)}
          >
            Apply Leave
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Pending Approval', val: pending,  color: 'text-yellow-600', bg: 'bg-yellow-50', icon: <Calendar className="w-5 h-5" /> },
          { label: 'Approved',         val: approved, color: 'text-green-600',  bg: 'bg-green-50',  icon: <CheckCircle className="w-5 h-5" /> },
          { label: 'Rejected',         val: rejected, color: 'text-red-600',    bg: 'bg-red-50',    icon: <XCircle className="w-5 h-5" /> },
        ].map(s => (
          <div key={s.label} className="kpi-card flex-row items-center gap-4">
            <div className={`p-3 rounded-xl ${s.bg}`}>
              <span className={s.color}>{s.icon}</span>
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{s.val}</p>
              <p className="text-xs text-gray-500">{s.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Table */}
      <Card noPad>
        <Table
          columns={columns}
          data={leaves}
          loading={isLoading}
          rowKey={r => r.id}
          emptyTitle="No leave requests"
          emptyDesc="Apply for leave using the button above"
        />
      </Card>

      {/* Apply Leave Modal */}
      <Modal
        open={showAdd}
        onClose={() => { setShowAdd(false); reset(); }}
        title="Apply for Leave"
        size="md"
        footer={
          <>
            <Button variant="outline" onClick={() => { setShowAdd(false); reset(); }}>Cancel</Button>
            <Button
              variant="primary"
              onClick={handleSubmit(onSubmit)}
              loading={createMut.isPending}
            >
              Submit Request
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          {/* Employee (HR/Admin can apply on behalf) */}
          {isHR && (
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-gray-600">
                Employee <span className="text-red-500">*</span>
              </label>
              <select
                {...register('employee_id', { required: 'Employee is required' })}
                className="input-base"
              >
                <option value="">Select employee…</option>
                {employees.map((e: { id: string; name: string; code?: string }) => (
                  <option key={e.id} value={e.id}>{e.name} {e.code ? `(${e.code})` : ''}</option>
                ))}
              </select>
              {errors.employee_id && (
                <p className="text-xs text-red-600">{errors.employee_id.message}</p>
              )}
            </div>
          )}

          {/* Leave Type */}
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-gray-600">
              Leave Type <span className="text-red-500">*</span>
            </label>
            <select
              {...register('leave_type', { required: 'Leave type is required' })}
              className="input-base"
            >
              {LEAVE_TYPES.map(lt => (
                <option key={lt.value} value={lt.value}>{lt.label}</option>
              ))}
            </select>
          </div>

          {/* Date range */}
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-gray-600">
                From Date <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                {...register('from_date', { required: 'From date is required' })}
                className="input-base"
              />
              {errors.from_date && (
                <p className="text-xs text-red-600">{errors.from_date.message}</p>
              )}
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-gray-600">
                To Date <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                {...register('to_date', { required: 'To date is required' })}
                className="input-base"
              />
              {errors.to_date && (
                <p className="text-xs text-red-600">{errors.to_date.message}</p>
              )}
            </div>
          </div>

          {/* Reason */}
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-gray-600">Reason</label>
            <textarea
              {...register('reason')}
              rows={3}
              placeholder="Brief reason for leave…"
              className="input-base resize-none"
            />
          </div>

          <p className="text-xs text-gray-400 bg-gray-50 rounded-lg px-3 py-2">
            Leave balance is subject to HR approval. LWP will result in salary deduction.
          </p>
        </div>
      </Modal>

      {/* Reject reason modal */}
      <Modal
        open={!!rejectId}
        onClose={() => { setRejectId(null); setRejectReason(''); }}
        title="Reject Leave Request"
        size="sm"
        footer={
          <>
            <Button variant="outline" onClick={() => { setRejectId(null); setRejectReason(''); }}>
              Cancel
            </Button>
            <Button
              variant="danger"
              onClick={handleReject}
              loading={rejectMut.isPending}
            >
              Reject
            </Button>
          </>
        }
      >
        <div className="space-y-3">
          <p className="text-sm text-gray-600">Please provide a reason for rejecting this leave request.</p>
          <textarea
            value={rejectReason}
            onChange={e => setRejectReason(e.target.value)}
            rows={3}
            placeholder="Reason for rejection…"
            className="input-base resize-none"
          />
        </div>
      </Modal>
    </div>
  );
}
