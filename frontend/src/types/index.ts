// ============================================================
// FinStack ERP — TypeScript Types
// ============================================================

export type UserRole = 'super_admin' | 'admin' | 'billing_manager' | 'hr_manager' | 'accountant' | 'viewer';
export type UserStatus = 'active' | 'inactive' | 'suspended' | 'pending';
export type EmpType = 'permanent' | 'contract' | 'intern' | 'consultant';
export type EmpStatus = 'active' | 'inactive' | 'notice' | 'separated';
export type LeaveType = 'EL' | 'CL' | 'SL' | 'ML' | 'PL' | 'CO' | 'LWP';
export type LeaveStatus = 'pending' | 'approved' | 'rejected' | 'cancelled';
export type InvStatus = 'draft' | 'pending' | 'sent' | 'paid' | 'partial' | 'overdue' | 'cancelled' | 'hold';
export type SupplyType = 'intra' | 'inter';
export type TxnType = 'income' | 'expense' | 'contra' | 'journal';
export type PayMode = 'NEFT' | 'IMPS' | 'RTGS' | 'UPI' | 'cheque' | 'cash' | 'card';

// ── API Response wrappers ─────────────────────────────────────────────────
export interface ApiResponse<T> {
  success: boolean;
  data:    T;
  message?: string;
  code?:   string;
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  meta: { page: number; limit: number; total: number; pages: number };
}

// ── Auth ──────────────────────────────────────────────────────────────────
export interface Company {
  id:               string;
  name:             string;
  slug:             string;
  gstin?:           string;
  pan?:             string;
  address?:         string;
  city?:            string;
  state?:           string;
  state_code?:      string;
  phone?:           string;
  email?:           string;
  website?:         string;
  pincode?:         string;
  bank_name?:       string;
  bank_account?:    string;
  bank_ifsc?:       string;
  bank_branch?:     string;
  inv_prefix:       string;
  inv_counter:      number;
  logo_url?:        string;
  subscription:     string;
  subscription_end?: string;
  active:           boolean;
  settings:         Record<string, unknown>;
  created_at:       string;
  updated_at:       string;
}

export interface User {
  id:          string;
  company_id:  string;
  name:        string;
  email:       string;
  role:        UserRole;
  status:      UserStatus;
  phone?:      string;
  avatar_url?: string;
  last_login?: string;
  login_count: number;
  mfa_enabled: boolean;
  permissions: Record<string, string[]>;
  preferences: Record<string, unknown>;
  company?:    Company;
  created_at:  string;
  updated_at:  string;
}

export interface AuthState {
  user:         User | null;
  company:      Company | null;
  access_token: string | null;
  isLoading:    boolean;
  isLoggedIn:   boolean;
}

export interface LoginInput {
  email:       string;
  password:    string;
  remember_me?: boolean;
}

export interface RegisterInput {
  company_name:   string;
  company_gstin?: string;
  name:           string;
  email:          string;
  password:       string;
  phone?:         string;
}

// ── Employee ──────────────────────────────────────────────────────────────
export interface Employee {
  id:              string;
  company_id:      string;
  code?:           string;
  name:            string;
  designation?:    string;
  department?:     string;
  emp_type:        EmpType;
  status:          EmpStatus;
  date_of_joining?: string;
  date_of_birth?:   string;
  gender?:         string;
  email?:          string;
  phone?:          string;
  pan?:            string;
  aadhar?:         string;
  uan?:            string;
  basic:           number;
  hra:             number;
  da:              number;
  special_allow:   number;
  lta:             number;
  pf_enrolled:     0 | 1;
  esi_enrolled:    0 | 1;
  pt_enrolled:     0 | 1;
  tds_rate:        number;
  bank_name?:      string;
  bank_account?:   string;
  bank_ifsc?:      string;
  address?:        string;
  city?:           string;
  state?:          string;
  created_at:      string;
  updated_at:      string;
}

// ── Client ────────────────────────────────────────────────────────────────
export interface Client {
  id:             string;
  company_id:     string;
  name:           string;
  gstin?:         string;
  pan?:           string;
  contact_person?:string;
  email?:         string;
  phone?:         string;
  address?:       string;
  city?:          string;
  state?:         string;
  supply_type:    SupplyType;
  gst_rate:       number;
  payment_terms:  number;
  hsn_code:       string;
  service_desc?:  string;
  active:         boolean;
  created_at:     string;
  updated_at:     string;
}

