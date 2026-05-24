'use client';
import { useState } from 'react';
import { Card }   from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { StatusBadge } from '@/components/ui/Badge';
import { SearchInput, Select, Input } from '@/components/ui/Input';
import { Table, type Column } from '@/components/ui/Table';
import { Modal, ConfirmDialog } from '@/components/ui/Modal';
import { useEmployees, useCreateEmployee, useUpdateEmployee, useDeleteEmployee } from '@/hooks/useEmployees';
import { fmtCurrency, fmtDate, truncate } from '@/lib/utils';
import { Plus, Edit2, Trash2, RefreshCw, User } from 'lucide-react';
import type { Employee } from '@/types';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';

const DEPT_OPTS = [
  { value:'', label:'All Departments' },
  { value:'IT', label:'IT' }, { value:'HR', label:'HR' },
  { value:'Finance', label:'Finance' }, { value:'Operations', label:'Operations' },
  { value:'Sales', label:'Sales' }, { value:'Admin', label:'Admin' },
];

type EmpForm = Partial<Employee>;

export default function EmployeesPage() {
  const [page,   setPage]   = useState(1);
  const [search, setSearch] = useState('');
  const [dept,   setDept]   = useState('');
  const [status, setStatus] = useState('active');

  const [showForm, setShowForm]   = useState(false);
  const [editEmp,  setEditEmp]    = useState<Employee | null>(null);
  const [delEmp,   setDelEmp]     = useState<Employee | null>(null);

  const { data, isLoading, refetch } = useEmployees({ page, search, department: dept, status, limit: 50 });
  const createMut = useCreateEmployee();
  const updateMut = useUpdateEmployee();
  const deleteMut = useDeleteEmployee();

  const { register, handleSubmit, reset, formState: { errors } } = useForm<EmpForm>();

  function openCreate() { reset({}); setEditEmp(null); setShowForm(true); }
  function openEdit(emp: Employee) { reset(emp); setEditEmp(emp); setShowForm(true); }

  async function onSubmit(data: EmpForm) {
    try {
      if (editEmp) {
        await updateMut.mutateAsync({ id: editEmp.id, data });
      } else {
        await createMut.mutateAsync(data);
      }
      setShowForm(false);
    } catch { /* errors handled in hook */ }
  }

  const columns: Column<Employee>[] = [
    {
      key: 'name', header: 'Employee',
      render: r => (
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
            <User className="w-4 h-4 text-blue-600" />
          </div>
          <div>
            <p className="font-medium text-sm text-gray-800">{r.name}</p>
            <p className="text-xs text-gray-400">{r.code} · {r.designation}</p>
          </div>
        </div>
      )
    },
    { key: 'department', header: 'Department', render: r => <span className="text-sm text-gray-600">{r.department || '—'}</span> },
    { key: 'date_of_joining', header: 'Joined', render: r => <span className="text-xs text-gray-500">{fmtDate(r.date_of_joining)}</span> },
    {
      key: 'basic', header: 'Basic Salary', align: 'right',
      render: r => <span className="font-medium text-sm">{fmtCurrency(Number(r.basic))}</span>
    },
    {
      key: 'pf_enrolled', header: 'PF/ESI',
      render: r => (
        <div className="flex gap-1">
          {r.pf_enrolled ? <span className="text-xs bg-green-50 text-green-700 px-1.5 py-0.5 rounded font-medium">PF</span> : null}
          {r.esi_enrolled ? <span className="text-xs bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded font-medium">ESI</span> : null}
          {!r.pf_enrolled && !r.esi_enrolled ? <span className="text-xs text-gray-400">—</span> : null}
        </div>
      )
    },
    { key: 'status', header: 'Status', render: r => <StatusBadge status={r.status} /> },
    {
      key: 'actions', header: '', align: 'right', width: '80px',
      render: r => (
        <div className="flex items-center justify-end gap-1">
          <button onClick={() => openEdit(r)} className="p-1.5 rounded hover:bg-blue-50 text-gray-400 hover:text-blue-600 transition-colors">
            <Edit2 className="w-3.5 h-3.5" />
          </button>
          <button onClick={() => setDelEmp(r)} className="p-1.5 rounded hover:bg-red-50 text-gray-400 hover:text-red-600 transition-colors">
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      )
    },
  ];

  return (
    <>
      <div className="space-y-5 animate-in">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-gray-900">Employees</h2>
            <p className="text-xs text-gray-400">
              {data?.meta?.total ?? 0} employees · PF/ESI/PT/TDS compliant
            </p>
          </div>
          <div className="flex gap-2">
            <button onClick={() => refetch()} className="p-2 rounded-lg hover:bg-gray-100 text-gray-500">
              <RefreshCw className="w-4 h-4" />
            </button>
            <Button variant="primary" icon={<Plus className="w-4 h-4" />} onClick={openCreate}>
              Add Employee
            </Button>
          </div>
        </div>

        <Card noPad>
          <div className="flex flex-col sm:flex-row gap-3 p-4">
            <SearchInput value={search} onChange={v => { setSearch(v); setPage(1); }} placeholder="Search name, code, email…" className="flex-1" />
            <Select options={DEPT_OPTS} value={dept} onChange={e => { setDept(e.target.value); setPage(1); }} className="w-full sm:w-44" />
            <Select
              options={[{value:'active',label:'Active'},{value:'inactive',label:'Inactive'},{value:'',label:'All'}]}
              value={status} onChange={e => setStatus(e.target.value)} className="w-full sm:w-36"
            />
          </div>

          <Table
            columns={columns}
            data={(data?.data ?? []) as Employee[]}
            loading={isLoading}
            rowKey={r => r.id}
            page={data?.meta?.page} pages={Math.ceil((data?.meta?.total ?? 0) / 50)}
            total={data?.meta?.total} limit={50}
            onPageChange={setPage}
            emptyTitle="No employees found"
            emptyDesc="Add your first employee to get started"
          />
        </Card>
      </div>

      {/* Add/Edit Modal */}
      <Modal
        open={showForm}
        onClose={() => setShowForm(false)}
        size="xl"
        title={editEmp ? `Edit — ${editEmp.name}` : 'Add New Employee'}
        footer={
          <>
            <Button variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
            <Button variant="primary" onClick={handleSubmit(onSubmit)}
              loading={createMut.isPending || updateMut.isPending}>
              {editEmp ? 'Save Changes' : 'Add Employee'}
            </Button>
          </>
        }
      >
        <form className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Basic info */}
          <div className="sm:col-span-2 text-xs font-semibold text-gray-400 uppercase tracking-wide pt-2">Basic Information</div>
          <Input label="Employee Code" {...register('code')} placeholder="EMP001" />
          <Input label="Full Name" required {...register('name')} placeholder="Rajesh Kumar" error={errors.name?.message} />
          <Input label="Designation" {...register('designation')} placeholder="Software Engineer" />
          <Input label="Department" {...register('department')} placeholder="IT" />
          <Input label="Date of Joining" type="date" {...register('date_of_joining')} />
          <Select label="Employment Type"
            options={[{value:'permanent',label:'Permanent'},{value:'contract',label:'Contract'},{value:'intern',label:'Intern'},{value:'consultant',label:'Consultant'}]}
            {...register('emp_type')} />

          {/* Contact */}
          <div className="sm:col-span-2 text-xs font-semibold text-gray-400 uppercase tracking-wide pt-2">Contact</div>
          <Input label="Email" type="email" {...register('email')} placeholder="employee@company.com" />
          <Input label="Phone" type="tel" {...register('phone')} placeholder="9900000000" />
          <Input label="PAN" {...register('pan')} placeholder="ABCDE1234F" className="font-mono" />
          <Input label="UAN" {...register('uan')} placeholder="123456789012" className="font-mono" />

          {/* Salary */}
          <div className="sm:col-span-2 text-xs font-semibold text-gray-400 uppercase tracking-wide pt-2">Salary Structure (Monthly ₹)</div>
          <Input label="Basic Salary" type="number" required {...register('basic')} placeholder="25000" error={errors.basic?.message} />
          <Input label="HRA" type="number" {...register('hra')} placeholder="10000 (auto 40% of basic)" />
          <Input label="DA" type="number" {...register('da')} placeholder="0" />
          <Input label="Special Allowance" type="number" {...register('special_allow')} placeholder="0" />
          <Input label="LTA" type="number" {...register('lta')} placeholder="0" />

          {/* Statutory */}
          <div className="sm:col-span-2 text-xs font-semibold text-gray-400 uppercase tracking-wide pt-2">Statutory Deductions</div>
          <Select label="PF Enrolled"
            options={[{value:1,label:'Yes — PF Enrolled'},{value:0,label:'No — PF Exempt'}]}
            {...register('pf_enrolled')} />
          <Select label="ESI Enrolled"
            options={[{value:0,label:'No — ESI Exempt'},{value:1,label:'Yes — ESI Enrolled'}]}
            {...register('esi_enrolled')} />
          <Select label="PT Enrolled"
            options={[{value:1,label:'Yes — PT Deducted'},{value:0,label:'No — PT Exempt'}]}
            {...register('pt_enrolled')} />
          <Input label="TDS Rate (%)" type="number" {...register('tds_rate')} placeholder="0" hint="e.g. 5 for 5% TDS" />

          {/* Bank */}
          <div className="sm:col-span-2 text-xs font-semibold text-gray-400 uppercase tracking-wide pt-2">Bank Details</div>
          <Input label="Bank Name" {...register('bank_name')} placeholder="State Bank of India" />
          <Input label="Account Number" {...register('bank_account')} placeholder="12345678901234" className="font-mono" />
          <Input label="IFSC Code" {...register('bank_ifsc')} placeholder="SBIN0001234" className="font-mono" />
        </form>
      </Modal>

      {/* Delete Confirm */}
      <ConfirmDialog
        open={!!delEmp}
        onClose={() => setDelEmp(null)}
        onConfirm={async () => { await deleteMut.mutateAsync(delEmp!.id); setDelEmp(null); }}
        title="Remove Employee"
        message={`Remove ${delEmp?.name} from the system? This is a soft delete — records are preserved.`}
        confirmLabel="Remove"
        loading={deleteMut.isPending}
      />
    </>
  );
}
