'use client';
import { useState } from 'react';
import { Card }         from '@/components/ui/Card';
import { Button }       from '@/components/ui/Button';
import { StatusBadge }  from '@/components/ui/Badge';
import { SearchInput, Select } from '@/components/ui/Input';
import { Table, type Column }  from '@/components/ui/Table';
import { Modal, ConfirmDialog } from '@/components/ui/Modal';
import {
  useInvoices, useCreateInvoice, useDeleteInvoice,
  useRecordPayment, useHoldInvoice, useReleaseInvoice, useWhatsApp,
} from '@/hooks/useInvoices';
import { useClients } from '@/hooks/useClients';
import { fmtCurrency, fmtDate, truncate, statusColor, MONTHS, YEARS } from '@/lib/utils';
import {
  Plus, MessageCircle, Lock, Unlock, Trash2,
  CreditCard, RefreshCw,
} from 'lucide-react';
import type { Invoice, Client } from '@/types';
import toast from 'react-hot-toast';
import { useForm } from 'react-hook-form';

const STATUS_OPTS = [
  { value: '',          label: 'All Statuses' },
  { value: 'pending',   label: 'Pending'      },
  { value: 'partial',   label: 'Partial'      },
  { value: 'paid',      label: 'Paid'         },
  { value: 'overdue',   label: 'Overdue'      },
  { value: 'hold',      label: 'On Hold'      },
  { value: 'cancelled', label: 'Cancelled'    },
];

type CreateForm = {
  client_id?:    string;
  client_name:   string;
  client_gstin?: string;
  inv_date:      string;
  due_date?:     string;
  supply_type:   'intra' | 'inter';
  gst_rate:      number;
  hsn_code?:     string;
  discount?:     number;
  notes?:        string;
};

