'use strict';
// ── queues.js ─────────────────────────────────────────────────────────────
const { Queue }   = require('bullmq');
const { bullOpts }= require('../config/redis');

const qOpts = {
  connection: bullOpts,
  defaultJobOptions: {
    attempts:         3,
    backoff:          { type:'exponential', delay:2000 },
    removeOnComplete: { count:100 },
    removeOnFail:     { count:500 },
  },
};

const invoiceQueue = new Queue('invoice',      qOpts);
const emailQueue   = new Queue('email',        qOpts);
const payrollQueue = new Queue('payroll',      qOpts);
const notifQueue   = new Queue('notification', qOpts);

async function notify(company_id, user_id, type, title, message, entity={}) {
  await notifQueue.add('send', { company_id, user_id, type, title, message, ...entity });
}

module.exports = { invoiceQueue, emailQueue, payrollQueue, notifQueue, notify };
