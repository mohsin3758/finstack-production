'use strict';
require('dotenv').config();
const { Worker }    = require('bullmq');
const { bullOpts }  = require('../config/redis');
const logger        = require('../utils/logger');
const dayjs         = require('dayjs');
const { sendEmail } = require('../services/emailService');

// ── Invoice Worker ─────────────────────────────────────────────────────────
const invoiceWorker = new Worker('invoice', async (job) => {
  const { Invoice, InvoiceItem, Company, Notification } = require('../models');
  const { Op } = require('sequelize');

  switch(job.name) {
    case 'generate_pdf': {
      const { invoice_id, company_id } = job.data;
      const inv = await Invoice.findByPk(invoice_id, { include:[{ model:InvoiceItem, as:'items' }] });
      if(!inv) throw new Error(`Invoice ${invoice_id} not found`);
      // TODO: integrate puppeteer for real PDF generation
      const pdfUrl = `/uploads/invoices/${inv.inv_no.replace(/[^a-zA-Z0-9-]/g,'_')}.pdf`;
      await inv.update({ pdf_url: pdfUrl });
      logger.info(`[Invoice] PDF generated: ${inv.inv_no}`);
      return { pdf_url: pdfUrl };
    }

    case 'send_email': {
      const { to, subject, html, invoice_id } = job.data;
      await sendEmail('invoice_sent', to, { subject, html, companyName: 'FinStack ERP' }, { subject });
      if(invoice_id) {
        await Invoice.update({ shared_via:'email', shared_at:new Date() }, { where:{ id:invoice_id } });
      }
      return { sent: true, to };
    }

    case 'check_overdue': {
      const { company_id } = job.data;
      const today = dayjs().format('YYYY-MM-DD');
      const result = await Invoice.update(
        { status: 'overdue' },
        { where: { company_id, status:{ [Op.in]:['pending','partial','sent'] }, due_date:{ [Op.lt]:today } } }
      );
      logger.info(`[Invoice] Overdue check: ${result[0]} invoices updated`);
      return { updated: result[0] };
    }

    case 'parse_timesheet': {
      // Timesheet parsing logic — return raw data for API to process
      logger.info(`[Invoice] Parsing timesheet: ${job.data.filename}`);
      return { parsed: true, filename: job.data.filename };
    }

    default:
      logger.warn(`[Invoice] Unknown job: ${job.name}`);
  }
}, { connection: bullOpts, concurrency: 3 });

// ── Email Worker — delegates to emailService (single source of templates) ──
const emailWorker = new Worker('email', async (job) => {
  const { to, ...data } = job.data;
  // job.name is the template name (password_reset, welcome, invoice_sent, etc.)
  const result = await sendEmail(job.name, to, { ...data, companyName: data.companyName || 'FinStack ERP' });
  logger.info(`[Email] ${result.skipped ? 'Skipped' : 'Sent'} '${job.name}' to ${to}`);
  return result;
}, { connection: bullOpts, concurrency: 5 });

// ── Notification Worker ────────────────────────────────────────────────────
const notifWorker = new Worker('notification', async (job) => {
  const { Notification } = require('../models');
  const { company_id, user_id, type, title, message, entity_type, entity_id } = job.data;
  await Notification.create({ company_id, user_id, type, title, message, entity_type, entity_id });
  logger.info(`[Notif] Created: ${type} → user ${user_id}`);
}, { connection:bullOpts, concurrency:10 });

// ── Payroll Worker ─────────────────────────────────────────────────────────
const payrollWorker = new Worker('payroll', async (job) => {
  switch(job.name) {
    case 'bulk_process': {
      const { Employee, PayrollRecord } = require('../models');
      const { calculatePayroll } = require('../services/payrollService');
      const { Op } = require('sequelize');
      const { company_id, month, year } = job.data;
      const emps = await Employee.findAll({ where:{ company_id, status:'active' } });
      let done = 0;
      for(const emp of emps) {
        const calc = calculatePayroll(emp.toJSON(), { present_days:26, working_days:26 });
        await PayrollRecord.upsert({ company_id, employee_id:emp.id, month, year, ...calc, status:'draft' });
        done++;
      }
      logger.info(`[Payroll] Bulk processed ${done} employees for ${month}/${year}`);
      return { processed: done };
    }
  }
}, { connection:bullOpts, concurrency:2 });

// ── Error handlers ─────────────────────────────────────────────────────────
[invoiceWorker, emailWorker, notifWorker, payrollWorker].forEach(w => {
  w.on('completed', (job) => logger.info(`[Worker] Job ${job.id} ✓`));
  w.on('failed',   (job, err) => logger.error(`[Worker] Job ${job?.id} ✗: ${err.message}`));
  w.on('error',    (err) => logger.error('[Worker] Error:', err.message));
});

// ── Graceful shutdown ──────────────────────────────────────────────────────
process.on('SIGTERM', async () => {
  logger.info('Workers shutting down…');
  await Promise.all([invoiceWorker, emailWorker, notifWorker, payrollWorker].map(w => w.close()));
  process.exit(0);
});

logger.info('✓ FinStack Background Workers running');
logger.info('  Invoice (×3) · Email (×5) · Notification (×10) · Payroll (×2)');
