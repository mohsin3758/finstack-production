-- ============================================================
-- FINSTACK SAAS ERP — PostgreSQL Schema v21
-- Multi-tenant | RBAC | Audit Trail | Partitioned logs
-- ============================================================
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;

-- Extensions (run outside transaction for PG compatibility)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

BEGIN;

-- ── ENUM types ────────────────────────────────────────────────────────────
CREATE TYPE user_role    AS ENUM ('super_admin','admin','billing_manager','hr_manager','accountant','viewer');
CREATE TYPE user_status  AS ENUM ('active','inactive','suspended','pending');
CREATE TYPE emp_type     AS ENUM ('permanent','contract','intern','consultant');
CREATE TYPE emp_status   AS ENUM ('active','inactive','notice','separated');
CREATE TYPE leave_type   AS ENUM ('EL','CL','SL','ML','PL','CO','LWP');
CREATE TYPE leave_status AS ENUM ('pending','approved','rejected','cancelled');
CREATE TYPE inv_status   AS ENUM ('draft','pending','sent','paid','partial','overdue','cancelled','hold');
CREATE TYPE supply_type  AS ENUM ('intra','inter');
CREATE TYPE txn_type     AS ENUM ('income','expense','contra','journal');
CREATE TYPE pay_mode     AS ENUM ('NEFT','IMPS','RTGS','UPI','cheque','cash','card');
CREATE TYPE audit_action AS ENUM ('create','read','update','delete','login','logout','export','import','approve','reject');

-- ══════════════════════════════════════════════════════════════
-- COMPANIES (Multi-tenant root)
-- ══════════════════════════════════════════════════════════════
CREATE TABLE companies (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name             VARCHAR(200) NOT NULL,
  slug             VARCHAR(100) UNIQUE NOT NULL,
  gstin            VARCHAR(15)  UNIQUE,
  pan              VARCHAR(10),
  address          TEXT,
  city             VARCHAR(100),
  state            VARCHAR(100),
  state_code       VARCHAR(4),
  pincode          VARCHAR(8),
  phone            VARCHAR(15),
  email            VARCHAR(150),
  website          VARCHAR(255),
  bank_name        VARCHAR(150),
  bank_account     VARCHAR(25),
  bank_ifsc        VARCHAR(12),
  bank_branch      VARCHAR(150),
  inv_prefix       VARCHAR(10)  DEFAULT 'INV',
  inv_counter      INTEGER      DEFAULT 1,
  logo_url         TEXT,
  pf_ceiling       NUMERIC(12,2) DEFAULT 15000,
  esi_ceiling      NUMERIC(12,2) DEFAULT 21000,
  subscription     VARCHAR(50)  DEFAULT 'trial',
  subscription_end DATE,
  api_key          VARCHAR(64)  UNIQUE DEFAULT encode(gen_random_bytes(32),'hex'),
  settings         JSONB        DEFAULT '{}',
  active           BOOLEAN      DEFAULT true,
  deleted_at       TIMESTAMPTZ,
  created_at       TIMESTAMPTZ  DEFAULT NOW(),
  updated_at       TIMESTAMPTZ  DEFAULT NOW()
);

-- ══════════════════════════════════════════════════════════════
-- USERS & AUTH
-- ══════════════════════════════════════════════════════════════
CREATE TABLE users (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id      UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  name            VARCHAR(150) NOT NULL,
  email           VARCHAR(150) NOT NULL,
  password_hash   VARCHAR(255) NOT NULL,
  role            user_role    NOT NULL DEFAULT 'viewer',
  status          user_status  NOT NULL DEFAULT 'active',
  phone           VARCHAR(15),
  avatar_url      TEXT,
  last_login      TIMESTAMPTZ,
  login_count     INTEGER      DEFAULT 0,
  failed_logins   INTEGER      DEFAULT 0,
  locked_until    TIMESTAMPTZ,
  mfa_enabled     BOOLEAN      DEFAULT false,
  mfa_secret      VARCHAR(100),
  reset_token     VARCHAR(255),
  reset_expires   TIMESTAMPTZ,
  permissions     JSONB        DEFAULT '{}',
  preferences     JSONB        DEFAULT '{"theme":"light","language":"en"}',
  deleted_at      TIMESTAMPTZ,
  created_at      TIMESTAMPTZ  DEFAULT NOW(),
  updated_at      TIMESTAMPTZ  DEFAULT NOW(),
  UNIQUE(company_id, email)
);

