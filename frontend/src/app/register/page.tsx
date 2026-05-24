'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Eye, EyeOff, BarChart3 } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';

const schema = z.object({
  company_name:   z.string().min(2, 'Company name required').max(200),
  company_gstin:  z.string().regex(/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/, 'Invalid GSTIN').optional().or(z.literal('')),
  name:           z.string().min(2, 'Your name required'),
  email:          z.string().email('Valid email required'),
  password:       z.string().min(8, 'Min 8 characters')
                   .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, 'Must have uppercase, lowercase, number'),
  phone:          z.string().regex(/^\+?[0-9]{10,13}$/, 'Invalid phone').optional().or(z.literal('')),
});
type FormData = z.infer<typeof schema>;

export default function RegisterPage() {
  const { handleRegister, isLoading } = useAuth();
  const [showPw, setShowPw] = useState(false);

  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 bg-blue-600 rounded-2xl mb-4">
            <BarChart3 className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Start Free Trial</h1>
          <p className="text-gray-500 text-sm mt-1">14 days free · No credit card required</p>
        </div>

        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-8">
          <form onSubmit={handleSubmit(handleRegister)} className="space-y-4">
            {/* Company */}
            <div>
              <label className="text-xs font-medium text-gray-600 block mb-1">Company Name <span className="text-red-500">*</span></label>
              <input {...register('company_name')} placeholder="AVIIN JOBS SERVICES" className="input-base" />
              {errors.company_name && <p className="text-xs text-red-600 mt-1">{errors.company_name.message}</p>}
            </div>

            <div>
              <label className="text-xs font-medium text-gray-600 block mb-1">GSTIN <span className="text-gray-400">(optional)</span></label>
              <input {...register('company_gstin')} placeholder="29BCXPM5845F1ZU" className="input-base font-mono" />
              {errors.company_gstin && <p className="text-xs text-red-600 mt-1">{errors.company_gstin.message}</p>}
            </div>

            <hr className="border-gray-100" />

            {/* Admin user */}
            <div>
              <label className="text-xs font-medium text-gray-600 block mb-1">Your Name <span className="text-red-500">*</span></label>
              <input {...register('name')} placeholder="Admin User" className="input-base" />
              {errors.name && <p className="text-xs text-red-600 mt-1">{errors.name.message}</p>}
            </div>

            <div>
              <label className="text-xs font-medium text-gray-600 block mb-1">Email <span className="text-red-500">*</span></label>
              <input {...register('email')} type="email" placeholder="admin@company.com" className="input-base" />
              {errors.email && <p className="text-xs text-red-600 mt-1">{errors.email.message}</p>}
            </div>

            <div>
              <label className="text-xs font-medium text-gray-600 block mb-1">Phone <span className="text-gray-400">(optional)</span></label>
              <input {...register('phone')} type="tel" placeholder="9900000000" className="input-base" />
              {errors.phone && <p className="text-xs text-red-600 mt-1">{errors.phone.message}</p>}
            </div>

            <div>
              <label className="text-xs font-medium text-gray-600 block mb-1">Password <span className="text-red-500">*</span></label>
              <div className="relative">
                <input
                  {...register('password')}
                  type={showPw ? 'text' : 'password'}
                  placeholder="Min 8 chars, uppercase + number"
                  className="input-base pr-10"
                />
                <button type="button" onClick={() => setShowPw(!showPw)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                  {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {errors.password && <p className="text-xs text-red-600 mt-1">{errors.password.message}</p>}
            </div>

            <button
              type="submit" disabled={isLoading}
              className="w-full py-2.5 bg-blue-600 text-white rounded-lg text-sm font-semibold
                         hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500
                         disabled:opacity-50 flex items-center justify-center gap-2 mt-2 transition-colors"
            >
              {isLoading && <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
              {isLoading ? 'Creating account…' : 'Create Account & Start Trial'}
            </button>
          </form>

          <p className="text-center text-sm text-gray-500 mt-5">
            Already have an account?{' '}
            <Link href="/login" className="text-blue-600 font-medium hover:underline">Sign in</Link>
          </p>
        </div>

        <p className="text-center text-xs text-gray-400 mt-4">
          By signing up, you agree to our Terms of Service and Privacy Policy.
        </p>
      </div>
    </div>
  );
}
