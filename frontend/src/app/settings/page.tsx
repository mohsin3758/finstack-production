'use client';
import { useEffect } from 'react';
import { Card }   from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input, Select } from '@/components/ui/Input';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { settingsApi } from '@/services/api';
import { useAuthStore } from '@/store/authStore';
import { useForm } from 'react-hook-form';
import type { Company } from '@/types';
import toast from 'react-hot-toast';
import { Save, Building2, CreditCard, FileText } from 'lucide-react';

export default function SettingsPage() {
  const qc = useQueryClient();
  const { updateUser } = useAuthStore();

  const { data: company, isLoading } = useQuery({
    queryKey: ['settings'],
    queryFn:  async () => { const r = await settingsApi.get(); return r.data.data; },
  });

  const { register, handleSubmit, reset } = useForm<Partial<Company>>();

  useEffect(() => { if (company) reset(company); }, [company, reset]);

  const updateMut = useMutation({
    mutationFn: settingsApi.update,
    onSuccess:  () => { qc.invalidateQueries({ queryKey: ['settings'] }); toast.success('Settings saved'); },
    onError:    () => toast.error('Failed to save settings'),
  });

  if (isLoading) {
    return <div className="flex justify-center py-20"><div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" /></div>;
  }

  return (
      <div className="space-y-6 animate-in max-w-3xl">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-gray-900">Settings</h2>
            <p className="text-xs text-gray-400">Company profile & billing preferences</p>
          </div>
          <Button variant="primary" icon={<Save className="w-4 h-4" />}
            onClick={handleSubmit(d => updateMut.mutate(d))}
            loading={updateMut.isPending}>
            Save Settings
          </Button>
        </div>

        <form className="space-y-6" onSubmit={e => e.preventDefault()}>
          {/* Company Info */}
          <Card title="Company Information">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <Input label="Company Name" required {...register('name')} placeholder="AVIIN JOBS SERVICES" />
              </div>
              <Input label="GSTIN" {...register('gstin')} placeholder="29BCXPM5845F1ZU" className="font-mono" />
              <Input label="PAN"   {...register('pan')}   placeholder="BCXPM5845F"      className="font-mono" />
              <Input label="Phone" {...register('phone')} type="tel" placeholder="9900000000" />
              <Input label="Email" {...register('email')} type="email" placeholder="info@aviinjobs.com" />
              <Input label="Website" {...register('website')} placeholder="https://aviinjobs.com" />
              <Input label="State" {...register('state')} placeholder="Karnataka" />
              <Input label="State Code" {...register('state_code')} placeholder="29" />
            </div>
          </Card>

          {/* Address */}
          <Card title="Address">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <Input label="Full Address" {...register('address')} placeholder="S-21/2-3, 2nd Floor, Asian Business Center, SP Office Road" />
              </div>
              <Input label="City"    {...register('city')}    placeholder="Kalaburagi" />
              <Input label="Pincode" {...register('pincode')} placeholder="585102" />
            </div>
          </Card>

          {/* Bank */}
          <Card title="Bank Details">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input label="Bank Name"      {...register('bank_name')}    placeholder="Punjab National Bank" />
              <Input label="Account Number" {...register('bank_account')} placeholder="13821652000062" className="font-mono" />
              <Input label="IFSC Code"      {...register('bank_ifsc')}    placeholder="PUNB0212420" className="font-mono" />
              <Input label="Branch"         {...register('bank_branch')}  placeholder="Super Market, Kalaburagi" />
            </div>
          </Card>

          {/* Invoice */}
          <Card title="Invoice Settings">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <Input label="Invoice Prefix" {...register('inv_prefix')} placeholder="INV" />
              <div className="sm:col-span-3 flex items-end">
                <div className="bg-blue-50 border border-blue-100 rounded-xl px-4 py-3 text-sm text-blue-700 w-full">
                  Invoices will be numbered: <strong>{company?.inv_prefix || 'INV'}-{String(company?.inv_counter || 1).padStart(4,'0')}</strong>, <strong>{company?.inv_prefix || 'INV'}-{String((company?.inv_counter || 1) + 1).padStart(4,'0')}</strong>…
                </div>
              </div>
            </div>
          </Card>

          {/* Subscription */}
          <Card title="Subscription">
            <div className="flex items-center gap-4">
              <div>
                <p className="text-sm font-semibold text-gray-800 capitalize">{company?.subscription} Plan</p>
                <p className="text-xs text-gray-500">
                  {company?.subscription_end
                    ? `Valid until ${new Date(company.subscription_end).toLocaleDateString('en-IN', {day:'numeric',month:'long',year:'numeric'})}`
                    : 'Active'}
                </p>
              </div>
              <span className={`px-3 py-1 rounded-full text-xs font-semibold ${company?.subscription === 'trial' ? 'bg-orange-100 text-orange-700' : 'bg-green-100 text-green-700'}`}>
                {company?.subscription?.toUpperCase()}
              </span>
            </div>
          </Card>
        </form>
      </div>
  );
}
