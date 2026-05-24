'use strict';
const router = require('express').Router();

const { authenticate }            = require('../middlewares/auth');
const rbac                        = require('../middlewares/rbac');
const { auditLog }                = require('../middlewares/errorHandler');
const { authLimiter, heavyLimiter } = require('../middlewares/rateLimiter');
const { subscriptionGuard }            = require('../middlewares/subscriptionGuard');

// Controllers
const auth    = require('../controllers/authController');
const empCtrl = require('../controllers/employeeController');
const invCtrl = require('../controllers/invoiceController');
const cliCtrl = require('../controllers/clientController');
const txnCtrl = require('../controllers/transactionController');
const dashCtrl = require('../controllers/dashboardController');
const { leave } = require('../controllers/leaveController');
const settings  = require('../controllers/settingsController');
const users     = require('../controllers/usersController');
const audit     = require('../controllers/auditController');
const notifs    = require('../controllers/notificationController');
const upload    = require('../controllers/uploadController');

// ── PUBLIC ROUTES ─────────────────────────────────────────────────────────
router.post('/auth/register',        authLimiter, auth.registerValidation, auth.register);
router.post('/auth/login',           authLimiter, auth.loginValidation,    auth.login);
router.post('/auth/refresh',         authLimiter,                           auth.refreshToken);
router.post('/auth/forgot-password', authLimiter,                          auth.forgotPassword);
router.post('/auth/reset-password',                                         auth.resetPassword);

// ── ALL ROUTES BELOW REQUIRE AUTHENTICATION ───────────────────────────────
router.use(authenticate);
router.use(subscriptionGuard);

// Auth (protected)
router.get ('/auth/me',              auth.me);
router.post('/auth/logout',          auth.logout);
router.post('/auth/change-password', auth.changePassword);

// ── DASHBOARD ─────────────────────────────────────────────────────────────
router.get('/dashboard', rbac.permit('reports','read'), dashCtrl.summary);

// ── EMPLOYEES — static routes BEFORE param routes ─────────────────────────
router.get   ('/employees',              rbac.permit('employees','read'),   empCtrl.list);
router.get   ('/employees/export/bank',  rbac.permit('payroll','export'),   empCtrl.exportBankFile);
router.post  ('/employees',              rbac.permit('employees','create'), auditLog('employees'), empCtrl.createValidation, empCtrl.create);
router.get   ('/employees/:id',          rbac.permit('employees','read'),   empCtrl.getOne);
router.put   ('/employees/:id',          rbac.permit('employees','update'), auditLog('employees'), empCtrl.update);
router.delete('/employees/:id',          rbac.permit('employees','delete'), auditLog('employees'), empCtrl.remove);
router.get   ('/employees/:id/payroll',  rbac.permit('payroll','read'),     empCtrl.getPayrollHistory);

// ── PAYROLL ───────────────────────────────────────────────────────────────
router.post('/payroll/process', rbac.permit('payroll','create'), heavyLimiter, auditLog('payroll'), empCtrl.processPayroll);

// ── INVOICES — static routes BEFORE param routes ──────────────────────────
router.get   ('/invoices',               rbac.permit('invoices','read'),   invCtrl.list);
router.get   ('/invoices/gstr1',         rbac.permit('compliance','read'), invCtrl.gstr1Export);
router.post  ('/invoices',               rbac.permit('invoices','create'), auditLog('invoices'), invCtrl.createValidation, invCtrl.create);
router.get   ('/invoices/:id',           rbac.permit('invoices','read'),   invCtrl.getOne);
router.put   ('/invoices/:id',           rbac.permit('invoices','update'), auditLog('invoices'), invCtrl.update);
router.delete('/invoices/:id',           rbac.permit('invoices','delete'), auditLog('invoices'), invCtrl.remove);
router.post  ('/invoices/:id/payment',   rbac.permit('invoices','update'), auditLog('invoices'), invCtrl.recordPayment);
router.post  ('/invoices/:id/hold',      rbac.permit('invoices','update'), auditLog('invoices'), invCtrl.holdInvoice);
router.post  ('/invoices/:id/release',   rbac.permit('invoices','update'), auditLog('invoices'), invCtrl.releaseInvoice);
router.post  ('/invoices/:id/whatsapp',  rbac.permit('invoices','read'),   invCtrl.shareWhatsApp);

// ── CLIENTS ───────────────────────────────────────────────────────────────
router.get   ('/clients',     rbac.permit('clients','read'),   cliCtrl.list);
router.post  ('/clients',     rbac.permit('clients','create'), auditLog('clients'), cliCtrl.create);
router.get   ('/clients/:id', rbac.permit('clients','read'),   cliCtrl.getOne);
router.put   ('/clients/:id', rbac.permit('clients','update'), auditLog('clients'), cliCtrl.update);
router.delete('/clients/:id', rbac.permit('clients','delete'), auditLog('clients'), cliCtrl.remove);

// ── TRANSACTIONS — static /pl BEFORE /:id ────────────────────────────────
router.get   ('/transactions',     rbac.permit('accounts','read'),   txnCtrl.list);
router.get   ('/transactions/pl',  rbac.permit('reports','read'),    txnCtrl.profitLoss);
router.post  ('/transactions',     rbac.permit('accounts','create'), auditLog('transactions'), txnCtrl.create);
router.put   ('/transactions/:id', rbac.permit('accounts','update'), auditLog('transactions'), txnCtrl.update);
router.delete('/transactions/:id', rbac.permit('accounts','update'), auditLog('transactions'), txnCtrl.remove);

// ── LEAVES ────────────────────────────────────────────────────────────────
router.get('/leaves',              rbac.permit('leaves','read'),   leave.list);
router.post('/leaves',             rbac.permit('leaves','create'), auditLog('leaves'), leave.create);
router.put('/leaves/:id/approve',  rbac.permit('leaves','approve'),auditLog('leaves'), leave.approve);
router.put('/leaves/:id/reject',   rbac.permit('leaves','approve'),auditLog('leaves'), leave.reject);

// ── SETTINGS ──────────────────────────────────────────────────────────────
router.get('/settings', rbac.permit('settings','read'),   settings.get);
router.put('/settings', rbac.permit('settings','update'), auditLog('settings'), settings.update);

// ── USERS (admin+) ────────────────────────────────────────────────────────
router.get   ('/users',     rbac.requireRank('admin'), users.list);
router.post  ('/users',     rbac.requireRank('admin'), auditLog('users'), users.invite);
router.put   ('/users/:id', rbac.requireRank('admin'), auditLog('users'), users.update);
router.delete('/users/:id', rbac.requireRank('admin'), auditLog('users'), users.remove);

// ── AUDIT LOGS (admin+) ───────────────────────────────────────────────────
router.get('/audit', rbac.requireRank('admin'), audit.list);

// ── NOTIFICATIONS — /read-all BEFORE /:id/read ────────────────────────────
router.get  ('/notifications',          notifs.list);
router.patch('/notifications/read-all', notifs.markAllRead);     // static first
router.patch('/notifications/:id/read', notifs.markRead);        // param second

// ── FILE UPLOAD ───────────────────────────────────────────────────────────
router.post('/upload',           upload.upload.single('file'), upload.handleUpload);
router.post('/upload/timesheet', heavyLimiter, upload.upload.single('file'), upload.parseTimesheet);

module.exports = router;
