'use client';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card }   from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Select } from '@/components/ui/Input';
import { RevenueChart } from '@/components/charts/RevenueChart';
import { transactionsApi, invoicesApi, employeesApi } from '@/services/api';
import { fmtCurrency, MONTHS, YEARS } from '@/lib/utils';
import { BarChart3, Download, TrendingUp, TrendingDown, DollarSign, Users } from 'lucide-react';

export default function ReportsPage() {
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year,  setYear]  = useState(now.getFullYear());

  const from = `${year}-${String(month).padStart(2,'0')}-01`;
  const toDate = new Date(year, month, 0);
  const to = `${year}-${String(month).padStart(2,'0')}-${String(toDate.getDate()).padStart(2,'0')}`;

  const { data: plData }  = useQuery({ queryKey: ['pl-report', from, to], queryFn: async () => { const r = await transactionsApi.profitLoss({ from, to }); return r.data.data; } });
  const { data: invData } = useQuery({ queryKey: ['inv-report', from, to], queryFn: async () => { const r = await invoicesApi.list({ from, to, limit: 500 }); return r.data; } });
  const { data: empData } = useQuery({ queryKey: ['emp-report'],            queryFn: async () => { const r = await employeesApi.list({ limit: 500, status: 'active' }); return r.data; } });

  // Compute invoice breakdown
  const invoices = invData?.data?.invoices ?? [];
  const paidCount    = invoices.filter((i: { status: string }) => i.status === 'paid').length;
  const pendingCount = invoices.filter((i: { status: string }) => ['pending','sent','partial'].includes(i.status)).length;
  const overdueCount = invoices.filter((i: { status: string }) => i.status === 'overdue').length;
  const totalBilled  = invoices.reduce((s: number, i: { total: string | number }) => s + Number(i.total), 0);
  const totalReceived= invoices.reduce((s: number, i: { received: string | number }) => s + Number(i.received), 0);
  const collectionRate = totalBilled > 0 ? (totalReceived / totalBilled * 100).toFixed(1) : '0';

  const activeEmp    = empData?.data?.length ?? 0;
  const pfEmployees  = (empData?.data ?? []).filter((e: { pf_enrolled: number }) => e.pf_enrolled).length;
  const totalPayroll = (empData?.data ?? []).reduce((s: number, e: { basic: string | number; hra: string | number }) => s + Number(e.basic) + Number(e.hra), 0);

  return (
    <div className="space-y-6 animate-in">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-lg font-bold text-gray-900">Reports & Analytics</h2>
          <p className="text-xs text-gray-400">Business intelligence for {MONTHS[month - 1]} {year}</p>
        </div>
        <div className="flex items-center gap-2">
          <Select options={MONTHS.map((m, i) => ({ value: i + 1, label: m }))} value={month} onChange={e => setMonth(Number(e.target.value))} className="w-28" />
          <Select options={YEARS.map(y => ({ value: y, label: String(y) }))} value={year} onChange={e => setYear(Number(e.target.value))} className="w-24" />
          <Button variant="secondary" size="sm" icon={<Download className="w-4 h-4" />}>Export PDF</Button>
        </div>
      </div>

      {/* Financial Summary */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total Billed',    val: totalBilled,               color: 'text-blue-600',   icon: <DollarSign className="w-4 h-4" /> },
          { label: 'Total Collected', val: totalReceived,             color: 'text-green-600',  icon: <TrendingUp  className="w-4 h-4" /> },
          { label: 'Outstanding',     val: totalBilled - totalReceived,color: 'text-orange-600', icon: <TrendingDown className="w-4 h-4" /> },
          { label: 'Net Profit',      val: Number(plData?.net ?? 0),  color: Number(plData?.net ?? 0) >= 0 ? 'text-blue-600' : 'text-red-600', icon: <BarChart3 className="w-4 h-4" /> },
        ].map(s => (
          <div key={s.label} className="kpi-card">
            <div className="flex items-center justify-between">
              <p className="text-xs text-gray-500 uppercase tracking-wide">{s.label}</p>
              <span className={s.color}>{s.icon}</span>
            </div>
            <p className={`text-xl font-bold mt-2 ${s.color}`}>{fmtCurrency(s.val)}</p>
          </div>
        ))}
      </div>

      {/* Invoice Analysis */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card title="Invoice Status Breakdown">
          <div className="space-y-3 mt-2">
            {[
              { label: 'Paid',     count: paidCount,    color: 'bg-green-500',  pct: totalBilled > 0 ? paidCount / invoices.length * 100 : 0 },
              { label: 'Pending',  count: pendingCount, color: 'bg-yellow-500', pct: totalBilled > 0 ? pendingCount / invoices.length * 100 : 0 },
              { label: 'Overdue',  count: overdueCount, color: 'bg-red-500',    pct: totalBilled > 0 ? overdueCount / invoices.length * 100 : 0 },
            ].map(s => (
              <div key={s.label}>
                <div className="flex items-center justify-between text-sm mb-1">
                  <span className="text-gray-600">{s.label}</span>
                  <span className="font-medium">{s.count} invoices</span>
                </div>
                <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div className={`h-full ${s.color} rounded-full transition-all`} style={{ width: `${Math.min(100, s.pct)}%` }} />
                </div>
              </div>
            ))}
            <div className="pt-2 border-t border-gray-100 flex justify-between text-sm">
              <span className="text-gray-500">Collection Rate</span>
              <span className="font-bold text-blue-600">{collectionRate}%</span>
            </div>
          </div>
        </Card>

        <Card title="P&L Summary">
          <div className="space-y-3 mt-2">
            <div className="flex justify-between items-center py-2 border-b border-gray-100">
              <span className="text-sm text-gray-600">Total Income</span>
              <span className="font-semibold text-green-600">{fmtCurrency(Number(plData?.income ?? 0))}</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-gray-100">
              <span className="text-sm text-gray-600">Total Expenses</span>
              <span className="font-semibold text-red-600">{fmtCurrency(Number(plData?.expense ?? 0))}</span>
            </div>
            <div className="flex justify-between items-center py-2 bg-gray-50 rounded-lg px-3">
              <span className="text-sm font-semibold text-gray-800">Net Profit / Loss</span>
              <span className={`font-bold text-lg ${Number(plData?.net ?? 0) >= 0 ? 'text-blue-600' : 'text-red-600'}`}>
                {fmtCurrency(Number(plData?.net ?? 0))}
              </span>
            </div>
          </div>
        </Card>
      </div>

      {/* HR Summary */}
      <Card title="HR Summary">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-2">
          {[
            { label: 'Active Employees', val: activeEmp,              icon: <Users className="w-4 h-4 text-blue-500" /> },
            { label: 'PF Members',       val: pfEmployees,            icon: <Users className="w-4 h-4 text-green-500" /> },
            { label: 'Total CTC/Month',  val: fmtCurrency(totalPayroll), icon: <DollarSign className="w-4 h-4 text-purple-500" /> },
            { label: 'Avg. Salary',      val: activeEmp > 0 ? fmtCurrency(totalPayroll / activeEmp) : '—', icon: <TrendingUp className="w-4 h-4 text-orange-500" /> },
          ].map(s => (
            <div key={s.label} className="flex flex-col gap-1">
              <div className="flex items-center gap-2">{s.icon}<p className="text-xs text-gray-500">{s.label}</p></div>
              <p className="text-lg font-bold text-gray-800">{typeof s.val === 'number' ? s.val.toLocaleString('en-IN') : s.val}</p>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
