'use client';
import { StatsCard }   from '@/components/charts/StatsCard';
import { RevenueChart }from '@/components/charts/RevenueChart';
import { Card }        from '@/components/ui/Card';
import { StatusBadge } from '@/components/ui/Badge';
import { useDashboard }from '@/hooks/useDashboard';
import { fmtCurrency, fmtDate, truncate } from '@/lib/utils';
import {
  IndianRupee, TrendingUp, AlertCircle, Users, Building2,
  FileText, Wallet, Clock, ArrowRight, RefreshCw
} from 'lucide-react';
import Link from 'next/link';
import { useQueryClient } from '@tanstack/react-query';

export default function DashboardPage() {
  const { data, isLoading, isError, refetch, isFetching } = useDashboard();
  const qc = useQueryClient();

  const kpis = data?.kpis;

  return (
      <div className="space-y-6 animate-in">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-gray-900">CFO Dashboard</h2>
            <p className="text-xs text-gray-400 mt-0.5">
              {data?.as_of ? `Updated ${fmtDate(data.as_of, 'D MMM, h:mm A')}` : 'Real-time financial overview'}
            </p>
          </div>
          <button
            onClick={() => qc.invalidateQueries({ queryKey: ['dashboard'] })}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isFetching ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>

        {isError && (
          <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 flex items-center gap-2 text-sm text-red-700">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            Failed to load dashboard data. <button onClick={() => refetch()} className="underline ml-1">Retry</button>
          </div>
        )}

        {/* KPI Cards — Row 1: Revenue */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatsCard
            title="Revenue (This Month)" color="blue" isCurrency loading={isLoading}
            value={kpis?.revenue.value ?? 0}
            growth_pct={kpis?.revenue.growth_pct}
            icon={<IndianRupee className="w-4 h-4" />}
          />
          <StatsCard
            title="Collected" color="green" isCurrency loading={isLoading}
            value={kpis?.collected.value ?? 0}
            icon={<Wallet className="w-4 h-4" />}
          />
          <StatsCard
            title="Outstanding" color="orange" isCurrency loading={isLoading}
            value={kpis?.outstanding.value ?? 0}
            icon={<Clock className="w-4 h-4" />}
          />
          <StatsCard
            title="Net Profit" color="indigo" isCurrency loading={isLoading}
            value={kpis?.profit.value ?? 0}
            icon={<TrendingUp className="w-4 h-4" />}
          />
        </div>

        {/* KPI Cards — Row 2: Operations */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
          <StatsCard title="Invoices"      color="blue"   loading={isLoading} value={kpis?.invoices_count.value ?? 0} icon={<FileText className="w-4 h-4" />} />
          <StatsCard title="Expenses"      color="red"    loading={isLoading} isCurrency value={kpis?.expenses.value ?? 0} icon={<Wallet className="w-4 h-4" />} />
          <StatsCard title="Employees"     color="purple" loading={isLoading} value={kpis?.employees.value ?? 0} icon={<Users className="w-4 h-4" />} />
          <StatsCard title="Clients"       color="indigo" loading={isLoading} value={kpis?.clients.value ?? 0} icon={<Building2 className="w-4 h-4" />} />
          <StatsCard title="Pending Leaves"color="orange" loading={isLoading} value={kpis?.pending_leaves.value ?? 0} icon={<Clock className="w-4 h-4" />} />
        </div>

        {/* Charts + Overdue */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Revenue Chart */}
          <div className="lg:col-span-2">
            <Card title="Revenue vs Collections — Last 6 Months" actions={
              <select className="text-xs border border-gray-200 rounded-lg px-2 py-1 text-gray-600">
                <option>Area Chart</option>
                <option>Bar Chart</option>
              </select>
            } noPad>
              <div className="p-5">
                <RevenueChart data={data?.charts.monthly_revenue ?? []} loading={isLoading} />
              </div>
            </Card>
          </div>

          {/* Overdue Invoices */}
          <Card title="Overdue Invoices" actions={
            <Link href="/invoices?status=overdue" className="text-xs text-blue-600 hover:underline flex items-center gap-1">
              View all <ArrowRight className="w-3 h-3" />
            </Link>
          } noPad>
            <div className="divide-y divide-gray-100">
              {isLoading ? (
                <div className="py-8 flex justify-center">
                  <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                </div>
              ) : !data?.overdue_invoices?.length ? (
                <div className="py-8 text-center text-sm text-gray-400">
                  <span className="text-2xl block mb-1">✅</span>
                  No overdue invoices
                </div>
              ) : (
                data.overdue_invoices.map(inv => (
                  <Link key={inv.id} href={`/invoices?id=${inv.id}`}
                    className="flex items-center justify-between px-5 py-3 hover:bg-red-50/50 transition-colors">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-gray-800 truncate">{truncate(inv.client_name, 22)}</p>
                      <p className="text-xs text-gray-400">{inv.inv_no} · Due {fmtDate(inv.due_date)}</p>
                    </div>
                    <p className="text-sm font-bold text-red-600 flex-shrink-0 ml-2">
                      {fmtCurrency(parseFloat(inv.outstanding as unknown as string))}
                    </p>
                  </Link>
                ))
              )}
            </div>
          </Card>
        </div>

        {/* Recent Invoices */}
        <Card title="Recent Invoices" actions={
          <Link href="/invoices" className="text-xs text-blue-600 hover:underline flex items-center gap-1">
            View all <ArrowRight className="w-3 h-3" />
          </Link>
        } noPad>
          <div className="overflow-x-auto scrollbar-thin">
            <table className="table-auto w-full min-w-[600px]">
              <thead>
                <tr>
                  <th>Invoice No</th><th>Client</th><th>Date</th>
                  <th className="text-right">Amount</th><th>Status</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr><td colSpan={5} className="py-8 text-center">
                    <div className="flex justify-center"><div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" /></div>
                  </td></tr>
                ) : !data?.recent_invoices?.length ? (
                  <tr><td colSpan={5} className="py-8 text-center text-sm text-gray-400">No invoices yet</td></tr>
                ) : (
                  data.recent_invoices.map(inv => (
                    <tr key={inv.id}>
                      <td>
                        <Link href={`/invoices?id=${inv.id}`} className="text-blue-600 hover:underline font-mono text-xs">
                          {inv.inv_no}
                        </Link>
                      </td>
                      <td><span className="font-medium">{truncate(inv.client_name, 28)}</span></td>
                      <td className="text-gray-500 text-xs">{fmtDate(inv.inv_date)}</td>
                      <td className="text-right font-semibold">{fmtCurrency(parseFloat(inv.total as unknown as string))}</td>
                      <td><StatusBadge status={inv.status} /></td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
  );
}
