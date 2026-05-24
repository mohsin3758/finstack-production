'use client';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend, BarChart, Bar
} from 'recharts';
import { fmtCurrency } from '@/lib/utils';

interface DataPoint { month: string; revenue: number; collected: number; }
interface RevenueChartProps { data: DataPoint[]; loading?: boolean; type?: 'area' | 'bar'; }

function fmtYAxis(v: number) {
  if (v >= 10000000) return `₹${(v/10000000).toFixed(1)}Cr`;
  if (v >= 100000)   return `₹${(v/100000).toFixed(1)}L`;
  if (v >= 1000)     return `₹${(v/1000).toFixed(0)}K`;
  return `₹${v}`;
}

const CustomTooltip = ({ active, payload, label }: { active?: boolean; payload?: unknown[]; label?: string }) => {
  if (!active || !payload?.length) return null;
  const p = payload as Array<{ name: string; value: number; color: string }>;
  return (
    <div className="bg-white border border-gray-200 rounded-xl shadow-lg px-4 py-3 text-sm">
      <p className="font-semibold text-gray-700 mb-2">{label}</p>
      {p.map(entry => (
        <div key={entry.name} className="flex items-center gap-2 py-0.5">
          <div className="w-2.5 h-2.5 rounded-full" style={{ background: entry.color }} />
          <span className="text-gray-500 capitalize">{entry.name}:</span>
          <span className="font-semibold text-gray-800">{fmtCurrency(entry.value)}</span>
        </div>
      ))}
    </div>
  );
};

export function RevenueChart({ data, loading, type = 'area' }: RevenueChartProps) {
  if (loading) {
    return (
      <div className="h-64 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }
  if (!data?.length) {
    return (
      <div className="h-64 flex items-center justify-center text-gray-400 text-sm">
        No data available
      </div>
    );
  }

  const formattedData = data.map(d => ({
    ...d,
    revenue:   Number(d.revenue),
    collected: Number(d.collected),
  }));

  return (
    <ResponsiveContainer width="100%" height={260}>
      {type === 'area' ? (
        <AreaChart data={formattedData} margin={{ top: 5, right: 10, left: 10, bottom: 0 }}>
          <defs>
            <linearGradient id="gRevenue"  x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%"  stopColor="#3b82f6" stopOpacity={0.15}/>
              <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
            </linearGradient>
            <linearGradient id="gCollected" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%"  stopColor="#22c55e" stopOpacity={0.15}/>
              <stop offset="95%" stopColor="#22c55e" stopOpacity={0}/>
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
          <XAxis dataKey="month" tick={{ fontSize: 12, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
          <YAxis tickFormatter={fmtYAxis} tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
          <Tooltip content={<CustomTooltip />} />
          <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: '12px' }} />
          <Area type="monotone" dataKey="revenue"   name="Revenue"   stroke="#3b82f6" fill="url(#gRevenue)"   strokeWidth={2} dot={false} />
          <Area type="monotone" dataKey="collected" name="Collected" stroke="#22c55e" fill="url(#gCollected)" strokeWidth={2} dot={false} />
        </AreaChart>
      ) : (
        <BarChart data={formattedData} margin={{ top: 5, right: 10, left: 10, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
          <XAxis dataKey="month" tick={{ fontSize: 12, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
          <YAxis tickFormatter={fmtYAxis} tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
          <Tooltip content={<CustomTooltip />} />
          <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: '12px' }} />
          <Bar dataKey="revenue"   name="Revenue"   fill="#3b82f6" radius={[4,4,0,0]} />
          <Bar dataKey="collected" name="Collected" fill="#22c55e" radius={[4,4,0,0]} />
        </BarChart>
      )}
    </ResponsiveContainer>
  );
}