export default function InvoicesPage() {
  // List state
  const [page,      setPage]      = useState(1);
  const [search,    setSearch]    = useState('');
  const [status,    setStatus]    = useState('');
  const [sortKey,   setSortKey]   = useState('inv_date');
  const [sortOrder, setSortOrder] = useState<'ASC' | 'DESC'>('DESC');

  // Modal state
  const [showCreate, setShowCreate] = useState(false);
  const [payInv,     setPayInv]     = useState<Invoice | null>(null);
  const [payAmt,     setPayAmt]     = useState('');
  const [payUTR,     setPayUTR]     = useState('');
  const [payMode,    setPayMode]    = useState('NEFT');
  const [payDate,    setPayDate]    = useState(new Date().toISOString().split('T')[0]);
  const [holdInv,    setHoldInv]    = useState<Invoice | null>(null);
  const [holdReason, setHoldReason] = useState('');
  const [deleteInv,  setDeleteInv]  = useState<Invoice | null>(null);

  // Data hooks
  const { data, isLoading, refetch } = useInvoices({ page, status, search, sort: sortKey, order: sortOrder, limit: 25 });
  const { data: clientsData }        = useClients({ limit: 200 });
  const createMut  = useCreateInvoice();
  const deleteMut  = useDeleteInvoice();
  const payMut     = useRecordPayment();
  const holdMut    = useHoldInvoice();
  const releaseMut = useReleaseInvoice();
  const waMut      = useWhatsApp();

  // Create form
  const { register, handleSubmit, reset, setValue } = useForm<CreateForm>({
    defaultValues: {
      supply_type: 'inter',
      gst_rate:    18,
      discount:    0,
      hsn_code:    '998519',
      inv_date:    new Date().toISOString().split('T')[0],
    },
  });

  const clients  = (clientsData?.data ?? []) as Client[];
  const invoices = (data?.data?.invoices ?? []) as Invoice[];
  const stats    = data?.data?.stats;
  const meta     = data?.meta;

  function handleSort(key: string) {
    if (key === sortKey) setSortOrder(o => (o === 'ASC' ? 'DESC' : 'ASC'));
    else { setSortKey(key); setSortOrder('DESC'); }
  }

  function handleClientSelect(e: React.ChangeEvent<HTMLSelectElement>) {
    const cl = clients.find(c => c.id === e.target.value);
    if (cl) {
      setValue('client_name',  cl.name);
      setValue('client_gstin', cl.gstin ?? '');
      setValue('supply_type',  cl.supply_type ?? 'inter');
      setValue('gst_rate',     cl.gst_rate ?? 18);
    }
  }

  async function onCreateSubmit(form: CreateForm) {
    await createMut.mutateAsync({
      ...form,
      gst_rate: Number(form.gst_rate),
      discount: Number(form.discount ?? 0),
      items:    [],
    } as Partial<Invoice>);
    setShowCreate(false);
    reset();
  }

  async function submitPayment() {
    if (!payInv) return;
    const amt = parseFloat(payAmt);
    if (!amt || amt <= 0) { toast.error('Enter valid amount'); return; }
    await payMut.mutateAsync({ id: payInv.id, amount: amt, pay_date: payDate, pay_mode: payMode, utr_number: payUTR });
    setPayInv(null); setPayAmt(''); setPayUTR('');
  }

  async function submitHold() {
    if (!holdInv || !holdReason.trim()) { toast.error('Enter hold reason'); return; }
    await holdMut.mutateAsync({ id: holdInv.id, reason: holdReason });
    setHoldInv(null); setHoldReason('');
  }

  const columns: Column<Invoice>[] = [
    {
      key: 'inv_no', header: 'Invoice #', sortable: true, width: '120px',
      render: r => <span className="font-mono text-xs font-semibold text-blue-600">{r.inv_no}</span>,
    },
    {
      key: 'client_name', header: 'Client', sortable: true,
      render: r => (
        <div>
          <p className="font-medium text-gray-800 text-sm">{truncate(r.client_name, 28)}</p>
          {r.client_gstin && <p className="text-xs text-gray-400 font-mono">{r.client_gstin}</p>}
        </div>
      ),
    },
    {
      key: 'inv_date', header: 'Date', sortable: true, width: '100px',
      render: r => <span className="text-xs text-gray-600">{fmtDate(r.inv_date)}</span>,
    },
    {
      key: 'due_date', header: 'Due', width: '100px',
      render: r => <span className="text-xs text-gray-600">{fmtDate(r.due_date)}</span>,
    },
    {
      key: 'total', header: 'Amount', sortable: true, align: 'right', width: '120px',
      render: r => <span className="font-semibold text-sm">{fmtCurrency(Number(r.total))}</span>,
    },
    {
      key: 'outstanding', header: 'Due', align: 'right', width: '110px',
      render: r => (
        <span className={Number(r.outstanding) > 0 ? 'font-semibold text-orange-600 text-sm' : 'text-gray-400 text-sm'}>
          {Number(r.outstanding) > 0 ? fmtCurrency(Number(r.outstanding)) : '—'}
        </span>
      ),
    },
    {
      key: 'status', header: 'Status', width: '100px',
      render: r => <StatusBadge status={r.status} />,
    },
    {
      key: 'actions', header: '', width: '120px', align: 'right',
      render: r => (
        <div className="flex items-center justify-end gap-1">
          {r.status !== 'paid' && r.status !== 'cancelled' && (
            <button onClick={() => { setPayInv(r); setPayAmt(String(r.outstanding)); }}
              title="Record Payment"
              className="p-1.5 rounded-lg hover:bg-green-50 text-gray-400 hover:text-green-600 transition-colors">
              <CreditCard className="w-3.5 h-3.5" />
            </button>
          )}
          <button onClick={() => waMut.mutate(r.id)} title="WhatsApp"
            className="p-1.5 rounded-lg hover:bg-green-50 text-gray-400 hover:text-green-600 transition-colors">
            <MessageCircle className="w-3.5 h-3.5" />
          </button>
          {r.status !== 'hold' ? (
            <button onClick={() => { setHoldInv(r); setHoldReason(''); }} title="Hold"
              className="p-1.5 rounded-lg hover:bg-orange-50 text-gray-400 hover:text-orange-500 transition-colors">
              <Lock className="w-3.5 h-3.5" />
            </button>
          ) : (
            <button onClick={() => releaseMut.mutate(r.id)} title="Release"
              className="p-1.5 rounded-lg hover:bg-green-50 text-gray-400 hover:text-green-600 transition-colors">
              <Unlock className="w-3.5 h-3.5" />
            </button>
          )}
          {r.status !== 'paid' && (
            <button onClick={() => setDeleteInv(r)} title="Delete"
              className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-600 transition-colors">
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      ),
    },
  ];

  return (
    <>
      <div className="space-y-5 animate-in">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-gray-900">Invoices</h2>
            <p className="text-xs text-gray-400">GST-compliant · CGST / SGST / IGST · GSTR-1 ready</p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => refetch()}
              className="p-2 rounded-lg hover:bg-gray-100 text-gray-500 transition-colors">
              <RefreshCw className="w-4 h-4" />
            </button>
            <Button variant="primary" icon={<Plus className="w-4 h-4" />} onClick={() => setShowCreate(true)}>
              New Invoice
            </Button>
          </div>
        </div>

        {/* Summary KPI cards */}
        {stats && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {([
              { label: 'Total Billed',   val: stats.total_billed,      color: 'text-blue-600'   },
              { label: 'Received',       val: stats.total_received,    color: 'text-green-600'  },
              { label: 'Outstanding',    val: stats.total_outstanding, color: 'text-orange-600' },
              { label: 'Overdue',        val: stats.overdue_amount,    color: 'text-red-600'    },
            ] as const).map(s => (
              <div key={s.label} className="kpi-card">
                <p className="text-xs text-gray-500 uppercase tracking-wide">{s.label}</p>
                <p className={`text-lg font-bold mt-1 ${s.color}`}>{fmtCurrency(Number(s.val))}</p>
              </div>
            ))}
          </div>
        )}

        {/* Filters + Table */}
        <Card noPad>
          <div className="flex flex-col sm:flex-row gap-3 p-4">
            <SearchInput value={search} onChange={v => { setSearch(v); setPage(1); }}
              placeholder="Search invoice no, client…" className="flex-1" />
            <Select options={STATUS_OPTS} value={status}
              onChange={e => { setStatus(e.target.value); setPage(1); }}
              className="w-full sm:w-44" />
          </div>
          <Table
            columns={columns} data={invoices} loading={isLoading}
            rowKey={r => r.id}
            sortKey={sortKey} sortOrder={sortOrder} onSort={handleSort}
            page={meta?.page} pages={meta?.pages} total={meta?.total} limit={25}
            onPageChange={setPage}
            emptyTitle="No invoices found" emptyDesc="Create your first GST invoice"
          />
        </Card>
      </div>

      {/* ── Create Invoice Modal ───────────────────────────────────────── */}
      <Modal open={showCreate} onClose={() => { setShowCreate(false); reset(); }}
        size="xl" title="New GST Invoice"
        footer={
          <>
            <Button variant="outline" onClick={() => { setShowCreate(false); reset(); }}>Cancel</Button>
            <Button variant="primary" loading={createMut.isPending}
              onClick={handleSubmit(onCreateSubmit)}>
              Create Invoice
            </Button>
          </>
        }
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2 flex flex-col gap-1">
            <label className="text-xs font-medium text-gray-600">Select Existing Client</label>
            <select onChange={handleClientSelect} className="input-base">
              <option value="">— Choose from saved clients (auto-fills below) —</option>
              {clients.map(cl => <option key={cl.id} value={cl.id}>{cl.name}</option>)}
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-gray-600">Client Name <span className="text-red-500">*</span></label>
            <input {...register('client_name', { required: 'Client name is required' })}
              className="input-base" placeholder="NeoSoft Technologies Pvt Ltd" />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-gray-600">Client GSTIN</label>
            <input {...register('client_gstin')} className="input-base font-mono uppercase"
              placeholder="27AABCN1234F1Z5" />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-gray-600">Invoice Date <span className="text-red-500">*</span></label>
            <input type="date" {...register('inv_date', { required: true })} className="input-base" />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-gray-600">Due Date</label>
            <input type="date" {...register('due_date')} className="input-base" />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-gray-600">Supply Type</label>
            <select {...register('supply_type')} className="input-base">
              <option value="inter">Inter-state → IGST</option>
              <option value="intra">Intra-state → CGST + SGST</option>
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-gray-600">GST Rate</label>
            <select {...register('gst_rate')} className="input-base">
              {[0, 5, 12, 18, 28].map(r => <option key={r} value={r}>{r}%</option>)}
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-gray-600">HSN / SAC Code</label>
            <input {...register('hsn_code')} className="input-base font-mono" placeholder="998519" />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-gray-600">Discount (₹)</label>
            <input type="number" step="0.01" min={0} {...register('discount')}
              className="input-base" placeholder="0.00" />
          </div>
          <div className="sm:col-span-2 flex flex-col gap-1">
            <label className="text-xs font-medium text-gray-600">Notes / Terms</label>
            <textarea {...register('notes')} rows={2} className="input-base resize-none"
              placeholder="Payment terms, bank details, or special instructions…" />
          </div>
          <p className="sm:col-span-2 text-xs text-blue-700 bg-blue-50 rounded-xl px-4 py-3">
            Line items (consultant names, PO values, worked days) can be added after invoice creation.
            GST amount is auto-calculated from the total billing value.
          </p>
        </div>
      </Modal>

      {/* ── Payment Modal ─────────────────────────────────────────────── */}
      <Modal open={!!payInv} onClose={() => setPayInv(null)} size="sm"
        title={`Record Payment — ${payInv?.inv_no}`}
        footer={
          <>
            <Button variant="outline" onClick={() => setPayInv(null)}>Cancel</Button>
            <Button variant="primary" onClick={submitPayment} loading={payMut.isPending}>Record Payment</Button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="bg-blue-50 rounded-xl p-4 text-sm space-y-1">
            <div className="flex justify-between">
              <span className="text-gray-500">Client</span>
              <span className="font-medium">{payInv?.client_name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Invoice Total</span>
              <span className="font-bold text-blue-700">{fmtCurrency(Number(payInv?.total))}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Outstanding</span>
              <span className="font-bold text-orange-600">{fmtCurrency(Number(payInv?.outstanding))}</span>
            </div>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-gray-600">Amount Received (₹) <span className="text-red-500">*</span></label>
            <input type="number" value={payAmt} onChange={e => setPayAmt(e.target.value)}
              className="input-base" placeholder="0.00" />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-gray-600">Payment Date <span className="text-red-500">*</span></label>
            <input type="date" value={payDate} onChange={e => setPayDate(e.target.value)} className="input-base" />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-gray-600">Payment Mode</label>
            <select value={payMode} onChange={e => setPayMode(e.target.value)} className="input-base">
              {['NEFT','IMPS','RTGS','UPI','cheque','cash','card'].map(m => <option key={m}>{m}</option>)}
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-gray-600">UTR / Reference No</label>
            <input value={payUTR} onChange={e => setPayUTR(e.target.value)}
              className="input-base" placeholder="UTR number or cheque number" />
          </div>
        </div>
      </Modal>

      {/* ── Hold Modal ────────────────────────────────────────────────── */}
      <Modal open={!!holdInv} onClose={() => setHoldInv(null)} size="sm" title="Put Invoice on Hold"
        footer={
          <>
            <Button variant="outline" onClick={() => setHoldInv(null)}>Cancel</Button>
            <Button variant="danger" onClick={submitHold} loading={holdMut.isPending}>Hold Invoice</Button>
          </>
        }
      >
        <div className="space-y-3">
          <p className="text-sm text-gray-600">
            Invoice <strong>{holdInv?.inv_no}</strong> will be put on hold and won&apos;t appear in active reports.
          </p>
          <textarea value={holdReason} onChange={e => setHoldReason(e.target.value)} rows={3}
            className="input-base resize-none" placeholder="Reason for holding this invoice…" />
        </div>
      </Modal>

      {/* ── Delete Confirm ────────────────────────────────────────────── */}
      <ConfirmDialog
        open={!!deleteInv}
        onClose={() => setDeleteInv(null)}
        onConfirm={async () => { await deleteMut.mutateAsync(deleteInv!.id); setDeleteInv(null); }}
        title="Delete Invoice"
        message={`Delete ${deleteInv?.inv_no} for ${deleteInv?.client_name}? This action cannot be undone.`}
        confirmLabel="Delete"
        loading={deleteMut.isPending}
      />
    </>
  );
}
