'use client';
// ── payroll/page.tsx ──────────────────────────────────────────────────────
import { useState } from 'react';
import { Card }   from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Select } from '@/components/ui/Input';
import { Table, type Column } from '@/components/ui/Table';
import { useEmployees, useProcessPayroll } from '@/hooks/useEmployees';
import { useExportBankFile } from '@/hooks/usePayroll';
import { fmtCurrency, MONTHS, YEARS } from '@/lib/utils';
import { Play, Download } from 'lucide-react';
import type { Employee } from '@/types';
import toast from 'react-hot-toast';

interface PayrollRow {
  employee_id: string;
  name:        string;
  basic:       number;
  present_days:number;
  working_days:number;
  advance:     number;
  pf_enrolled: 0 | 1;
  esi_enrolled:0 | 1;
}

export default function PayrollPage() {
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year,  setYear]  = useState(now.getFullYear());
  const [rows,  setRows]  = useState<Record<string, Partial<PayrollRow>>>({});

  const { data: empData, isLoading } = useEmployees({ status: 'active', limit: 100 });
  const processMut  = useProcessPayroll();
  const exportMut   = useExportBankFile();

  const employees = (empData?.data ?? []) as Employee[];

  function updateRow(id: string, field: keyof PayrollRow, value: number) {
    setRows(prev => ({ ...prev, [id]: { ...prev[id], [field]: value } }));
  }

  async function runPayroll() {
    if (!employees.length) { toast.error('No active employees'); return; }
    const payload = employees.map(emp => ({
      employee_id:  emp.id,
      present_days: rows[emp.id]?.present_days ?? 26,
      working_days: rows[emp.id]?.working_days ?? 26,
      advance:      rows[emp.id]?.advance      ?? 0,
    }));
    await processMut.mutateAsync({ month, year, employees: payload });
  }

  const columns: Column<Employee>[] = [
    { key:'name', header:'Employee', render:r=><div><p className="font-medium text-sm">{r.name}</p><p className="text-xs text-gray-400">{r.code} · {r.designation}</p></div> },
    { key:'basic', header:'Basic', align:'right', render:r=><span className="font-mono text-sm">{fmtCurrency(Number(r.basic))}</span> },
    {
      key:'present', header:'Present Days',
      render: r => (
        <input type="number" min={0} max={31} step={0.5}
          defaultValue={26}
          onChange={e => updateRow(r.id, 'present_days', parseFloat(e.target.value))}
          className="w-20 input-base text-center text-sm py-1 px-2"
        />
      )
    },
    {
      key:'advance', header:'Advance Deduction',
      render: r => (
        <input type="number" min={0}
          defaultValue={0}
          onChange={e => updateRow(r.id, 'advance', parseFloat(e.target.value))}
          className="w-28 input-base text-sm py-1 px-2"
          placeholder="₹0"
        />
      )
    },
    {
      key:'pf', header:'PF/ESI',
      render: r => (
        <div className="flex gap-1">
          {r.pf_enrolled ? <span className="text-xs bg-green-50 text-green-700 px-1.5 py-0.5 rounded">PF</span> : null}
          {r.esi_enrolled ? <span className="text-xs bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded">ESI</span> : null}
        </div>
      )
    },
  ];

  return (
      <div className="space-y-5 animate-in">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h2 className="text-lg font-bold text-gray-900">Monthly Payroll</h2>
            <p className="text-xs text-gray-400">PF · ESI · PT · TDS — India compliant calculations</p>
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            <Select options={MONTHS.map((m,i)=>({value:i+1,label:m}))} value={month} onChange={e=>setMonth(Number(e.target.value))} className="w-32" />
            <Select options={YEARS.map(y=>({value:y,label:String(y)}))} value={year} onChange={e=>setYear(Number(e.target.value))} className="w-28" />
            <Button variant="secondary" icon={<Download className="w-4 h-4" />} size="sm"
              onClick={() => exportMut.mutate({ month, year })}
              loading={exportMut.isPending}
            >Bank File</Button>
            <Button variant="primary" icon={<Play className="w-4 h-4" />} onClick={runPayroll} loading={processMut.isPending}>
              Run Payroll
            </Button>
          </div>
        </div>

        <div className="bg-blue-50 border border-blue-100 rounded-xl px-4 py-3 text-sm text-blue-700">
          <strong>Payroll period:</strong> {MONTHS[month-1]} {year} ·
          PF = 12% (employee) + 12% employer (ceiling ₹15,000) ·
          ESI = 0.75% + 3.25% (≤₹21,000 gross) ·
          PT = ₹200/month (Karnataka)
        </div>

        <Card noPad>
          <div className="px-5 py-3 border-b border-gray-100 text-sm font-medium text-gray-500">
            {employees.length} active employees — edit present days and advance before running payroll
          </div>
          <Table
            columns={columns}
            data={employees}
            loading={isLoading}
            rowKey={r => r.id}
            emptyTitle="No active employees"
            emptyDesc="Add employees first"
          />
        </Card>
      </div>
  );
}
