'use strict';
const { sequelize, Sequelize } = require('../config/database');
const { DataTypes } = Sequelize;

// ── Company ────────────────────────────────────────────────────────────────
const Company = sequelize.define('Company', {
  id:           { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
  name:         { type: DataTypes.STRING(200), allowNull: false },
  slug:         { type: DataTypes.STRING(100), unique: true, allowNull: false },
  gstin:        { type: DataTypes.STRING(15) },
  pan:          { type: DataTypes.STRING(10) },
  address:      { type: DataTypes.TEXT },
  city:         { type: DataTypes.STRING(100) },
  state:        { type: DataTypes.STRING(100) },
  state_code:   { type: DataTypes.STRING(4) },
  phone:        { type: DataTypes.STRING(15) },
  email:        { type: DataTypes.STRING(150) },
  bank_name:    { type: DataTypes.STRING(150) },
  bank_account: { type: DataTypes.STRING(25) },
  bank_ifsc:    { type: DataTypes.STRING(12) },
  bank_branch:  { type: DataTypes.STRING(150) },
  inv_prefix:   { type: DataTypes.STRING(10),  defaultValue: 'INV' },
  inv_counter:  { type: DataTypes.INTEGER,     defaultValue: 1 },
  logo_url:     { type: DataTypes.TEXT },
  subscription: { type: DataTypes.STRING(50),  defaultValue: 'trial' },
  subscription_end: { type: DataTypes.DATEONLY },
  active:       { type: DataTypes.BOOLEAN,     defaultValue: true },
  settings:     { type: DataTypes.JSONB,       defaultValue: {} },
}, { tableName: 'companies', paranoid: true });

// ── User ───────────────────────────────────────────────────────────────────
const User = sequelize.define('User', {
  id:            { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
  company_id:    { type: DataTypes.UUID, allowNull: false },
  name:          { type: DataTypes.STRING(150), allowNull: false },
  email:         { type: DataTypes.STRING(150), allowNull: false },
  password_hash: { type: DataTypes.STRING(255), allowNull: false },
  role:          { type: DataTypes.ENUM('super_admin','admin','billing_manager','hr_manager','accountant','viewer'), defaultValue: 'viewer' },
  status:        { type: DataTypes.ENUM('active','inactive','suspended','pending'), defaultValue: 'active' },
  phone:         { type: DataTypes.STRING(15) },
  avatar_url:    { type: DataTypes.TEXT },
  last_login:    { type: DataTypes.DATE },
  login_count:   { type: DataTypes.INTEGER, defaultValue: 0 },
  failed_logins: { type: DataTypes.INTEGER, defaultValue: 0 },
  locked_until:  { type: DataTypes.DATE },
  reset_token:   { type: DataTypes.STRING(255) },
  reset_expires: { type: DataTypes.DATE },
  mfa_enabled:   { type: DataTypes.BOOLEAN, defaultValue: false },
  mfa_secret:    { type: DataTypes.STRING(100) },
  permissions:   { type: DataTypes.JSONB, defaultValue: {} },
  preferences:   { type: DataTypes.JSONB, defaultValue: {} },
}, { tableName: 'users', paranoid: true });

// ── Employee ───────────────────────────────────────────────────────────────
const Employee = sequelize.define('Employee', {
  id:            { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
  company_id:    { type: DataTypes.UUID, allowNull: false },
  code:          { type: DataTypes.STRING(30) },
  name:          { type: DataTypes.STRING(150), allowNull: false },
  designation:   { type: DataTypes.STRING(100) },
  department:    { type: DataTypes.STRING(100) },
  emp_type:      { type: DataTypes.ENUM('permanent','contract','intern','consultant'), defaultValue: 'permanent' },
  status:        { type: DataTypes.ENUM('active','inactive','notice','separated'), defaultValue: 'active' },
  date_of_joining: { type: DataTypes.DATEONLY },
  date_of_birth:   { type: DataTypes.DATEONLY },
  gender:        { type: DataTypes.STRING(10) },
  email:         { type: DataTypes.STRING(150) },
  phone:         { type: DataTypes.STRING(15) },
  pan:           { type: DataTypes.STRING(10) },
  aadhar:        { type: DataTypes.STRING(16) },
  uan:           { type: DataTypes.STRING(12) },
  basic:         { type: DataTypes.DECIMAL(12,2), defaultValue: 0 },
  hra:           { type: DataTypes.DECIMAL(12,2), defaultValue: 0 },
  da:            { type: DataTypes.DECIMAL(12,2), defaultValue: 0 },
  special_allow: { type: DataTypes.DECIMAL(12,2), defaultValue: 0 },
  lta:           { type: DataTypes.DECIMAL(12,2), defaultValue: 0 },
  pf_enrolled:   { type: DataTypes.SMALLINT, defaultValue: 1 },
  esi_enrolled:  { type: DataTypes.SMALLINT, defaultValue: 0 },
  pt_enrolled:   { type: DataTypes.SMALLINT, defaultValue: 1 },
  tds_rate:      { type: DataTypes.DECIMAL(5,2), defaultValue: 0 },
  bank_name:     { type: DataTypes.STRING(150) },
  bank_account:  { type: DataTypes.STRING(25) },
  bank_ifsc:     { type: DataTypes.STRING(12) },
  address:       { type: DataTypes.TEXT },
  city:          { type: DataTypes.STRING(100) },
  state:         { type: DataTypes.STRING(100) },
  created_by:    { type: DataTypes.UUID },
}, { tableName: 'employees', paranoid: true });

// ── Client ─────────────────────────────────────────────────────────────────
const Client = sequelize.define('Client', {
  id:            { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
  company_id:    { type: DataTypes.UUID, allowNull: false },
  name:          { type: DataTypes.STRING(200), allowNull: false },
  gstin:         { type: DataTypes.STRING(15) },
  pan:           { type: DataTypes.STRING(10) },
  contact_person:{ type: DataTypes.STRING(150) },
  email:         { type: DataTypes.STRING(150) },
  phone:         { type: DataTypes.STRING(15) },
  address:       { type: DataTypes.TEXT },
  city:          { type: DataTypes.STRING(100) },
  state:         { type: DataTypes.STRING(100) },
  supply_type:   { type: DataTypes.ENUM('intra','inter'), defaultValue: 'inter' },
  gst_rate:      { type: DataTypes.DECIMAL(5,2), defaultValue: 18 },
  payment_terms: { type: DataTypes.SMALLINT,     defaultValue: 30 },
  hsn_code:      { type: DataTypes.STRING(12),   defaultValue: '998519' },
  service_desc:  { type: DataTypes.STRING(255) },
  active:        { type: DataTypes.BOOLEAN,      defaultValue: true },
}, { tableName: 'clients', paranoid: true });

// ── Invoice ────────────────────────────────────────────────────────────────
const Invoice = sequelize.define('Invoice', {
  id:            { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
  company_id:    { type: DataTypes.UUID, allowNull: false },
  client_id:     { type: DataTypes.UUID },
  inv_no:        { type: DataTypes.STRING(50), allowNull: false },
  template:      { type: DataTypes.SMALLINT, defaultValue: 1 },
  client_name:   { type: DataTypes.STRING(200), allowNull: false },
  client_gstin:  { type: DataTypes.STRING(15) },
  client_email:  { type: DataTypes.STRING(150) },
  client_address:{ type: DataTypes.TEXT },
  inv_date:      { type: DataTypes.DATEONLY, allowNull: false },
  due_date:      { type: DataTypes.DATEONLY },
  supply_type:   { type: DataTypes.ENUM('intra','inter'), defaultValue: 'inter' },
  hsn_code:      { type: DataTypes.STRING(12) },
  subtotal:      { type: DataTypes.DECIMAL(14,2), defaultValue: 0 },
  discount:      { type: DataTypes.DECIMAL(12,2), defaultValue: 0 },
  taxable:       { type: DataTypes.DECIMAL(14,2), defaultValue: 0 },
  gst_rate:      { type: DataTypes.DECIMAL(5,2),  defaultValue: 18 },
  cgst:          { type: DataTypes.DECIMAL(12,2), defaultValue: 0 },
  sgst:          { type: DataTypes.DECIMAL(12,2), defaultValue: 0 },
  igst:          { type: DataTypes.DECIMAL(12,2), defaultValue: 0 },
  gst_amount:    { type: DataTypes.DECIMAL(12,2), defaultValue: 0 },
  total:         { type: DataTypes.DECIMAL(14,2), defaultValue: 0 },
  status:        { type: DataTypes.ENUM('draft','pending','sent','paid','partial','overdue','cancelled','hold'), defaultValue: 'pending' },
  received:      { type: DataTypes.DECIMAL(14,2), defaultValue: 0 },
  outstanding:   { type: DataTypes.DECIMAL(14,2), defaultValue: 0 },
  pay_date:      { type: DataTypes.DATEONLY },
  pay_mode:      { type: DataTypes.ENUM('NEFT','IMPS','RTGS','UPI','cheque','cash','card') },
  pay_utr:       { type: DataTypes.STRING(100) },
  shared_via:    { type: DataTypes.STRING(50) },
  shared_at:     { type: DataTypes.DATE },
  hold_reason:   { type: DataTypes.TEXT },
  released_at:   { type: DataTypes.DATE },
  pdf_url:       { type: DataTypes.TEXT },
  notes:         { type: DataTypes.TEXT },
  payroll_month: { type: DataTypes.SMALLINT },
  payroll_year:  { type: DataTypes.SMALLINT },
  inv_mode:      { type: DataTypes.STRING(20) },
  created_by:    { type: DataTypes.UUID },
}, { tableName: 'invoices', paranoid: true });

// ── InvoiceItem ────────────────────────────────────────────────────────────
const InvoiceItem = sequelize.define('InvoiceItem', {
  id:            { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
  invoice_id:    { type: DataTypes.UUID, allowNull: false },
  company_id:    { type: DataTypes.UUID, allowNull: false },
  sort_order:    { type: DataTypes.SMALLINT, defaultValue: 1 },
  description:   { type: DataTypes.STRING(500) },
  role:          { type: DataTypes.STRING(200) },
  date_of_joining:{ type: DataTypes.DATEONLY },
  hsn_code:      { type: DataTypes.STRING(12) },
  calendar_days: { type: DataTypes.SMALLINT, defaultValue: 30 },
  worked_days:   { type: DataTypes.DECIMAL(5,2), defaultValue: 0 },
  po_value:      { type: DataTypes.DECIMAL(14,2), defaultValue: 0 },
  billing_rate:  { type: DataTypes.DECIMAL(14,2), defaultValue: 0 },
  gst_row:       { type: DataTypes.DECIMAL(12,2), defaultValue: 0 },
  total_row:     { type: DataTypes.DECIMAL(14,2), defaultValue: 0 },
  contractor_id: { type: DataTypes.UUID },
}, { tableName: 'invoice_items', timestamps: false });

// ── PayrollRecord ──────────────────────────────────────────────────────────
const PayrollRecord = sequelize.define('PayrollRecord', {
  id:              { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
  company_id:      { type: DataTypes.UUID, allowNull: false },
  employee_id:     { type: DataTypes.UUID, allowNull: false },
  month:           { type: DataTypes.SMALLINT, allowNull: false },
  year:            { type: DataTypes.SMALLINT, allowNull: false },
  calendar_days:   { type: DataTypes.SMALLINT, defaultValue: 30 },
  working_days:    { type: DataTypes.SMALLINT, defaultValue: 26 },
  present_days:    { type: DataTypes.DECIMAL(5,2), defaultValue: 0 },
  leave_days:      { type: DataTypes.DECIMAL(5,2), defaultValue: 0 },
  basic_earned:    { type: DataTypes.DECIMAL(12,2), defaultValue: 0 },
  hra_earned:      { type: DataTypes.DECIMAL(12,2), defaultValue: 0 },
  da_earned:       { type: DataTypes.DECIMAL(12,2), defaultValue: 0 },
  special_earned:  { type: DataTypes.DECIMAL(12,2), defaultValue: 0 },
  lta_earned:      { type: DataTypes.DECIMAL(12,2), defaultValue: 0 },
  other_allow:     { type: DataTypes.DECIMAL(12,2), defaultValue: 0 },
  gross:           { type: DataTypes.DECIMAL(12,2), defaultValue: 0 },
  pf_employee:     { type: DataTypes.DECIMAL(12,2), defaultValue: 0 },
  pf_employer:     { type: DataTypes.DECIMAL(12,2), defaultValue: 0 },
  esi_employee:    { type: DataTypes.DECIMAL(12,2), defaultValue: 0 },
  esi_employer:    { type: DataTypes.DECIMAL(12,2), defaultValue: 0 },
  pt:              { type: DataTypes.DECIMAL(12,2), defaultValue: 0 },
  tds:             { type: DataTypes.DECIMAL(12,2), defaultValue: 0 },
  advance:         { type: DataTypes.DECIMAL(12,2), defaultValue: 0 },
  other_deduction: { type: DataTypes.DECIMAL(12,2), defaultValue: 0 },
  total_deduction: { type: DataTypes.DECIMAL(12,2), defaultValue: 0 },
  net_pay:         { type: DataTypes.DECIMAL(12,2), defaultValue: 0 },
  status:          { type: DataTypes.STRING(20), defaultValue: 'draft' },
  payment_date:    { type: DataTypes.DATEONLY },
  payment_mode:    { type: DataTypes.ENUM('NEFT','IMPS','RTGS','UPI','cheque','cash','card') },
  payment_ref:     { type: DataTypes.STRING(100) },
  processed_by:    { type: DataTypes.UUID },
  approved_by:     { type: DataTypes.UUID },
  notes:           { type: DataTypes.TEXT },
}, { tableName: 'payroll_records', paranoid: false });

// ── Transaction ────────────────────────────────────────────────────────────
const Transaction = sequelize.define('Transaction', {
  id:          { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
  company_id:  { type: DataTypes.UUID, allowNull: false },
  txn_type:    { type: DataTypes.ENUM('income','expense','contra','journal'), allowNull: false },
  date:        { type: DataTypes.DATEONLY, allowNull: false },
  category:    { type: DataTypes.STRING(100) },
  description: { type: DataTypes.TEXT },
  amount:      { type: DataTypes.DECIMAL(14,2), allowNull: false },
  party:       { type: DataTypes.STRING(200) },
  pay_mode:    { type: DataTypes.ENUM('NEFT','IMPS','RTGS','UPI','cheque','cash','card') },
  bank:        { type: DataTypes.STRING(150) },
  reference:   { type: DataTypes.STRING(200) },
  gst_amount:  { type: DataTypes.DECIMAL(12,2), defaultValue: 0 },
  tds_amount:  { type: DataTypes.DECIMAL(12,2), defaultValue: 0 },
  invoice_id:  { type: DataTypes.UUID },
  payroll_id:  { type: DataTypes.UUID },
  notes:       { type: DataTypes.TEXT },
  created_by:  { type: DataTypes.UUID },
}, { tableName: 'transactions', paranoid: true });

// ── LeaveRequest ───────────────────────────────────────────────────────────
const LeaveRequest = sequelize.define('LeaveRequest', {
  id:               { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
  company_id:       { type: DataTypes.UUID, allowNull: false },
  employee_id:      { type: DataTypes.UUID, allowNull: false },
  leave_type:       { type: DataTypes.ENUM('EL','CL','SL','ML','PL','CO','LWP'), allowNull: false },
  from_date:        { type: DataTypes.DATEONLY, allowNull: false },
  to_date:          { type: DataTypes.DATEONLY, allowNull: false },
  days:             { type: DataTypes.DECIMAL(5,2), allowNull: false },
  reason:           { type: DataTypes.TEXT },
  status:           { type: DataTypes.ENUM('pending','approved','rejected','cancelled'), defaultValue: 'pending' },
  approved_by:      { type: DataTypes.UUID },
  approved_at:      { type: DataTypes.DATE },
  rejection_reason: { type: DataTypes.TEXT },
}, { tableName: 'leave_requests', paranoid: false });

// ── AuditLog ───────────────────────────────────────────────────────────────
const AuditLog = sequelize.define('AuditLog', {
  id:          { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
  company_id:  { type: DataTypes.UUID },
  user_id:     { type: DataTypes.UUID },
  user_name:   { type: DataTypes.STRING(150) },
  user_role:   { type: DataTypes.STRING(50) },
  action:      { type: DataTypes.STRING(30), allowNull: false },
  resource:    { type: DataTypes.STRING(50), allowNull: false },
  resource_id: { type: DataTypes.UUID },
  old_values:  { type: DataTypes.JSONB },
  new_values:  { type: DataTypes.JSONB },
  ip_address:  { type: DataTypes.STRING(45) },
  user_agent:  { type: DataTypes.TEXT },
  endpoint:    { type: DataTypes.STRING(300) },
  http_method: { type: DataTypes.STRING(10) },
  status_code: { type: DataTypes.SMALLINT },
  duration_ms: { type: DataTypes.INTEGER },
  created_at:  { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
}, { tableName: 'audit_logs', timestamps: false, updatedAt: false });

// ── Notification ───────────────────────────────────────────────────────────
const Notification = sequelize.define('Notification', {
  id:          { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
  company_id:  { type: DataTypes.UUID, allowNull: false },
  user_id:     { type: DataTypes.UUID },
  type:        { type: DataTypes.STRING(50) },
  title:       { type: DataTypes.STRING(300) },
  message:     { type: DataTypes.TEXT },
  entity_type: { type: DataTypes.STRING(50) },
  entity_id:   { type: DataTypes.UUID },
  read:        { type: DataTypes.BOOLEAN, defaultValue: false },
  read_at:     { type: DataTypes.DATE },
}, { tableName: 'notifications', updatedAt: false });

// ══════════════════════════════════════════════════════════════
// ASSOCIATIONS
// ══════════════════════════════════════════════════════════════
Company.hasMany(User,          { foreignKey: 'company_id', as: 'users' });
Company.hasMany(Employee,      { foreignKey: 'company_id', as: 'employees' });
Company.hasMany(Client,        { foreignKey: 'company_id', as: 'clients' });
Company.hasMany(Invoice,       { foreignKey: 'company_id', as: 'invoices' });
Company.hasMany(Transaction,   { foreignKey: 'company_id', as: 'transactions' });
Company.hasMany(PayrollRecord, { foreignKey: 'company_id', as: 'payrollRecords' });

User.belongsTo(Company,        { foreignKey: 'company_id', as: 'company' });
Employee.belongsTo(Company,    { foreignKey: 'company_id', as: 'company' });
Client.belongsTo(Company,      { foreignKey: 'company_id', as: 'company' });
Invoice.belongsTo(Company,     { foreignKey: 'company_id', as: 'company' });

Invoice.belongsTo(Client,       { foreignKey: 'client_id',  as: 'client' });
Client.hasMany(Invoice,         { foreignKey: 'client_id',  as: 'invoices' });

Invoice.hasMany(InvoiceItem,    { foreignKey: 'invoice_id', as: 'items', onDelete: 'CASCADE' });
InvoiceItem.belongsTo(Invoice,  { foreignKey: 'invoice_id', as: 'invoice' });

Employee.hasMany(PayrollRecord, { foreignKey: 'employee_id', as: 'payrollRecords' });
PayrollRecord.belongsTo(Employee,{ foreignKey: 'employee_id', as: 'employee' });

Employee.hasMany(LeaveRequest,  { foreignKey: 'employee_id', as: 'leaveRequests' });
LeaveRequest.belongsTo(Employee,{ foreignKey: 'employee_id', as: 'employee' });

module.exports = {
  sequelize, Sequelize,
  Company, User, Employee, Client,
  Invoice, InvoiceItem, PayrollRecord,
  Transaction, LeaveRequest, AuditLog, Notification,
};
