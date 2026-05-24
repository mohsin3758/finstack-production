import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import dayjs from 'dayjs';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function fmtCurrency(amount: number | string, decimals = 2): string {
  const n = typeof amount === 'string' ? parseFloat(amount) : amount;
  if (isNaN(n)) return '₹0';
  return '₹' + n.toLocaleString('en-IN', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
}

export function fmtDate(date: string | null | undefined, format = 'DD MMM YYYY'): string {
  if (!date) return '—';
  return dayjs(date).format(format);
}

export function fmtMonthYear(month: number, year: number): string {
  const names = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  return `${names[month - 1]} ${year}`;
}

export function statusColor(status: string): string {
  const map: Record<string, string> = {
    paid:      'text-green-700 bg-green-50 border-green-200',
    partial:   'text-blue-700 bg-blue-50 border-blue-200',
    pending:   'text-yellow-700 bg-yellow-50 border-yellow-200',
    sent:      'text-indigo-700 bg-indigo-50 border-indigo-200',
    overdue:   'text-red-700 bg-red-50 border-red-200',
    cancelled: 'text-gray-500 bg-gray-50 border-gray-200',
    hold:      'text-orange-700 bg-orange-50 border-orange-200',
    draft:     'text-gray-600 bg-gray-50 border-gray-200',
    active:    'text-green-700 bg-green-50 border-green-200',
    inactive:  'text-gray-500 bg-gray-50 border-gray-200',
    approved:  'text-green-700 bg-green-50 border-green-200',
    rejected:  'text-red-700 bg-red-50 border-red-200',
    notice:    'text-orange-700 bg-orange-50 border-orange-200',
    processed: 'text-blue-700 bg-blue-50 border-blue-200',
  };
  return map[status] || 'text-gray-600 bg-gray-50 border-gray-200';
}

export function growthArrow(pct: number): string {
  return pct > 0 ? '▲' : pct < 0 ? '▼' : '—';
}

export function growthColor(pct: number): string {
  return pct > 0 ? 'text-green-600' : pct < 0 ? 'text-red-600' : 'text-gray-500';
}

export function truncate(str: string, n = 40): string {
  return str.length > n ? str.slice(0, n - 1) + '…' : str;
}

export function getInitials(name: string): string {
  return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
}

export const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
export const CURRENT_YEAR = new Date().getFullYear();
export const YEARS = Array.from({ length: 5 }, (_, i) => CURRENT_YEAR - i);
