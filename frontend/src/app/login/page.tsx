'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Eye, EyeOff, BarChart3 } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';

const schema = z.object({
  email:       z.string().email('Enter a valid email'),
  password:    z.string().min(1, 'Password required'),
  remember_me: z.boolean().optional(),
});
type FormData = z.infer<typeof schema>;

export default function LoginPage() {
  const { handleLogin, isLoading } = useAuth();
  const [showPw, setShowPw] = useState(false);

  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  return (
    <div className="min-h-screen flex">
      {/* Left panel — branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-blue-700 via-blue-600 to-indigo-700 flex-col justify-between p-12">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
            <BarChart3 className="w-6 h-6 text-white" />
          </div>
          <div>
            <p className="text-white font-bold text-lg">FinStack ERP</p>
            <p className="text-blue-200 text-xs">Enterprise SaaS — India First</p>
          </div>
        </div>

        <div>
          <h2 className="text-3xl font-bold text-white leading-tight">
            Complete ERP for<br />Indian Businesses
          </h2>
          <p className="text-blue-200 mt-4 text-sm leading-relaxed max-w-sm">
            GST Invoicing · Payroll (PF/ESI/PT/TDS) · HRMS · Accounting · CFO Dashboard — all in one platform.
          </p>
          <div className="mt-8 grid grid-cols-2 gap-4">
            {[
              { label: 'GST Compliance', desc: 'CGST/SGST/IGST + GSTR-1' },
              { label: 'Payroll Engine', desc: 'PF · ESI · PT · TDS · Form 16' },
              { label: 'Smart Billing',  desc: 'Contractor-wise auto-invoice' },
              { label: 'Multi-user',     desc: 'RBAC · Audit logs · Secure' },
            ].map(f => (
              <div key={f.label} className="bg-white/10 rounded-xl p-4">
                <p className="text-white font-semibold text-sm">{f.label}</p>
                <p className="text-blue-200 text-xs mt-1">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>

        <p className="text-blue-300 text-xs">© 2026 AVIIN JOBS SERVICES · finstack.aviinjobs.com</p>
      </div>

      {/* Right panel — form */}
      <div className="flex-1 flex items-center justify-center p-6 sm:p-12 bg-gray-50">
        <div className="w-full max-w-sm">
          {/* Mobile logo */}
          <div className="flex items-center gap-2 mb-8 lg:hidden">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
              <BarChart3 className="w-5 h-5 text-white" />
            </div>
            <p className="font-bold text-gray-900">FinStack ERP</p>
          </div>

          <h1 className="text-2xl font-bold text-gray-900">Welcome back</h1>
          <p className="text-gray-500 text-sm mt-1 mb-8">Sign in to your account</p>

          <form onSubmit={handleSubmit(handleLogin)} className="space-y-5">
            {/* Email */}
            <div>
              <label className="text-xs font-medium text-gray-600 block mb-1">
                Email <span className="text-red-500">*</span>
              </label>
              <input
                {...register('email')}
                type="email"
                placeholder="admin@company.com"
                autoComplete="email"
                className="input-base"
              />
              {errors.email && <p className="text-xs text-red-600 mt-1">{errors.email.message}</p>}
            </div>

            {/* Password */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-medium text-gray-600">Password <span className="text-red-500">*</span></label>
                <Link href="/forgot-password" className="text-xs text-blue-600 hover:underline">Forgot password?</Link>
              </div>
              <div className="relative">
                <input
                  {...register('password')}
                  type={showPw ? 'text' : 'password'}
                  placeholder="Enter your password"
                  autoComplete="current-password"
                  className="input-base pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPw(!showPw)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {errors.password && <p className="text-xs text-red-600 mt-1">{errors.password.message}</p>}
            </div>

            {/* Remember me */}
            <label className="flex items-center gap-2 cursor-pointer">
              <input {...register('remember_me')} type="checkbox"
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500" />
              <span className="text-sm text-gray-600">Remember me for 30 days</span>
            </label>

            {/* Submit */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-2.5 bg-blue-600 text-white rounded-lg text-sm font-semibold
                         hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
                         disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
            >
              {isLoading && <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
              {isLoading ? 'Signing in…' : 'Sign In'}
            </button>
          </form>

          <p className="text-center text-sm text-gray-500 mt-6">
            Don&apos;t have an account?{' '}
            <Link href="/register" className="text-blue-600 font-medium hover:underline">Start free trial</Link>
          </p>

          {/* Demo credentials hint */}
          <div className="mt-6 p-3 bg-blue-50 rounded-lg border border-blue-100">
            <p className="text-xs font-semibold text-blue-700 mb-1">Demo Credentials</p>
            <p className="text-xs text-blue-600">Email: admin@aviinjobs.com</p>
            <p className="text-xs text-blue-600">Password: Admin@2026</p>
          </div>
        </div>
      </div>
    </div>
  );
}
