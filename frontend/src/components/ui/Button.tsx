'use client';
// ── Spinner ──────────────────────────────────────────────────────────────
import { cn } from '@/lib/utils';

interface SpinnerProps { size?: 'sm' | 'md' | 'lg'; className?: string; }
export function Spinner({ size = 'md', className }: SpinnerProps) {
  const sz = { sm: 'w-4 h-4 border-2', md: 'w-6 h-6 border-2', lg: 'w-10 h-10 border-4' }[size];
  return (
    <div className={cn('rounded-full border-blue-600 border-t-transparent animate-spin', sz, className)} />
  );
}

// ── Button ────────────────────────────────────────────────────────────────
import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?:  'primary' | 'secondary' | 'danger' | 'ghost' | 'outline';
  size?:     'xs' | 'sm' | 'md' | 'lg';
  loading?:  boolean;
  icon?:     React.ReactNode;
  iconRight?: boolean;
}

const variantCls: Record<string, string> = {
  primary:   'bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500 shadow-sm',
  secondary: 'bg-gray-100 text-gray-700 hover:bg-gray-200 focus:ring-gray-400',
  danger:    'bg-red-600 text-white hover:bg-red-700 focus:ring-red-500 shadow-sm',
  ghost:     'bg-transparent text-gray-600 hover:bg-gray-100 focus:ring-gray-400',
  outline:   'border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 focus:ring-blue-500 shadow-sm',
};
const sizeCls: Record<string, string> = {
  xs: 'px-2 py-1 text-xs rounded-md gap-1',
  sm: 'px-3 py-1.5 text-sm rounded-lg gap-1.5',
  md: 'px-4 py-2 text-sm rounded-lg gap-2',
  lg: 'px-5 py-2.5 text-base rounded-xl gap-2',
};

export function Button({
  variant = 'primary', size = 'md', loading, icon, iconRight, children, disabled, className, ...props
}: ButtonProps) {
  const isDisabled = disabled || loading;
  return (
    <button
      {...props}
      disabled={isDisabled}
      className={cn(
        'inline-flex items-center justify-center font-medium focus:outline-none focus:ring-2 focus:ring-offset-1',
        'transition-all duration-150 select-none',
        'disabled:opacity-50 disabled:cursor-not-allowed',
        variantCls[variant], sizeCls[size], className
      )}
    >
      {loading ? (
        <Spinner size="sm" className="border-current border-t-transparent" />
      ) : (
        !iconRight && icon && <span className="flex-shrink-0">{icon}</span>
      )}
      {children && <span>{children}</span>}
      {!loading && iconRight && icon && <span className="flex-shrink-0">{icon}</span>}
    </button>
  );
}

// ── Badge ─────────────────────────────────────────────────────────────────
interface BadgeProps { label: string; className?: string; dot?: boolean; }
export function Badge({ label, className, dot }: BadgeProps) {
  return (
    <span className={cn(
      'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border',
      className
    )}>
      {dot && <span className="w-1.5 h-1.5 rounded-full bg-current opacity-70" />}
      {label}
    </span>
  );
}

// ── StatusBadge ───────────────────────────────────────────────────────────
import { statusColor } from '@/lib/utils';
export function StatusBadge({ status }: { status: string }) {
  return (
    <Badge
      label={status.charAt(0).toUpperCase() + status.slice(1)}
      className={statusColor(status)}
    />
  );
}

// ── Card ──────────────────────────────────────────────────────────────────
interface CardProps {
  children: React.ReactNode;
  className?: string;
  title?: string;
  actions?: React.ReactNode;
  noPad?: boolean;
}
export function Card({ children, className, title, actions, noPad }: CardProps) {
  return (
    <div className={cn('card', className)}>
      {(title || actions) && (
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          {title && <h3 className="text-sm font-semibold text-gray-900">{title}</h3>}
          {actions && <div className="flex items-center gap-2">{actions}</div>}
        </div>
      )}
      <div className={noPad ? '' : 'p-5'}>{children}</div>
    </div>
  );
}

// ── Empty state ───────────────────────────────────────────────────────────
interface EmptyProps { icon?: React.ReactNode; title: string; description?: string; action?: React.ReactNode; }
export function Empty({ icon, title, description, action }: EmptyProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      {icon && <div className="text-4xl mb-4 text-gray-300">{icon}</div>}
      <p className="text-sm font-semibold text-gray-500">{title}</p>
      {description && <p className="text-xs text-gray-400 mt-1 max-w-xs">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
