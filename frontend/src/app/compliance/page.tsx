'use client';
import { useState } from 'react';
import { Card }   from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Select } from '@/components/ui/Input';
import { useQuery } from '@tanstack/react-query';
import { invoicesApi } from '@/services/api';
import { fmtCurrency, MONTHS, YEARS } from '@/lib/utils';
import { Download, CheckCircle, AlertCircle } from 'lucide-react';

export default function CompliancePage() {
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year,  setYear]  = useState(now.getFullYear());

  const { data: gstr1, isLoading, refetch } = useQuery({
    queryKey: ['gstr1', { month, year }],
    queryFn:  async () => { const r = await invoicesApi.gstr1({ month, year }); return r.data.data; },
  });

  function downloadGSTR1() {
    const json = JSON.stringify(gstr1, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href = url; a.download = `GSTR1_${month}_${year}.json`; a.click();
    URL.revokeObjectURL(url);
  }

  const b2bCount = gstr1?.b2b?.length ?? 0;
  const b2cCount = gstr1?.b2cs?.length ?? 0;
  const totalB2B = gstr1?.b2b?.reduce((s: number, b: { inv: Array<{ val: number }> }) => s + b.inv.reduce((ss: number, i) => ss + i.val, 0), 0) ?? 0;

  return (
      <div className="space-y-5 animate-in">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h2 className="text-lg font-bold text-gray-900">GST Compliance</h2>
            <p className="text-xs text-gray-400">GSTR-1 · GSTR-3B · TDS · Form 26Q</p>
          </div>
          <div className="flex items-center gap-2">
            <Select options={MONTHS.map((m,i)=>({value:i+1,label:m}))} value={month} onChange={e=>setMonth(Number(e.target.value))} className="w-28" />
            <Select options={YEARS.map(y=>({value:y,label:String(y)}))} value={year} onChange={e=>setYear(Number(e.target.value))} className="w-24" />
            <Button variant="secondary" onClick={() => refetch()}>Refresh</Button>
            <Button variant="primary" icon={<Download className="w-4 h-4" />} onClick={downloadGSTR1}>Export GSTR-1</Button>
          </div>
        </div>

        {/* GSTIN Info */}
        <Card>
          <div className="flex items-center gap-4">
            <CheckCircle className="w-8 h-8 text-green-500 flex-shrink-0" />
            <div>
              <p className="font-semibold text-gray-800">GSTIN: {gstr1?.gstin || 'Not configured'}</p>
              <p className="text-sm text-gray-500">Period: {MONTHS[month-1]} {year} · GST Filing Period</p>
            </div>
          </div>
        </Card>

        {/* GSTR-1 Summary */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label:'B2B Invoices',  val: String(b2bCount),          unit:'invoices' },
            { label:'B2B Revenue',   val: fmtCurrency(totalB2B),      unit:'' },
            { label:'B2CS Sales',    val: String(b2cCount),           unit:'entries' },
            { label:'Filing Status', val: 'Draft',                    unit:'' },
          ].map(s => (
            <div key={s.label} className="kpi-card">
              <p className="text-xs text-gray-500 uppercase tracking-wide">{s.label}</p>
              <p className="text-xl font-bold text-gray-800 mt-1">{s.val}</p>
              {s.unit && <p className="text-xs text-gray-400">{s.unit}</p>}
            </div>
          ))}
        </div>

        {/* B2B Table */}
        <Card title="B2B Invoices (GSTIN-registered clients)" noPad>
          <div className="overflow-x-auto scrollbar-thin">
            <table className="table-auto w-full min-w-[600px]">
              <thead><tr><th>Client GSTIN</th><th>Invoice No</th><th>Date</th><th>Place of Supply</th><th className="text-right">Value</th><th className="text-right">IGST</th></tr></thead>
              <tbody>
                {isLoading ? (
                  <tr><td colSpan={6} className="py-8 text-center text-gray-400 text-sm">Loading…</td></tr>
                ) : !gstr1?.b2b?.length ? (
                  <tr><td colSpan={6} className="py-8 text-center text-gray-400 text-sm">No B2B invoices for this period</td></tr>
                ) : (
                  gstr1.b2b.map((b: { ctin: string; inv: Array<{ inum: string; idt: string; pos: string; val: number; itms: Array<{ itm_det: { iamt: number } }> }> }) =>
                    b.inv.map((inv, i) => (
                      <tr key={`${b.ctin}-${i}`}>
                        <td className="font-mono text-xs text-blue-600">{b.ctin}</td>
                        <td className="font-mono text-xs">{inv.inum}</td>
                        <td className="text-xs text-gray-500">{inv.idt}</td>
                        <td className="text-xs">{inv.pos}</td>
                        <td className="text-right font-medium">{fmtCurrency(inv.val)}</td>
                        <td className="text-right text-sm">{fmtCurrency(inv.itms?.[0]?.itm_det?.iamt ?? 0)}</td>
                      </tr>
                    ))
                  )
                )}
              </tbody>
            </table>
          </div>
        </Card>

        {/* TDS Reminder */}
        <Card>
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-orange-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-gray-800 text-sm">TDS Deposit Reminder</p>
              <p className="text-sm text-gray-500 mt-1">
                TDS for {MONTHS[month-1]} {year} must be deposited by the <strong>7th of the following month</strong>.
                Use Challan ITNS 281 at any authorised bank or <a href="https://tin.tin.nsdl.com" target="_blank" rel="noopener noreferrer" className="text-blue-600 underline">online via NSDL</a>.
              </p>
            </div>
          </div>
        </Card>
      </div>
  );
}
