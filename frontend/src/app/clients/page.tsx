'use client';
import { useState } from 'react';
import { Card }   from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { SearchInput, Input, Select } from '@/components/ui/Input';
import { Table, type Column } from '@/components/ui/Table';
import { Modal, ConfirmDialog } from '@/components/ui/Modal';
import { useClients, useCreateClient, useUpdateClient, useDeleteClient } from '@/hooks/useClients';
import { truncate } from '@/lib/utils';
import { Plus, Edit2, Trash2, Building2 } from 'lucide-react';
import type { Client } from '@/types';
import { useForm } from 'react-hook-form';

export default function ClientsPage() {
  const [page, setPage]     = useState(1);
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editClient, setEdit]   = useState<Client | null>(null);
  const [delClient, setDel]     = useState<Client | null>(null);

  const { data, isLoading, refetch } = useClients({ page, search, limit: 50 });
  const createMut = useCreateClient();
  const updateMut = useUpdateClient();
  const deleteMut = useDeleteClient();

  const { register, handleSubmit, reset, watch } = useForm<Partial<Client>>();

  function openCreate() { reset({ supply_type: 'inter', gst_rate: 18, payment_terms: 30, hsn_code: '998519' }); setEdit(null); setShowForm(true); }
  function openEdit(c: Client) { reset(c); setEdit(c); setShowForm(true); }

  async function onSubmit(data: Partial<Client>) {
    try {
      if (editClient) await updateMut.mutateAsync({ id: editClient.id, data });
      else            await createMut.mutateAsync(data);
      setShowForm(false);
    } catch {}
  }

  const columns: Column<Client>[] = [
    {
      key: 'name', header: 'Client',
      render: r => (
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-indigo-100 flex items-center justify-center flex-shrink-0">
            <Building2 className="w-4 h-4 text-indigo-600" />
          </div>
          <div>
            <p className="font-medium text-sm text-gray-800">{truncate(r.name, 28)}</p>
            <p className="text-xs text-gray-400 font-mono">{r.gstin || 'No GSTIN'}</p>
          </div>
        </div>
      )
    },
    { key: 'contact_person', header: 'Contact', render: r => <span className="text-sm text-gray-600">{r.contact_person || '—'}</span> },
    { key: 'city',          header: 'Location', render: r => <span className="text-sm text-gray-500">{[r.city, r.state].filter(Boolean).join(', ') || '—'}</span> },
    {
      key: 'supply_type', header: 'Supply',
      render: r => (
        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${r.supply_type === 'inter' ? 'bg-blue-50 text-blue-700' : 'bg-green-50 text-green-700'}`}>
          {r.supply_type === 'inter' ? 'IGST' : 'CGST+SGST'}
        </span>
      )
    },
    { key: 'gst_rate',      header: 'GST Rate', align: 'right', render: r => <span className="text-sm font-medium">{r.gst_rate}%</span> },
    { key: 'payment_terms', header: 'Terms',    align: 'right', render: r => <span className="text-sm text-gray-500">{r.payment_terms} days</span> },
    {
      key: 'actions', header: '', align: 'right', width: '80px',
      render: r => (
        <div className="flex items-center justify-end gap-1">
          <button onClick={() => openEdit(r)} className="p-1.5 rounded hover:bg-blue-50 text-gray-400 hover:text-blue-600"><Edit2 className="w-3.5 h-3.5" /></button>
          <button onClick={() => setDel(r)}   className="p-1.5 rounded hover:bg-red-50  text-gray-400 hover:text-red-600"><Trash2 className="w-3.5 h-3.5" /></button>
        </div>
      )
    },
  ];

  return (
    <>
      <div className="space-y-5 animate-in">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-gray-900">Clients</h2>
            <p className="text-xs text-gray-400">{data?.meta?.total ?? 0} active clients</p>
          </div>
          <Button variant="primary" icon={<Plus className="w-4 h-4" />} onClick={openCreate}>Add Client</Button>
        </div>

        <Card noPad>
          <div className="p-4">
            <SearchInput value={search} onChange={v => { setSearch(v); setPage(1); }} placeholder="Search by name, GSTIN, email…" className="max-w-sm" />
          </div>
          <Table
            columns={columns}
            data={(data?.data ?? []) as Client[]}
            loading={isLoading}
            rowKey={r => r.id}
            page={data?.meta?.page} pages={Math.ceil((data?.meta?.total ?? 0) / 50)}
            total={data?.meta?.total} limit={50}
            onPageChange={setPage}
            emptyTitle="No clients yet"
            emptyDesc="Add your first client to start raising invoices"
          />
        </Card>
      </div>

      {/* Client Form */}
      <Modal open={showForm} onClose={() => setShowForm(false)} size="lg"
        title={editClient ? `Edit — ${editClient.name}` : 'Add New Client'}
        footer={
          <>
            <Button variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
            <Button variant="primary" onClick={handleSubmit(onSubmit)} loading={createMut.isPending || updateMut.isPending}>
              {editClient ? 'Save Changes' : 'Add Client'}
            </Button>
          </>
        }
      >
        <form className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2 text-xs font-semibold text-gray-400 uppercase tracking-wide">Company Details</div>
          <div className="sm:col-span-2">
            <Input label="Company Name" required {...register('name')} placeholder="NeoSoft Technologies Pvt Ltd" />
          </div>
          <Input label="GSTIN" {...register('gstin')} placeholder="27AABCN1234F1Z5" className="font-mono" />
          <Input label="PAN" {...register('pan')} placeholder="AABCN1234F" className="font-mono" />
          <Input label="Contact Person" {...register('contact_person')} placeholder="Rajesh Sharma" />
          <Input label="Email" type="email" {...register('email')} placeholder="billing@company.com" />
          <Input label="Phone" type="tel" {...register('phone')} placeholder="9876543210" />

          <div className="sm:col-span-2 text-xs font-semibold text-gray-400 uppercase tracking-wide pt-2">Address</div>
          <div className="sm:col-span-2">
            <Input label="Address" {...register('address')} placeholder="Building, Street, Area" />
          </div>
          <Input label="City"  {...register('city')}  placeholder="Mumbai" />
          <Input label="State" {...register('state')} placeholder="Maharashtra" />

          <div className="sm:col-span-2 text-xs font-semibold text-gray-400 uppercase tracking-wide pt-2">Billing Settings</div>
          <Select label="Supply Type" required
            options={[{value:'inter',label:'Inter-state (IGST)'},{value:'intra',label:'Intra-state (CGST+SGST)'}]}
            {...register('supply_type')} />
          <Select label="GST Rate (%)"
            options={[{value:0,label:'0%'},{value:5,label:'5%'},{value:12,label:'12%'},{value:18,label:'18%'},{value:28,label:'28%'}]}
            {...register('gst_rate')} />
          <Input label="HSN/SAC Code" {...register('hsn_code')} placeholder="998519" className="font-mono" />
          <Input label="Payment Terms (days)" type="number" {...register('payment_terms')} placeholder="30" />
          <div className="sm:col-span-2">
            <Input label="Service Description" {...register('service_desc')} placeholder="IT Staffing Services" />
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={!!delClient} onClose={() => setDel(null)}
        onConfirm={async () => { await deleteMut.mutateAsync(delClient!.id); setDel(null); }}
        title="Delete Client"
        message={`Delete ${delClient?.name}? Existing invoices will be preserved.`}
        confirmLabel="Delete" loading={deleteMut.isPending}
      />
    </>
  );
}
