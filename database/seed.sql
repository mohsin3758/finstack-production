BEGIN;

-- ============================================================
-- FINSTACK SEED DATA — AVIIN JOBS SERVICES
-- ============================================================

-- Company
INSERT INTO companies (id, name, slug, gstin, pan, address, city, state, state_code,
  phone, email, bank_name, bank_account, bank_ifsc, bank_branch, inv_prefix, inv_counter)
VALUES (
  'a0000000-0000-0000-0000-000000000001',
  'AVIIN JOBS SERVICES', 'aviin-jobs-services',
  '29BCXPM5845F1ZU', 'BCXPM5845F',
  'S-21/2-3, 2nd Floor, Asian Business Center, SP Office Road, Kalaburagi – 585102',
  'Kalaburagi', 'Karnataka', '29',
  '9900000000', 'info@aviinjobs.com',
  'Punjab National Bank', '13821652000062', 'PUNB0212420', 'Super Market, Kalaburagi',
  'INV', 346
)
ON CONFLICT DO NOTHING;

-- Admin user (password: Admin@2026)
INSERT INTO users (id, company_id, name, email, password_hash, role, status)
VALUES (
  'b0000000-0000-0000-0000-000000000001',
  'a0000000-0000-0000-0000-000000000001',
  'Admin User', 'admin@aviinjobs.com',
  '$2b$12$NBAUt0W83GS88g2Ws28cpOde5plP/kfvXuoNlPM5ajxoR4elhEOTK',  -- Admin@2026
  'admin', 'active'
)
ON CONFLICT DO NOTHING;

-- Clients
INSERT INTO clients (id, company_id, name, gstin, pan, contact_person, email, phone,
  address, city, state, supply_type, gst_rate, payment_terms, hsn_code, service_desc)
VALUES
  ('c0000000-0000-0000-0000-000000000001',
   'a0000000-0000-0000-0000-000000000001',
   'NeoSoft Technologies Pvt Ltd', '27AABCN1234F1Z5', 'AABCN1234F',
   'Rajesh Sharma', 'billing@neosoft.in', '9876543210',
   'Mahad Industrial Area, Navi Mumbai', 'Mumbai', 'Maharashtra',
   'inter', 18, 30, '998519', 'IT Staffing Services'),

  ('c0000000-0000-0000-0000-000000000002',
   'a0000000-0000-0000-0000-000000000001',
   'Invenio Business Solutions', '27AABCI7442L1ZA', 'AABCI7442L',
   'Priya Mehta', 'accounts@invenio.com', '9988776655',
   'Empire Tower, Airoli, Navi Mumbai', 'Navi Mumbai', 'Maharashtra',
   'inter', 18, 30, '998519', 'SAP Consulting'),

  ('c0000000-0000-0000-0000-000000000003',
   'a0000000-0000-0000-0000-000000000001',
   'Embital Technologies', '07AABCE5678G1Z3', 'AABCE5678G',
   'Amit Singh', 'finance@embital.com', '9123456789',
   'Sector 62, IT Park, Noida', 'Noida', 'Uttar Pradesh',
   'inter', 18, 45, '998519', 'Cloud & Azure Services')
ON CONFLICT DO NOTHING;

-- Contractors (Smart Payroll Masters)
INSERT INTO contractor_masters (id, company_id, name, client_id, role, project, location,
  date_of_joining, po_value, monthly_salary, calendar_days, tds_pct, extra_expense,
  contractor_gst, hsn_code, active)
