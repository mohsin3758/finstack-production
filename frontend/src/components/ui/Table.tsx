'use client';
import React from 'react';
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, ChevronUp, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Spinner } from './Button';
import { Empty } from './Button';
import { Button } from './Button';

// ── Column definition ─────────────────────────────────────────────────────
export interface Column<T> {
  key:       string;
  header:    string;
  render?:   (row: T, idx: number) => React.ReactNode;
  sortable?: boolean;
  width?:    string;
  align?:    'left' | 'center' | 'right';
  className?: string;
}

// ── Table props ───────────────────────────────────────────────────────────
interface TableProps<T> {
  columns:    Column<T>[];
  data:       T[];
  loading?:   boolean;
  rowKey:     (row: T) => string;
  onRowClick?:(row: T) => void;
  emptyTitle?:string;
  emptyDesc?: string;
  // Pagination
  page?:      number;
  pages?:     number;
  total?:     number;
  limit?:     number;
  onPageChange?:(p: number) => void;
  // Sorting
  sortKey?:   string;
  sortOrder?: 'ASC' | 'DESC';
  onSort?:    (key: string) => void;
  // Selection
  selectable?: boolean;
  selected?:   Set<string>;
  onSelect?:   (keys: Set<string>) => void;
  className?: string;
}

export function Table<T>({
  columns, data, loading, rowKey, onRowClick,
  emptyTitle = 'No records found', emptyDesc,
  page = 1, pages = 1, total = 0, limit = 25, onPageChange,
  sortKey, sortOrder, onSort,
  selectable, selected = new Set(), onSelect,
  className,
}: TableProps<T>) {
  const allSelected = data.length > 0 && data.every(r => selected.has(rowKey(r)));

  function toggleAll() {
    if (!onSelect) return;
    if (allSelected) onSelect(new Set());
    else onSelect(new Set(data.map(rowKey)));
  }
  function toggleRow(key: string) {
    if (!onSelect) return;
    const next = new Set(selected);
    next.has(key) ? next.delete(key) : next.add(key);
    onSelect(next);
  }

  return (
    <div className={cn('flex flex-col', className)}>
      {/* Table */}
      <div className="overflow-x-auto scrollbar-thin rounded-t-xl">
        <table className="table-auto w-full">
          <thead>
            <tr>
              {selectable && (
                <th className="px-4 py-3 bg-gray-50 border-b border-gray-200 w-10">
                  <input type="checkbox" checked={allSelected} onChange={toggleAll}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500" />
                </th>
              )}
              {columns.map(col => (
                <th
                  key={col.key}
                  style={{ width: col.width }}
                  className={cn(
                    col.sortable && 'cursor-pointer select-none hover:bg-gray-100',
                    col.align === 'right'  && 'text-right',
                    col.align === 'center' && 'text-center',
                    col.className
                  )}
                  onClick={() => col.sortable && onSort?.(col.key)}
                >
                  <span className="inline-flex items-center gap-1">
                    {col.header}
                    {col.sortable && (
                      <span className="text-gray-400">
                        {sortKey === col.key
                          ? sortOrder === 'ASC' ? <ChevronUp className="w-3 h-3 text-blue-600" /> : <ChevronDown className="w-3 h-3 text-blue-600" />
                          : <ChevronUp className="w-3 h-3 opacity-0 group-hover:opacity-40" />}
                      </span>
                    )}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={columns.length + (selectable ? 1 : 0)} className="py-20">
                  <div className="flex justify-center"><Spinner size="lg" /></div>
                </td>
              </tr>
            ) : data.length === 0 ? (
              <tr>
                <td colSpan={columns.length + (selectable ? 1 : 0)}>
                  <Empty title={emptyTitle} description={emptyDesc} />
                </td>
              </tr>
            ) : (
              data.map((row, idx) => {
                const key = rowKey(row);
                return (
                  <tr
                    key={key}
                    onClick={() => onRowClick?.(row)}
                    className={cn(onRowClick && 'cursor-pointer')}
                  >
                    {selectable && (
                      <td onClick={e => e.stopPropagation()}>
                        <input type="checkbox" checked={selected.has(key)} onChange={() => toggleRow(key)}
                          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500" />
                      </td>
                    )}
                    {columns.map(col => (
                      <td
                        key={col.key}
                        className={cn(
                          col.align === 'right'  && 'text-right',
                          col.align === 'center' && 'text-center',
                          col.className
                        )}
                      >
                        {col.render ? col.render(row, idx) : (row as Record<string, unknown>)[col.key] as React.ReactNode}
                      </td>
                    ))}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {onPageChange && pages > 1 && (
        <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200 bg-gray-50 rounded-b-xl text-sm">
          <span className="text-gray-500 text-xs">
            Showing {Math.min((page - 1) * limit + 1, total)}–{Math.min(page * limit, total)} of {total}
          </span>
          <div className="flex items-center gap-1">
            <button onClick={() => onPageChange(1)} disabled={page === 1}
              className="p-1.5 rounded hover:bg-gray-200 disabled:opacity-40 disabled:cursor-not-allowed">
              <ChevronsLeft className="w-4 h-4" />
            </button>
            <button onClick={() => onPageChange(page - 1)} disabled={page === 1}
              className="p-1.5 rounded hover:bg-gray-200 disabled:opacity-40 disabled:cursor-not-allowed">
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="px-3 py-1 text-xs font-medium text-gray-700">
              {page} / {pages}
            </span>
            <button onClick={() => onPageChange(page + 1)} disabled={page >= pages}
              className="p-1.5 rounded hover:bg-gray-200 disabled:opacity-40 disabled:cursor-not-allowed">
              <ChevronRight className="w-4 h-4" />
            </button>
            <button onClick={() => onPageChange(pages)} disabled={page >= pages}
              className="p-1.5 rounded hover:bg-gray-200 disabled:opacity-40 disabled:cursor-not-allowed">
              <ChevronsRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
