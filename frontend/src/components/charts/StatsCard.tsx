'use client';
import React from 'react';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { cn, fmtCurrency, growthColor } from '@/lib/utils';
import { Spinner } from '@/components/ui/Spinner';

interface StatsCardProps {
  title:      string;
  value:      number | string;
  icon?:      React.ReactNode;
  isCurrency?:boolean;
  growth_pct?:number;
  subtitle?:  string;
  color?:     'blue' | 'green' | 'orange' | 'red' | 'purple' | 'indigo';
  loading?:   boolean;
  onClick?:   () => void;
}

const colorMap: Record<string, { bg: string; icon: string; text: string }> = {
  blue:   { bg: 'bg-blue-50',   icon: 'text-blue-600',   text: 'text-blue-700' },
  green:  { bg: 'bg-green-50',  icon: 'text-green-600',  text: 'text-green-700' },
  orange: { bg: 'bg-orange-50', icon: 'text-orange-600', text: 'text-orange-700' },
  red:    { bg: 'bg-red-50',    icon: 'text-red-600',    text: 'text-red-700' },
  purple: { bg: 'bg-purple-50', icon: 'text-purple-600', text: 'text-purple-700' },
  indigo: { bg: 'bg-indigo-50', icon: 'text-indigo-600', text: 'text-indigo-700' },
};

export function StatsCard({
  title, value, icon, isCurrency, growth_pct, subtitle, color = 'blue', loading, onClick
}: StatsCardProps) {
  const c    = colorMap[color];
  const isUp = (growth_pct ?? 0) > 0;
  const isDn = (growth_pct ?? 0) < 0;

  const displayValue = loading
    ? '—'
    : isCurrency
      ? fmtCurrency(Number(value))
      : typeof value === 'number'
        ? value.toLocaleString('en-IN')
        : value;

  return (
    <div
      className={cn('kpi-card', onClick && 'cursor-pointer hover:shadow-md transition-shadow')}
      onClick={onClick}
    >
      <div className="flex items-start justify-between">
        <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">{title}</p>
        {icon && (
          <div className={cn('p-2 rounded-lg flex-shrink-0', c.bg)}>
            <span className={cn('w-4 h-4', c.icon)}>{icon}</span>
          </div>
        )}
      </div>

      <div className="mt-2">
        {loading ? (
          <Spinner size="sm" />
        ) : (
          <p className={cn('text-2xl font-bold tracking-tight', c.text)}>{displayValue}</p>
        )}
      </div>

      {(growth_pct !== undefined || subtitle) && (
        <div className="mt-2 flex items-center gap-1.5">
          {growth_pct !== undefined && !loading && (
            <>
              {isUp ? <TrendingUp  className="w-3.5 h-3.5 text-green-500" />
               : isDn ? <TrendingDown className="w-3.5 h-3.5 text-red-500" />
               : <Minus className="w-3.5 h-3.5 text-gray-400" />}
              <span className={cn('text-xs font-medium', isUp ? 'text-green-600' : isDn ? 'text-red-600' : 'text-gray-400')}>
                {isUp ? '+' : ''}{growth_pct.toFixed(1)}%
              </span>
              <span className="text-xs text-gray-400">vs last month</span>
            </>
          )}
          {subtitle && <span className="text-xs text-gray-400">{subtitle}</span>}
        </div>
      )}
    </div>
  );
}