VALUES
  ('d0000000-0000-0000-0000-000000000001',
   'a0000000-0000-0000-0000-000000000001',
   'Manoj Kumar', 'c0000000-0000-0000-0000-000000000001',
   'React JS Developer', 'Portal Revamp', 'Mumbai',
   '2024-08-15', 140000, 132551, 30, 10, 0, false, '998519', true),

  ('d0000000-0000-0000-0000-000000000002',
   'a0000000-0000-0000-0000-000000000001',
   'Rizvi Hussain', 'c0000000-0000-0000-0000-000000000002',
   'SAP BASIS Consultant', 'KSA ERP Implementation', 'KSA',
   '2026-02-19', 644925, 450000, 22, 10, 32246, true, '998519', true),

  ('d0000000-0000-0000-0000-000000000003',
   'a0000000-0000-0000-0000-000000000001',
   'Arpan Gupta', 'c0000000-0000-0000-0000-000000000003',
   'Azure Architect', 'Cloud Migration', 'Pan India',
   '2025-01-10', 200000, 180000, 30, 0, 20000, false, '998519', true)
ON CONFLICT DO NOTHING;

-- Employees (internal)
INSERT INTO employees (id, company_id, code, name, designation, department,
  date_of_joining, email, phone, pan, bank_name, bank_account, bank_ifsc,
  basic, hra, pf_enrolled, esi_enrolled, pt_enrolled)
VALUES
  ('e0000000-0000-0000-0000-000000000001',
   'a0000000-0000-0000-0000-000000000001',
   'EMP001', 'Rajesh Kumar', 'Lead Developer', 'IT',
   '2024-01-15', 'rajesh@aviinjobs.com', '9876543210', 'ABCDE1234F',
   'State Bank of India', '12345678901234', 'SBIN0001234',
   35000, 14000, 1, 0, 1),

  ('e0000000-0000-0000-0000-000000000002',
   'a0000000-0000-0000-0000-000000000001',
   'EMP002', 'Priya Sharma', 'HR Manager', 'HR',
   '2024-03-01', 'priya@aviinjobs.com', '9123456789', 'BCDEF2345G',
   'HDFC Bank', '98765432109876', 'HDFC0001234',
   24000, 9600, 1, 1, 1),

  ('e0000000-0000-0000-0000-000000000003',
   'a0000000-0000-0000-0000-000000000001',
   'EMP003', 'Amit Patel', 'Business Analyst', 'Operations',
   '2025-01-10', 'amit@aviinjobs.com', '9000012345', 'CDEFG3456H',
   'Axis Bank', '11223344556677', 'UTIB0001234',
   18000, 7200, 1, 0, 1)
ON CONFLICT DO NOTHING;

-- Sample invoice
INSERT INTO invoices (id, company_id, client_id, inv_no, template, client_name, client_gstin,
  client_email, inv_date, due_date, supply_type, gst_rate, subtotal, taxable,
  igst, gst_amount, total, outstanding, status)
VALUES (
  'f0000000-0000-0000-0000-000000000001',
  'a0000000-0000-0000-0000-000000000001',
  'c0000000-0000-0000-0000-000000000001',
  'INV-345', 1, 'NeoSoft Technologies Pvt Ltd', '27AABCN1234F1Z5',
  'billing@neosoft.in',
  '2026-05-31', '2026-06-30', 'inter', 18,
  140000, 140000, 25200, 25200, 165200, 165200, 'pending'
)
ON CONFLICT DO NOTHING;

INSERT INTO invoice_items (invoice_id, company_id, sort_order, description, role,
  hsn_code, calendar_days, worked_days, po_value, billing_rate, gst_row, total_row, contractor_id)
VALUES (
  'f0000000-0000-0000-0000-000000000001',
  'a0000000-0000-0000-0000-000000000001',
  1, 'Manoj Kumar', 'React JS Developer',
  '998519', 30, 30, 140000, 140000, 25200, 165200,
  'd0000000-0000-0000-0000-000000000001'
)
ON CONFLICT DO NOTHING;

-- TDS challan
INSERT INTO tds_challans (company_id, month, year, tds_amount, deposited, challan_no)
VALUES (
  'a0000000-0000-0000-0000-000000000001', 4, 2026, 58255, false, NULL
)
ON CONFLICT DO NOTHING;

COMMIT;
