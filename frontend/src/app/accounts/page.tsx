'use client';
import { useState } from 'react';
import { Card }   from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Select } from '@/components/ui/Input';
import { Table, type Column } from '@/components/ui/Table';
import { Modal } from '@/components/ui/Modal';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { transactionsApi } from '@/services/api';
import { fmtCurrency, fmtDate, MONTHS, YEARS } from '@/lib/utils';
import { Plus, TrendingUp, TrendingDown, DollarSign } from 'lucide-react';
import type { Transaction } from '@/types';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';

export default function AccountsPage() {
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year,  setYear]  = useState(now.getFullYear());
  const [type,  setType]  = useState('');
  const [page,  setPage]  = useState(1);
  const [showForm, setShowForm] = useState(false);

  const qc = useQueryClient();

  const from = `${year}-${String(month).padStart(2,'0')}-01`;
  const toDate = new Date(year, month, 0);
  const to   = `${year}-${String(month).padStart(2,'0')}-${toDate.getDate()}`;

  const { data, isLoading } = useQuery({
    queryKey: ['transactions', { page, type, from, to }],
    queryFn:  async () => { const r = await transactionsApi.list({ page, type, from, to, limit: 50 }); return r.data; },
  });

  const { data: plData } = useQuery({
    queryKey: ['pl', { from, to }],
    queryFn:  async () => { const r = await transactionsApi.profitLoss({ from, to }); return r.data.data; },
  });

  const { register, handleSubmit, reset } = useForm<Partial<Transaction>>();
  const createMut = useMutation({
    mutationFn: transactionsApi.create,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['transactions'] }); qc.invalidateQueries({ queryKey: ['pl'] }); toast.success('Transaction added'); setShowForm(false); reset(); },
    onError: () => toast.error('Failed to add transaction'),
  });

  const columns: Column<Transaction>[] = [
    { key:'date',        header:'Date',     render: r => <span className="text-xs">{fmtDate(r.date)}</span> },
    {
      key:'txn_type', header:'Type',
      render: r => (
        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${r.txn_type==='income'?'bg-green-50 text-green-700':'bg-red-50 text-red-700'}`}>
          {r.txn_type}
        </span>
      )
    },
    { key:'category',    header:'Category',    render: r => <span className="text-sm text-gray-600">{r.category || '—'}</span> },
    { key:'description', header:'Description', render: r => <span className="text-sm text-gray-600">{r.description || '—'}</span> },
    { key:'party',       header:'Party',       render: r => <span className="text-sm">{r.party || '—'}</span> },
    { key:'pay_mode',    header:'Mode',        render: r => <span className="text-xs text-gray-500">{r.pay_mode || '—'}</span> },
    {
      key:'amount', header:'Amount', align:'right',
      render: r => (
        <span className={`font-semibold text-sm ${r.txn_type==='income'?'text-green-600':'text-red-600'}`}>
          {r.txn_type==='income'?'+':'-'}{fmtCurrency(Number(r.amount))}
        </span>
      )
    },
  ];

  return (
    <>
      <div className="space-y-5 animate-in">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <h2 className="text-lg font-bold text-gray-900">Accounts & Ledger</h2>
          <div className="flex items-center gap-2 flex-wrap">
            <Select options={MONTHS.map((m,i)=>({value:i+1,label:m}))} value={month} onChange={e=>setMonth(Number(e.target.value))} className="w-28" />
            <Select options={YEARS.map(y=>({value:y,label:String(y)}))} value={year} onChange={e=>setYear(Number(e.target.value))} className="w-24" />
            <Button variant="primary" icon={<Plus className="w-4 h-4" />} size="sm" onClick={() => { reset({ date: new Date().toISOString().split('T')[0], txn_type: 'income' }); setShowForm(true); }}>
              Add Transaction
            </Button>
          </div>
        </div>

        {/* P&L Summary */}
        <div className="grid grid-cols-3 gap-4">
          <div className="kpi-card">
            <div className="flex items-center gap-2 text-green-600"><TrendingUp className="w-4 h-4" /><p className="text-xs font-medium uppercase text-gray-500">Income</p></div>
            <p className="text-xl font-bold text-green-600 mt-1">{fmtCurrency(Number(plData?.income ?? 0))}</p>
          </div>
          <div className="kpi-card">
            <div className="flex items-center gap-2 text-red-600"><TrendingDown className="w-4 h-4" /><p className="text-xs font-medium uppercase text-gray-500">Expenses</p></div>
            <p className="text-xl font-bold text-red-600 mt-1">{fmtCurrency(Number(plData?.expense ?? 0))}</p>
          </div>
          <div className="kpi-card">
            <div className="flex items-center gap-2 text-blue-600"><DollarSign className="w-4 h-4" /><p className="text-xs font-medium uppercase text-gray-500">Net Profit</p></div>
            <p className={`text-xl font-bold mt-1 ${Number(plData?.net ?? 0) >= 0 ? 'text-blue-600' : 'text-red-600'}`}>{fmtCurrency(Number(plData?.net ?? 0))}</p>
          </div>
        </div>

        <Card noPad>
          <div className="p-4">
            <Select options={[{value:'',label:'All Types'},{value:'income',label:'Income'},{value:'expense',label:'Expense'}]}
              value={type} onChange={e=>{setType(e.target.value);setPage(1);}} className="w-44" />
          </div>
          <Table
            columns={columns} data={(data?.data ?? []) as Transaction[]} loading={isLoading}
            rowKey={r => r.id} page={page} pages={Math.ceil((data?.meta?.total??0)/50)} total={data?.meta?.total} limit={50} onPageChange={setPage}
            emptyTitle="No transactions" emptyDesc="Add income/expense entries"
          />
        </Card>
      </div>

      <Modal open={showForm} onClose={() => setShowForm(false)} size="md" title="Add Transaction"
        footer={
          <>
            <Button variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
            <Button variant="primary" onClick={handleSubmit(d => createMut.mutate(d))} loading={createMut.isPending}>Add</Button>
          </>
        }
      >
        <form className="grid grid-cols-2 gap-4">
          <Select label="Type" required options={[{value:'income',label:'Income'},{value:'expense',label:'Expense'}]} {...register('txn_type')} className="col-span-2" />
          <div><label className="text-xs font-medium text-gray-600 block mb-1">Date *</label><input type="date" {...register('date')} className="input-base" /></div>
          <div><label className="text-xs font-medium text-gray-600 block mb-1">Amount (₹) *</label><input type="number" step="0.01" {...register('amount')} className="input-base" placeholder="0.00" /></div>
          <div><label className="text-xs font-medium text-gray-600 block mb-1">Category</label><input {...register('category')} className="input-base" placeholder="Salary / Rent / Travel…" /></div>
          <div><label className="text-xs font-medium text-gray-600 block mb-1">Party</label><input {...register('party')} className="input-base" placeholder="Vendor / Employee name" /></div>
          <div className="col-span-2"><label className="text-xs font-medium text-gray-600 block mb-1">Description</label><input {...register('description')} className="input-base" placeholder="Brief description" /></div>
          <Select label="Payment Mode" options={['NEFT','IMPS','RTGS','UPI','cheque','cash','card'].map(m=>({value:m,label:m}))} {...register('pay_mode')} />
          <div><label className="text-xs font-medium text-gray-600 block mb-1">Reference No</label><input {...register('reference')} className="input-base" placeholder="UTR / Cheque no" /></div>
        </form>
      </Modal>
    </>
  );
}
