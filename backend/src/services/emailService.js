'use strict';
const nodemailer = require('nodemailer');
const logger     = require('../utils/logger');

// Singleton transporter
let _transporter = null;

function getTransporter() {
  if (_transporter) return _transporter;
  _transporter = nodemailer.createTransport({
    host:   process.env.SMTP_HOST || 'smtp.gmail.com',
    port:   parseInt(process.env.SMTP_PORT || '587'),
    secure: process.env.SMTP_SECURE === 'true',
    auth:   { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
    pool:   true,
    maxConnections: 5,
    maxMessages:    100,
    rateDelta:      1000,
    rateLimit:      5,
  });
  return _transporter;
}

// ── Base HTML wrapper ──────────────────────────────────────────────────────
function wrapHtml(content, title = 'FinStack ERP') {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1"/>
  <title>${title}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #f8fafc; margin: 0; padding: 0; }
    .wrap { max-width: 600px; margin: 40px auto; background: #fff; border-radius: 12px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,.08); }
    .header { background: linear-gradient(135deg, #1d4ed8 0%, #3b82f6 100%); padding: 28px 32px; }
    .header h1 { color: #fff; margin: 0; font-size: 22px; font-weight: 700; }
    .header p { color: #bfdbfe; margin: 4px 0 0; font-size: 13px; }
    .body { padding: 32px; color: #1e293b; line-height: 1.6; }
    .body h2 { color: #1d4ed8; margin: 0 0 16px; font-size: 18px; }
    .btn { display: inline-block; background: #2563eb; color: #fff; padding: 12px 28px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 14px; margin: 20px 0; }
    .info-box { background: #f1f5f9; border-left: 4px solid #3b82f6; padding: 16px 20px; border-radius: 0 8px 8px 0; margin: 20px 0; }
    .info-row { display: flex; justify-content: space-between; padding: 6px 0; border-bottom: 1px solid #e2e8f0; font-size: 14px; }
    .info-row:last-child { border-bottom: none; }
    .info-label { color: #64748b; }
    .info-value { color: #0f172a; font-weight: 600; }
    .footer { background: #f8fafc; padding: 20px 32px; text-align: center; color: #94a3b8; font-size: 12px; border-top: 1px solid #e2e8f0; }
    .amount { font-size: 28px; font-weight: 700; color: #1d4ed8; }
    .badge { display: inline-block; padding: 3px 10px; border-radius: 20px; font-size: 12px; font-weight: 600; }
    .badge-success { background: #dcfce7; color: #166534; }
    .badge-warning { background: #fef9c3; color: #854d0e; }
    .badge-danger  { background: #fee2e2; color: #991b1b; }
  </style>
</head>
<body>
<div class="wrap">
  <div class="header">
    <h1>FinStack ERP</h1>
    <p>Enterprise Resource Planning — AVIIN JOBS SERVICES</p>
  </div>
  <div class="body">${content}</div>
  <div class="footer">
    <p>This email was sent by FinStack ERP. Do not reply to this email.</p>
    <p>© ${new Date().getFullYear()} ${companyName || 'FinStack ERP'}. All rights reserved.</p>
  </div>
</div>
</body>
</html>`;
}

// ── Email templates ────────────────────────────────────────────────────────
const templates = {
  password_reset: ({ name, resetUrl }) => ({
    subject: 'Reset Your FinStack Password',
    html: wrapHtml(`
      <h2>Password Reset Request</h2>
      <p>Hi <strong>${name}</strong>,</p>
      <p>We received a request to reset your FinStack ERP password. Click the button below to set a new password:</p>
      <a href="${resetUrl}" class="btn">Reset Password</a>
      <p style="color:#64748b;font-size:13px;">This link expires in <strong>1 hour</strong>. If you didn't request this, ignore this email — your password won't change.</p>
    `, 'Reset Password — FinStack'),
  }),

  welcome: ({ name, email, tempPassword, loginUrl }) => ({
    subject: `Welcome to FinStack ERP — Your Account is Ready`,
    html: wrapHtml(`
      <h2>Welcome, ${name}! 🎉</h2>
      <p>Your FinStack ERP account has been created. Here are your login credentials:</p>
      <div class="info-box">
        <div class="info-row"><span class="info-label">Email</span><span class="info-value">${email}</span></div>
        <div class="info-row"><span class="info-label">Temporary Password</span><span class="info-value">${tempPassword}</span></div>
      </div>
      <a href="${loginUrl || '#'}" class="btn">Login to FinStack</a>
      <p style="color:#dc2626;font-size:13px;">⚠️ Please change your password immediately after first login.</p>
    `, 'Welcome — FinStack ERP'),
  }),

  invoice_sent: ({ clientName, invNo, amount, dueDate, companyName }) => ({
    subject: `Invoice ${invNo} from ${companyName}`,
    html: wrapHtml(`
      <h2>Invoice from ${companyName}</h2>
      <p>Dear <strong>${clientName}</strong>,</p>
      <p>Please find your invoice details below:</p>
      <div class="info-box">
        <div class="info-row"><span class="info-label">Invoice No</span><span class="info-value">${invNo}</span></div>
        <div class="info-row"><span class="info-label">Amount</span><span class="info-value">₹${Number(amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span></div>
        <div class="info-row"><span class="info-label">Due Date</span><span class="info-value">${dueDate || 'As agreed'}</span></div>
      </div>
      <p>Please process the payment by the due date. For queries, reply to this email or contact us.</p>
      <p>Regards,<br/><strong>${companyName}</strong></p>
    `, `Invoice ${invNo}`),
  }),

  payment_received: ({ clientName, invNo, amount, utr, companyName }) => ({
    subject: `Payment Received — Invoice ${invNo}`,
    html: wrapHtml(`
      <h2>Payment Received ✓</h2>
      <p>Dear <strong>${clientName}</strong>,</p>
      <p>We have received your payment. Thank you!</p>
      <div class="info-box">
        <div class="info-row"><span class="info-label">Invoice No</span><span class="info-value">${invNo}</span></div>
        <div class="info-row"><span class="info-label">Amount Received</span><span class="info-value">₹${Number(amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span></div>
        ${utr ? `<div class="info-row"><span class="info-label">UTR / Ref</span><span class="info-value">${utr}</span></div>` : ''}
      </div>
      <p>Regards,<br/><strong>${companyName}</strong></p>
    `, `Payment Confirmed — ${invNo}`),
  }),

  invoice_reminder: ({ clientName, invNo, amount, dueDate, daysPastDue, companyName }) => ({
    subject: `${daysPastDue > 0 ? '⚠️ OVERDUE: ' : ''}Payment Reminder — Invoice ${invNo}`,
    html: wrapHtml(`
      <h2>${daysPastDue > 0 ? '⚠️ Payment Overdue' : '📋 Payment Reminder'}</h2>
      <p>Dear <strong>${clientName}</strong>,</p>
      <p>${daysPastDue > 0
          ? `Your payment is <strong>${daysPastDue} days overdue</strong>. Please process it immediately.`
          : `This is a friendly reminder that the following invoice is due soon.`}
      </p>
      <div class="info-box">
        <div class="info-row"><span class="info-label">Invoice No</span><span class="info-value">${invNo}</span></div>
        <div class="info-row"><span class="info-label">Outstanding</span><span class="info-value" style="color:#dc2626">₹${Number(amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span></div>
        <div class="info-row"><span class="info-label">Due Date</span><span class="info-value">${dueDate}</span></div>
      </div>
      <p>Regards,<br/><strong>${companyName}</strong></p>
    `, `Payment Reminder — ${invNo}`),
  }),

  payslip: ({ empName, month, year, gross, netPay, companyName }) => ({
    subject: `Payslip for ${month} ${year} — ${companyName}`,
    html: wrapHtml(`
      <h2>Salary Slip — ${month} ${year}</h2>
      <p>Dear <strong>${empName}</strong>,</p>
      <p>Your salary for <strong>${month} ${year}</strong> has been processed.</p>
      <div class="info-box">
        <div class="info-row"><span class="info-label">Gross Salary</span><span class="info-value">₹${Number(gross).toLocaleString('en-IN')}</span></div>
        <div class="info-row"><span class="info-label">Net Take-Home</span><span class="info-value" style="color:#166534">₹${Number(netPay).toLocaleString('en-IN')}</span></div>
      </div>
      <p>If you have any queries, please contact HR.</p>
      <p>Regards,<br/><strong>${companyName} — HR Team</strong></p>
    `, `Payslip ${month} ${year}`),
  }),

  tds_due: ({ month, year, amount, dueDate }) => ({
    subject: `TDS Deposit Due — ${month}/${year}`,
    html: wrapHtml(`
      <h2>🔔 TDS Deposit Reminder</h2>
      <p>TDS for the period <strong>${month}/${year}</strong> is due for deposit.</p>
      <div class="info-box">
        <div class="info-row"><span class="info-label">TDS Amount</span><span class="info-value">₹${Number(amount).toLocaleString('en-IN')}</span></div>
        <div class="info-row"><span class="info-label">Deposit By</span><span class="info-value" style="color:#dc2626">${dueDate}</span></div>
        <div class="info-row"><span class="info-label">Section</span><span class="info-value">Section 192 / 194C</span></div>
      </div>
      <p>Please deposit via Challan ITNS 281 at the nearest authorised bank or online at <a href="https://tin.tin.nsdl.com">TIN NSDL</a>.</p>
    `, 'TDS Reminder'),
  }),
};

// ── Send function ─────────────────────────────────────────────────────────
async function sendEmail(templateName, to, data, opts = {}) {
  if (!process.env.SMTP_USER) {
    logger.warn(`[Email] SMTP not configured — skipping ${templateName} to ${to}`);
    return { skipped: true, reason: 'SMTP_NOT_CONFIGURED' };
  }

  const tmpl = templates[templateName];
  if (!tmpl) throw new Error(`Unknown email template: ${templateName}`);

  const { subject, html } = tmpl(data);
  const transporter = getTransporter();

  try {
    const info = await transporter.sendMail({
      from:    `${data.companyName || 'FinStack ERP'} <${process.env.SMTP_USER}>`,
      to,
      subject: opts.subject || subject,
      html,
      ...opts,
    });
    logger.info(`[Email] ✓ Sent '${subject}' to ${to} [${info.messageId}]`);
    return { sent: true, messageId: info.messageId };
  } catch (err) {
    logger.error(`[Email] ✗ Failed to send to ${to}: ${err.message}`);
    throw err;
  }
}

// ── Verify SMTP connection ─────────────────────────────────────────────────
async function verifyConnection() {
  if (!process.env.SMTP_USER) return { ok: false, reason: 'SMTP_NOT_CONFIGURED' };
  try {
    await getTransporter().verify();
    logger.info('[Email] SMTP connection verified');
    return { ok: true };
  } catch (err) {
    logger.error('[Email] SMTP verification failed:', err.message);
    return { ok: false, reason: err.message };
  }
}

module.exports = { sendEmail, verifyConnection, templates };