CREATE TABLE user_sessions (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  company_id    UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  refresh_token VARCHAR(500) UNIQUE NOT NULL,
  ip_address    INET,
  user_agent    TEXT,
  expires_at    TIMESTAMPTZ NOT NULL,
  revoked       BOOLEAN     DEFAULT false,
  revoked_at    TIMESTAMPTZ,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE role_permissions (
  id       UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  role     user_role   NOT NULL,
  resource VARCHAR(50) NOT NULL,
  action   VARCHAR(20) NOT NULL,
  allowed  BOOLEAN     DEFAULT true,
  UNIQUE(role, resource, action)
);

-- ══════════════════════════════════════════════════════════════
-- EMPLOYEES
-- ══════════════════════════════════════════════════════════════
CREATE TABLE employees (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id      UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  code            VARCHAR(30),
  name            VARCHAR(150) NOT NULL,
  designation     VARCHAR(100),
  department      VARCHAR(100),
  emp_type        emp_type    DEFAULT 'permanent',
  status          emp_status  DEFAULT 'active',
  date_of_joining DATE,
  date_of_birth   DATE,
  gender          VARCHAR(10),
  email           VARCHAR(150),
  phone           VARCHAR(15),
  pan             VARCHAR(10),
  aadhar          VARCHAR(16),
  uan             VARCHAR(12),
  -- Salary structure (monthly)
  basic           NUMERIC(12,2) DEFAULT 0,
  hra             NUMERIC(12,2) DEFAULT 0,
  da              NUMERIC(12,2) DEFAULT 0,
  special_allow   NUMERIC(12,2) DEFAULT 0,
  lta             NUMERIC(12,2) DEFAULT 0,
  -- Statutory flags
  pf_enrolled     SMALLINT DEFAULT 1,
  esi_enrolled    SMALLINT DEFAULT 0,
  pt_enrolled     SMALLINT DEFAULT 1,
  tds_rate        NUMERIC(5,2) DEFAULT 0,
  -- Bank
  bank_name       VARCHAR(150),
  bank_account    VARCHAR(25),
  bank_ifsc       VARCHAR(12),
  -- Address
  address         TEXT,
  city            VARCHAR(100),
  state           VARCHAR(100),
  pincode         VARCHAR(8),
  created_by      UUID REFERENCES users(id),
  deleted_at      TIMESTAMPTZ,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(company_id, code)
);

-- ══════════════════════════════════════════════════════════════
-- PAYROLL
-- ══════════════════════════════════════════════════════════════
CREATE TABLE payroll_records (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id       UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  employee_id      UUID NOT NULL REFERENCES employees(id),
  month            SMALLINT NOT NULL CHECK (month BETWEEN 1 AND 12),
  year             SMALLINT NOT NULL,
  calendar_days    SMALLINT DEFAULT 30,
  working_days     SMALLINT DEFAULT 26,
  present_days     NUMERIC(5,2) DEFAULT 0,
  leave_days       NUMERIC(5,2) DEFAULT 0,
  -- Earnings
  basic_earned     NUMERIC(12,2) DEFAULT 0,
  hra_earned       NUMERIC(12,2) DEFAULT 0,
  da_earned        NUMERIC(12,2) DEFAULT 0,
  special_earned   NUMERIC(12,2) DEFAULT 0,
  lta_earned       NUMERIC(12,2) DEFAULT 0,
  other_allow      NUMERIC(12,2) DEFAULT 0,
  gross            NUMERIC(12,2) DEFAULT 0,
  -- Deductions
  pf_employee      NUMERIC(12,2) DEFAULT 0,
  pf_employer      NUMERIC(12,2) DEFAULT 0,
  esi_employee     NUMERIC(12,2) DEFAULT 0,
  esi_employer     NUMERIC(12,2) DEFAULT 0,
  pt               NUMERIC(12,2) DEFAULT 0,
  tds              NUMERIC(12,2) DEFAULT 0,
  advance          NUMERIC(12,2) DEFAULT 0,
  other_deduction  NUMERIC(12,2) DEFAULT 0,
  total_deduction  NUMERIC(12,2) DEFAULT 0,
  net_pay          NUMERIC(12,2) DEFAULT 0,
  -- Status
  status           VARCHAR(20)  DEFAULT 'draft',
  payment_date     DATE,
  payment_mode     pay_mode,
  payment_ref      VARCHAR(100),
  processed_by     UUID REFERENCES users(id),
  approved_by      UUID REFERENCES users(id),
  payslip_url      TEXT,
  notes            TEXT,
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  updated_at       TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(company_id, employee_id, month, year)
);

-- ══════════════════════════════════════════════════════════════
-- SMART PAYROLL / CONTRACTOR BILLING
-- ══════════════════════════════════════════════════════════════
CREATE TABLE contractor_masters (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id      UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  name            VARCHAR(150) NOT NULL,
  client_id       UUID,
  role            VARCHAR(150),
  project         VARCHAR(200),
  location        VARCHAR(150),
  date_of_joining DATE,
  po_value        NUMERIC(14,2) DEFAULT 0,
  monthly_salary  NUMERIC(12,2) DEFAULT 0,
  calendar_days   SMALLINT      DEFAULT 30,
  tds_pct         NUMERIC(5,2)  DEFAULT 0,
  extra_expense   NUMERIC(12,2) DEFAULT 0,
  contractor_gst  BOOLEAN       DEFAULT false,
  hsn_code        VARCHAR(12)   DEFAULT '998519',
  bench_status    VARCHAR(20)   DEFAULT 'active',
  po_end_date     DATE,
  active          BOOLEAN       DEFAULT true,
  bank_name       VARCHAR(150),
  bank_account    VARCHAR(25),
  bank_ifsc       VARCHAR(12),
  notes           TEXT,
  created_at      TIMESTAMPTZ   DEFAULT NOW(),
  updated_at      TIMESTAMPTZ   DEFAULT NOW()
);

CREATE TABLE smart_payroll (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id      UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  contractor_id   UUID NOT NULL REFERENCES contractor_masters(id),
  month           SMALLINT NOT NULL,
  year            SMALLINT NOT NULL,
  calendar_days   SMALLINT     DEFAULT 30,
  worked_days     NUMERIC(5,2) DEFAULT 0,
  po_value        NUMERIC(14,2) DEFAULT 0,
  bill_prorated   NUMERIC(14,2) DEFAULT 0,
  client_gst_pct  NUMERIC(5,2)  DEFAULT 18,
  client_gst_amt  NUMERIC(12,2) DEFAULT 0,
  invoice_total   NUMERIC(14,2) DEFAULT 0,
  monthly_salary  NUMERIC(12,2) DEFAULT 0,
  gross_pay       NUMERIC(12,2) DEFAULT 0,
  contractor_gst  NUMERIC(12,2) DEFAULT 0,
  tds_pct         NUMERIC(5,2)  DEFAULT 0,
  tds_amt         NUMERIC(12,2) DEFAULT 0,
  extra_expense   NUMERIC(12,2) DEFAULT 0,
  net_pay         NUMERIC(12,2) DEFAULT 0,
  profit          NUMERIC(12,2) DEFAULT 0,
  timesheet_source VARCHAR(300),
  invoice_id      UUID,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(company_id, contractor_id, month, year)
);

-- ══════════════════════════════════════════════════════════════
-- ATTENDANCE
-- ══════════════════════════════════════════════════════════════
CREATE TABLE attendance (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id   UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  employee_id  UUID NOT NULL REFERENCES employees(id),
  date         DATE NOT NULL,
  status       VARCHAR(5) DEFAULT 'P',
  check_in     TIME,
  check_out    TIME,
  hours_worked NUMERIC(5,2),
  notes        TEXT,
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(company_id, employee_id, date)
);

-- ══════════════════════════════════════════════════════════════
-- LEAVES
-- ══════════════════════════════════════════════════════════════
CREATE TABLE leave_balances (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id  UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES employees(id),
  year        SMALLINT NOT NULL,
  el_balance  NUMERIC(5,2) DEFAULT 12,
  cl_balance  NUMERIC(5,2) DEFAULT 7,
  sl_balance  NUMERIC(5,2) DEFAULT 7,
  pl_balance  NUMERIC(5,2) DEFAULT 0,
  co_balance  NUMERIC(5,2) DEFAULT 0,
  UNIQUE(company_id, employee_id, year)
);

CREATE TABLE leave_requests (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id       UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  employee_id      UUID NOT NULL REFERENCES employees(id),
  leave_type       leave_type   NOT NULL,
  from_date        DATE NOT NULL,
  to_date          DATE NOT NULL,
  days             NUMERIC(5,2) NOT NULL,
  reason           TEXT,
  status           leave_status DEFAULT 'pending',
  approved_by      UUID REFERENCES users(id),
  approved_at      TIMESTAMPTZ,
  rejection_reason TEXT,
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  updated_at       TIMESTAMPTZ DEFAULT NOW()
);

-- ══════════════════════════════════════════════════════════════
-- CLIENTS
-- ══════════════════════════════════════════════════════════════
CREATE TABLE clients (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id     UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  name           VARCHAR(200) NOT NULL,
  gstin          VARCHAR(15),
  pan            VARCHAR(10),
  contact_person VARCHAR(150),
  email          VARCHAR(150),
  phone          VARCHAR(15),
  address        TEXT,
  city           VARCHAR(100),
  state          VARCHAR(100),
  pincode        VARCHAR(8),
  supply_type    supply_type  DEFAULT 'inter',
  gst_rate       NUMERIC(5,2) DEFAULT 18,
  payment_terms  SMALLINT     DEFAULT 30,
  hsn_code       VARCHAR(12)  DEFAULT '998519',
  service_desc   VARCHAR(255),
  tds_applicable BOOLEAN      DEFAULT false,
  tds_rate       NUMERIC(5,2) DEFAULT 0,
  notes          TEXT,
  active         BOOLEAN      DEFAULT true,
  deleted_at     TIMESTAMPTZ,
  created_at     TIMESTAMPTZ  DEFAULT NOW(),
  updated_at     TIMESTAMPTZ  DEFAULT NOW()
);

CREATE TABLE client_pos (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id  UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  client_id   UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  po_number   VARCHAR(100) NOT NULL,
  po_amount   NUMERIC(14,2) DEFAULT 0,
  start_date  DATE,
  end_date    DATE,
  utilized    NUMERIC(14,2) DEFAULT 0,
  status      VARCHAR(20)  DEFAULT 'active',
  notes       TEXT,
  created_at  TIMESTAMPTZ  DEFAULT NOW()
);

-- ══════════════════════════════════════════════════════════════
-- INVOICES
-- ══════════════════════════════════════════════════════════════
CREATE TABLE invoices (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id     UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  client_id      UUID REFERENCES clients(id),
  inv_no         VARCHAR(50) NOT NULL,
  template       SMALLINT    DEFAULT 1,
  client_name    VARCHAR(200) NOT NULL,
  client_gstin   VARCHAR(15),
  client_email   VARCHAR(150),
  client_address TEXT,
  inv_date       DATE NOT NULL,
  due_date       DATE,
  supply_type    supply_type DEFAULT 'inter',
  hsn_code       VARCHAR(12)  DEFAULT '998519',
  subtotal       NUMERIC(14,2) DEFAULT 0,
  discount       NUMERIC(12,2) DEFAULT 0,
  taxable        NUMERIC(14,2) DEFAULT 0,
  gst_rate       NUMERIC(5,2)  DEFAULT 18,
  cgst           NUMERIC(12,2) DEFAULT 0,
  sgst           NUMERIC(12,2) DEFAULT 0,
  igst           NUMERIC(12,2) DEFAULT 0,
  gst_amount     NUMERIC(12,2) DEFAULT 0,
  total          NUMERIC(14,2) DEFAULT 0,
  status         inv_status   DEFAULT 'pending',
  received       NUMERIC(14,2) DEFAULT 0,
  outstanding    NUMERIC(14,2) DEFAULT 0,
  pay_date       DATE,
  pay_mode       pay_mode,
  pay_utr        VARCHAR(100),
  shared_via     VARCHAR(50),
  shared_at      TIMESTAMPTZ,
  hold_reason    TEXT,
  released_at    TIMESTAMPTZ,
  irn            VARCHAR(100),
  pdf_url        TEXT,
  notes          TEXT,
  payroll_month  SMALLINT,
  payroll_year   SMALLINT,
  inv_mode       VARCHAR(20),
  created_by     UUID REFERENCES users(id),
  deleted_at     TIMESTAMPTZ,
  created_at     TIMESTAMPTZ DEFAULT NOW(),
  updated_at     TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(company_id, inv_no)
);

CREATE TABLE invoice_items (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  invoice_id    UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  company_id    UUID NOT NULL REFERENCES companies(id),
  sort_order    SMALLINT       DEFAULT 1,
  description   VARCHAR(500),
  role          VARCHAR(200),
  date_of_joining DATE,
  hsn_code      VARCHAR(12),
  calendar_days SMALLINT       DEFAULT 30,
  worked_days   NUMERIC(5,2)   DEFAULT 0,
  po_value      NUMERIC(14,2)  DEFAULT 0,
  billing_rate  NUMERIC(14,2)  DEFAULT 0,
  gst_row       NUMERIC(12,2)  DEFAULT 0,
  total_row     NUMERIC(14,2)  DEFAULT 0,
  contractor_id UUID REFERENCES contractor_masters(id)
);

CREATE TABLE invoice_payments (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  invoice_id  UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  company_id  UUID NOT NULL REFERENCES companies(id),
  amount      NUMERIC(14,2) NOT NULL,
  pay_date    DATE NOT NULL,
  pay_mode    pay_mode,
  utr_number  VARCHAR(100),
  reference   VARCHAR(200),
  notes       TEXT,
  recorded_by UUID REFERENCES users(id),
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ══════════════════════════════════════════════════════════════
-- ACCOUNTS & TRANSACTIONS
-- ══════════════════════════════════════════════════════════════
CREATE TABLE transactions (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id  UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  txn_type    txn_type NOT NULL,
  date        DATE NOT NULL,
  category    VARCHAR(100),
  description TEXT,
  amount      NUMERIC(14,2) NOT NULL,
  party       VARCHAR(200),
  pay_mode    pay_mode,
  bank        VARCHAR(150),
  reference   VARCHAR(200),
  gst_amount  NUMERIC(12,2) DEFAULT 0,
  tds_amount  NUMERIC(12,2) DEFAULT 0,
  invoice_id  UUID REFERENCES invoices(id),
  payroll_id  UUID REFERENCES payroll_records(id),
  notes       TEXT,
  created_by  UUID REFERENCES users(id),
  deleted_at  TIMESTAMPTZ,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ══════════════════════════════════════════════════════════════
-- TDS CHALLANS
-- ══════════════════════════════════════════════════════════════
CREATE TABLE tds_challans (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id   UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  month        SMALLINT NOT NULL,
  year         SMALLINT NOT NULL,
  tds_amount   NUMERIC(12,2) DEFAULT 0,
  deposited    BOOLEAN     DEFAULT false,
  challan_no   VARCHAR(50),
  deposit_date DATE,
  bank         VARCHAR(150),
  notes        TEXT,
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  updated_at   TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(company_id, month, year)
);

-- ══════════════════════════════════════════════════════════════
-- NOTIFICATIONS
-- ══════════════════════════════════════════════════════════════
CREATE TABLE notifications (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id  UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  user_id     UUID REFERENCES users(id),
  type        VARCHAR(50),
  title       VARCHAR(300),
  message     TEXT,
  entity_type VARCHAR(50),
  entity_id   UUID,
  read        BOOLEAN DEFAULT false,
  read_at     TIMESTAMPTZ,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ══════════════════════════════════════════════════════════════
-- AUDIT LOGS (partitioned by month)
-- ══════════════════════════════════════════════════════════════
CREATE TABLE audit_logs (
  id          UUID          DEFAULT uuid_generate_v4(),
  company_id  UUID REFERENCES companies(id),
  user_id     UUID REFERENCES users(id),
  user_name   VARCHAR(150),
  user_role   VARCHAR(50),
  action      audit_action NOT NULL,
  resource    VARCHAR(50)  NOT NULL,
  resource_id UUID,
  old_values  JSONB,
  new_values  JSONB,
  ip_address  INET,
  user_agent  TEXT,
  endpoint    VARCHAR(300),
  http_method VARCHAR(10),
  status_code SMALLINT,
  duration_ms INTEGER,
  created_at  TIMESTAMPTZ  DEFAULT NOW(),
  PRIMARY KEY (id, created_at)
) PARTITION BY RANGE (created_at);

CREATE TABLE audit_logs_2026_q1 PARTITION OF audit_logs FOR VALUES FROM ('2026-01-01') TO ('2026-04-01');
CREATE TABLE audit_logs_2026_q2 PARTITION OF audit_logs FOR VALUES FROM ('2026-04-01') TO ('2026-07-01');
CREATE TABLE audit_logs_2026_q3 PARTITION OF audit_logs FOR VALUES FROM ('2026-07-01') TO ('2026-10-01');
CREATE TABLE audit_logs_2026_q4 PARTITION OF audit_logs FOR VALUES FROM ('2026-10-01') TO ('2027-01-01');
CREATE TABLE audit_logs_default  PARTITION OF audit_logs DEFAULT;

-- ══════════════════════════════════════════════════════════════
-- FILE UPLOADS
-- ══════════════════════════════════════════════════════════════
CREATE TABLE file_uploads (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id    UUID NOT NULL REFERENCES companies(id),
  uploaded_by   UUID NOT NULL REFERENCES users(id),
  filename      VARCHAR(500) NOT NULL,
  original_name VARCHAR(500),
  mime_type     VARCHAR(100),
  size_bytes    BIGINT,
  storage_key   VARCHAR(1000),
  storage_url   TEXT,
  entity_type   VARCHAR(50),
  entity_id     UUID,
  processed     BOOLEAN DEFAULT false,
  processed_at  TIMESTAMPTZ,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- ══════════════════════════════════════════════════════════════
-- INDEXES
-- ══════════════════════════════════════════════════════════════
CREATE INDEX idx_users_company       ON users(company_id);
CREATE INDEX idx_users_email         ON users(email);
CREATE INDEX idx_employees_company   ON employees(company_id, status);
CREATE INDEX idx_employees_name_trgm ON employees USING GIN (name gin_trgm_ops);
CREATE INDEX idx_clients_company     ON clients(company_id, active);
CREATE INDEX idx_clients_name_trgm   ON clients USING GIN (name gin_trgm_ops);
CREATE INDEX idx_invoices_company    ON invoices(company_id);
CREATE INDEX idx_invoices_status     ON invoices(company_id, status);
CREATE INDEX idx_invoices_date       ON invoices(company_id, inv_date DESC);
CREATE INDEX idx_invoices_due        ON invoices(company_id, due_date) WHERE status NOT IN ('paid','cancelled');
CREATE INDEX idx_invoice_items_inv   ON invoice_items(invoice_id);
CREATE INDEX idx_payroll_emp_month   ON payroll_records(company_id, employee_id, year, month);
CREATE INDEX idx_contractors_company ON contractor_masters(company_id);
CREATE INDEX idx_sp_month_year       ON smart_payroll(company_id, year, month);
CREATE INDEX idx_transactions_date   ON transactions(company_id, date DESC);
CREATE INDEX idx_audit_company       ON audit_logs(company_id, created_at DESC);
CREATE INDEX idx_audit_user          ON audit_logs(user_id, created_at DESC);
CREATE INDEX idx_notifications_user  ON notifications(user_id, read, created_at DESC);
CREATE INDEX idx_attendance_emp_date ON attendance(company_id, employee_id, date);
CREATE INDEX idx_leave_emp           ON leave_requests(company_id, employee_id, status);

-- ══════════════════════════════════════════════════════════════
-- FOREIGN KEY BACK-REFS
-- ══════════════════════════════════════════════════════════════
ALTER TABLE contractor_masters ADD CONSTRAINT fk_cm_client  FOREIGN KEY (client_id)   REFERENCES clients(id);
ALTER TABLE smart_payroll      ADD CONSTRAINT fk_sp_invoice FOREIGN KEY (invoice_id)  REFERENCES invoices(id);

-- ══════════════════════════════════════════════════════════════
-- TRIGGER: updated_at
-- ══════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION fn_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END; $$;

DO $$ DECLARE t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'companies','users','employees','payroll_records','contractor_masters',
    'smart_payroll','clients','invoices','transactions','leave_requests','tds_challans'
  ] LOOP
    EXECUTE format(
      'CREATE TRIGGER trg_%s_upd BEFORE UPDATE ON %I FOR EACH ROW EXECUTE FUNCTION fn_updated_at()',
      t, t);
  END LOOP;
END $$;

-- ══════════════════════════════════════════════════════════════
-- TRIGGER: auto-update invoice status on payment
-- ══════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION fn_invoice_payment_sync()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE v_received NUMERIC; v_total NUMERIC;
BEGIN
  SELECT COALESCE(SUM(amount),0) INTO v_received FROM invoice_payments WHERE invoice_id = COALESCE(NEW.invoice_id, OLD.invoice_id);
  SELECT total INTO v_total FROM invoices WHERE id = COALESCE(NEW.invoice_id, OLD.invoice_id);
  UPDATE invoices SET
    received    = v_received,
    outstanding = GREATEST(0, v_total - v_received),
    status      = CASE WHEN v_received >= v_total THEN 'paid'::inv_status
                       WHEN v_received > 0        THEN 'partial'::inv_status
                       ELSE status END
  WHERE id = COALESCE(NEW.invoice_id, OLD.invoice_id);
  RETURN NEW;
END; $$;

CREATE TRIGGER trg_inv_payment_sync
  AFTER INSERT OR UPDATE OR DELETE ON invoice_payments
  FOR EACH ROW EXECUTE FUNCTION fn_invoice_payment_sync();

-- ══════════════════════════════════════════════════════════════
-- DEFAULT ROLE PERMISSIONS
-- ══════════════════════════════════════════════════════════════
INSERT INTO role_permissions (role, resource, action) VALUES
  -- admin
  ('admin','employees','create'),('admin','employees','read'),('admin','employees','update'),('admin','employees','delete'),('admin','employees','export'),
  ('admin','payroll','create'),('admin','payroll','read'),('admin','payroll','update'),('admin','payroll','approve'),('admin','payroll','export'),
  ('admin','invoices','create'),('admin','invoices','read'),('admin','invoices','update'),('admin','invoices','delete'),('admin','invoices','export'),
  ('admin','clients','create'),('admin','clients','read'),('admin','clients','update'),('admin','clients','delete'),
  ('admin','accounts','create'),('admin','accounts','read'),('admin','accounts','update'),('admin','accounts','export'),
  ('admin','compliance','read'),('admin','compliance','export'),
  ('admin','reports','read'),('admin','reports','export'),
  ('admin','settings','read'),('admin','settings','update'),
  ('admin','users','read'),('admin','users','create'),('admin','users','update'),('admin','users','delete'),
  ('admin','leaves','create'),('admin','leaves','read'),('admin','leaves','update'),('admin','leaves','approve'),
  -- billing_manager
  ('billing_manager','invoices','create'),('billing_manager','invoices','read'),('billing_manager','invoices','update'),('billing_manager','invoices','export'),
  ('billing_manager','clients','create'),('billing_manager','clients','read'),('billing_manager','clients','update'),
  ('billing_manager','payroll','read'),('billing_manager','accounts','read'),('billing_manager','reports','read'),
  -- hr_manager
  ('hr_manager','employees','create'),('hr_manager','employees','read'),('hr_manager','employees','update'),('hr_manager','employees','export'),
  ('hr_manager','payroll','create'),('hr_manager','payroll','read'),('hr_manager','payroll','update'),('hr_manager','payroll','approve'),
  ('hr_manager','attendance','create'),('hr_manager','attendance','read'),('hr_manager','attendance','update'),
  ('hr_manager','leaves','create'),('hr_manager','leaves','read'),('hr_manager','leaves','update'),('hr_manager','leaves','approve'),
  ('hr_manager','reports','read'),('hr_manager','compliance','read'),
  -- accountant
  ('accountant','accounts','create'),('accountant','accounts','read'),('accountant','accounts','update'),('accountant','accounts','export'),
  ('accountant','invoices','read'),('accountant','invoices','export'),
  ('accountant','payroll','read'),('accountant','reports','read'),('accountant','reports','export'),('accountant','compliance','read'),
  -- viewer
  ('viewer','employees','read'),('viewer','payroll','read'),('viewer','invoices','read'),
  ('viewer','clients','read'),('viewer','accounts','read'),('viewer','reports','read');

COMMIT;