// ── Invoice ───────────────────────────────────────────────────────────────
export interface InvoiceItem {
  id?:            string;
  sort_order?:    number;
  description?:   string;
  role?:          string;
  date_of_joining?:string;
  hsn_code?:      string;
  calendar_days?: number;
  worked_days?:   number;
  po_value?:      number;
  billing_rate:   number;
  gst_row?:       number;
  total_row?:     number;
  contractor_id?: string;
}

export interface Invoice {
  id:             string;
  company_id:     string;
  client_id?:     string;
  inv_no:         string;
  template:       number;
  client_name:    string;
  client_gstin?:  string;
  client_email?:  string;
  client_address?:string;
  inv_date:       string;
  due_date?:      string;
  supply_type:    SupplyType;
  hsn_code?:      string;
  subtotal:       number;
  discount:       number;
  taxable:        number;
  gst_rate:       number;
  cgst:           number;
  sgst:           number;
  igst:           number;
  gst_amount:     number;
  total:          number;
  status:         InvStatus;
  received:       number;
  outstanding:    number;
  pay_date?:      string;
  pay_mode?:      PayMode;
  pay_utr?:       string;
  shared_via?:    string;
  hold_reason?:   string;
  pdf_url?:       string;
  notes?:         string;
  payroll_month?: number;
  payroll_year?:  number;
  inv_mode?:      string;
  amount_words?:  string;
  items?:         InvoiceItem[];
  client?:        Client;
  created_at:     string;
  updated_at:     string;
}

export interface InvoiceStats {
  total_billed:    number;
  total_received:  number;
  total_outstanding:number;
  invoice_count:   number;
  overdue_count:   number;
  overdue_amount:  number;
}

// ── Payroll ───────────────────────────────────────────────────────────────
export interface PayrollRecord {
  id:              string;
  company_id:      string;
  employee_id:     string;
  month:           number;
  year:            number;
  calendar_days:   number;
  working_days:    number;
  present_days:    number;
  leave_days:      number;
  basic_earned:    number;
  hra_earned:      number;
  da_earned:       number;
  special_earned:  number;
  gross:           number;
  pf_employee:     number;
  pf_employer:     number;
  esi_employee:    number;
  esi_employer:    number;
  pt:              number;
  tds:             number;
  advance:         number;
  other_deduction: number;
  total_deduction: number;
  net_pay:         number;
  status:          string;
  payment_date?:   string;
  employee?:       Employee;
  created_at:      string;
}

// ── Transaction ───────────────────────────────────────────────────────────
export interface Transaction {
  id:          string;
  company_id:  string;
  txn_type:    TxnType;
  date:        string;
  category?:   string;
  description?:string;
  amount:      number;
  party?:      string;
  pay_mode?:   PayMode;
  bank?:       string;
  reference?:  string;
  gst_amount:  number;
  tds_amount:  number;
  notes?:      string;
  created_at:  string;
}

// ── Leave ──────────────────────────────────────────────────────────────────
export interface LeaveRequest {
  id:               string;
  company_id:       string;
  employee_id:      string;
  leave_type:       LeaveType;
  from_date:        string;
  to_date:          string;
  days:             number;
  reason?:          string;
  status:           LeaveStatus;
  approved_by?:     string;
  approved_at?:     string;
  rejection_reason?:string;
  employee?:        Pick<Employee,'id'|'name'|'code'|'department'>;
  created_at:       string;
}

// ── Dashboard ─────────────────────────────────────────────────────────────
export interface DashboardKPI {
  value:       number;
  prev?:       number;
  growth_pct?: number;
}

export interface DashboardData {
  kpis: {
    revenue:        DashboardKPI;
    collected:      DashboardKPI;
    outstanding:    DashboardKPI;
    invoices_count: DashboardKPI;
    expenses:       DashboardKPI;
    profit:         DashboardKPI;
    employees:      DashboardKPI;
    clients:        DashboardKPI;
    pending_leaves: DashboardKPI;
  };
  charts: {
    monthly_revenue: Array<{ month: string; revenue: number; collected: number }>;
  };
  recent_invoices:  Invoice[];
  overdue_invoices: Invoice[];
  as_of:            string;
}

// ── Notification ──────────────────────────────────────────────────────────
export interface Notification {
  id:          string;
  company_id:  string;
  user_id?:    string;
  type:        string;
  title:       string;
  message:     string;
  entity_type?:string;
  entity_id?:  string;
  read:        boolean;
  read_at?:    string;
  created_at:  string;
}
