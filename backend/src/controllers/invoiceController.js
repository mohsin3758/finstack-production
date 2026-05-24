'use strict';
const { body, validationResult } = require('express-validator');
const { Op, fn, col, literal } = require('sequelize');
const dayjs = require('dayjs');

const { Invoice, InvoiceItem, Client, Company, AuditLog, Transaction, sequelize } = require('../models');
const { calculateGST, amountInWords } = require('../services/payrollService');
const { AppError }   = require('../middlewares/errorHandler');
const { getCache, setCache, delPattern, cacheKey, TTL } = require('../config/redis');

// ── List ───────────────────────────────────────────────────────────────────
async function list(req, res, next) {
  try {
    const { status, client_id, from, to, page = 1, limit = 25, search, sort = 'inv_date', order = 'DESC' } = req.query;

    const where = { company_id: req.company_id };
    if(status)    where.status    = status;
    if(client_id) where.client_id = client_id;
    if(from || to) {
      where.inv_date = {};
      if(from) where.inv_date[Op.gte] = from;
      if(to)   where.inv_date[Op.lte] = to;
    }
    if(search) {
      where[Op.or] = [
        { inv_no:      { [Op.iLike]: `%${search}%` } },
        { client_name: { [Op.iLike]: `%${search}%` } },
        { client_gstin:{ [Op.iLike]: `%${search}%` } },
      ];
    }

    const validSorts   = ['inv_date','inv_no','client_name','total','status','due_date'];
    const sortField    = validSorts.includes(sort) ? sort : 'inv_date';
    const sortOrder    = order.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

    const [{ count, rows }, stats] = await Promise.all([
      Invoice.findAndCountAll({
        where,
        include: [{ model: InvoiceItem, as: 'items' }],
        order:   [[sortField, sortOrder]],
        limit:   parseInt(limit),
        offset:  (parseInt(page) - 1) * parseInt(limit),
      }),
      Invoice.findOne({
        where: { company_id: req.company_id },
        attributes: [
          [fn('COALESCE', fn('SUM', col('total')),       0), 'total_billed'],
          [fn('COALESCE', fn('SUM', col('received')),    0), 'total_received'],
          [fn('COALESCE', fn('SUM', col('outstanding')), 0), 'total_outstanding'],
          [fn('COUNT',    col('id')),                       'invoice_count'],
          [literal(`COUNT(*) FILTER (WHERE status='overdue')`), 'overdue_count'],
          [literal(`COALESCE(SUM(outstanding) FILTER (WHERE status='overdue'),0)`), 'overdue_amount'],
        ],
        raw: true,
      }),
    ]);

    res.json({
      success: true,
      data:    { invoices: rows, stats },
      meta:    { page: parseInt(page), limit: parseInt(limit), total: count, pages: Math.ceil(count / parseInt(limit)) },
    });
  } catch(e) { next(e); }
}

// ── Get one ────────────────────────────────────────────────────────────────
async function getOne(req, res, next) {
  try {
    const inv = await Invoice.findOne({
      where:   { id: req.params.id, company_id: req.company_id },
      include: [
        { model: InvoiceItem, as: 'items', order: [['sort_order','ASC']] },
        { model: Client,      as: 'client' },
      ],
    });
    if(!inv) throw new AppError('Invoice not found', 404, 'NOT_FOUND');

    // Add amount in words
    const data = { ...inv.toJSON(), amount_words: amountInWords(parseFloat(inv.total)) };
    res.json({ success: true, data });
  } catch(e) { next(e); }
}

// ── Create ─────────────────────────────────────────────────────────────────
const createValidation = [
  body('client_name').trim().notEmpty().isLength({ max: 200 }),
  body('inv_date').isISO8601().withMessage('Valid invoice date required'),
  body('due_date').optional().isISO8601(),
  body('supply_type').isIn(['intra','inter']),
  body('gst_rate').isFloat({ min: 0, max: 28 }),
  body('items').isArray({ min: 1 }).withMessage('At least one line item required'),
];

async function create(req, res, next) {
  try {
    const errors = validationResult(req);
    if(!errors.isEmpty()) return res.status(400).json({ success: false, errors: errors.array() });

    const company = await Company.findByPk(req.company_id);
    if(!company) throw new AppError('Company not found', 404, 'NOT_FOUND');

    const { items = [], ...body } = req.body;

    // Auto-generate invoice number using atomic SELECT ... FOR UPDATE
    const { sequelize: sq } = require('../models');
    const [[counterRow]] = await sq.query(
      `UPDATE companies SET inv_counter = inv_counter + 1
       WHERE id = :id RETURNING inv_prefix, inv_counter`,
      { replacements: { id: req.company_id }, type: sq.QueryTypes.SELECT }
    );
    const invNo = body.inv_no ||
      `${counterRow.inv_prefix}-${String(counterRow.inv_counter).padStart(4,'0')}`;

    // Calculate amounts
    const subtotal  = items.reduce((s, it) => s + (parseFloat(it.billing_rate) || 0), 0);
    const discount  = parseFloat(body.discount) || 0;
    const taxable   = subtotal - discount;
    const gst       = calculateGST(taxable, body.gst_rate, body.supply_type);
    const total     = taxable + gst.total_gst;

    const inv = await sequelize.transaction(async (t) => {
      const created = await Invoice.create({
        ...body,
        company_id:  req.company_id,
        inv_no:      invNo,
        subtotal,
        taxable,
        cgst:        gst.cgst,
        sgst:        gst.sgst,
        igst:        gst.igst,
        gst_amount:  gst.total_gst,
        total,
        outstanding: total,
        status:      'pending',
        created_by:  req.user.id,
      }, { transaction: t });

      if(items.length) {
        await InvoiceItem.bulkCreate(items.map((it, i) => ({
          invoice_id:  created.id,
          company_id:  req.company_id,
          sort_order:  i + 1,
          description: it.description || it.name,
          role:        it.role,
          hsn_code:    it.hsn_code || body.hsn_code,
          calendar_days: it.calendar_days,
          worked_days:   it.worked_days,
          po_value:      it.po_value,
          billing_rate:  it.billing_rate,
          gst_row:       parseFloat(it.billing_rate || 0) * parseFloat(body.gst_rate) / 100,
          total_row:     parseFloat(it.billing_rate || 0) * (1 + parseFloat(body.gst_rate)/100),
          contractor_id: it.contractor_id,
        })), { transaction: t });
      }

      return created;
    });

    await delPattern(cacheKey(req.company_id, 'invoices*'));
    res.status(201).json({ success: true, data: inv });
  } catch(e) { next(e); }
}

// ── Update ─────────────────────────────────────────────────────────────────
async function update(req, res, next) {
  try {
    const inv = await Invoice.findOne({ where: { id: req.params.id, company_id: req.company_id } });
    if(!inv)              throw new AppError('Invoice not found', 404, 'NOT_FOUND');
    if(inv.status === 'paid') throw new AppError('Cannot edit a paid invoice', 400, 'INVOICE_PAID');

    const { items, ...updates } = req.body;

    if(items || updates.gst_rate || updates.discount !== undefined) {
      const subtotal  = items
        ? items.reduce((s,it) => s + (parseFloat(it.billing_rate)||0), 0)
        : parseFloat(inv.subtotal);
      const discount  = parseFloat(updates.discount ?? inv.discount) || 0;
      const taxable   = subtotal - discount;
      const gst       = calculateGST(taxable, updates.gst_rate || inv.gst_rate, updates.supply_type || inv.supply_type);
      const total     = taxable + gst.total_gst;
      Object.assign(updates, {
        subtotal, taxable, ...gst, gst_amount: gst.total_gst,
        total, outstanding: Math.max(0, total - (parseFloat(inv.received)||0)),
      });
    }

    await inv.update(updates);

    if(items) {
      await sequelize.transaction(async (t) => {
        await InvoiceItem.destroy({ where: { invoice_id: inv.id }, transaction: t });
        await InvoiceItem.bulkCreate(items.map((it,i) => ({
          invoice_id: inv.id, company_id: req.company_id, sort_order: i+1,
          billing_rate: it.billing_rate, role: it.role, worked_days: it.worked_days,
          calendar_days: it.calendar_days, po_value: it.po_value,
          hsn_code: it.hsn_code, description: it.description,
          gst_row:  parseFloat(it.billing_rate||0) * parseFloat(inv.gst_rate)/100,
          total_row:parseFloat(it.billing_rate||0) * (1 + parseFloat(inv.gst_rate)/100),
          contractor_id: it.contractor_id,
        })), { transaction: t });
      });
    }

    await delPattern(cacheKey(req.company_id, 'invoices*'));
    res.json({ success: true, data: inv });
  } catch(e) { next(e); }
}

// ── Record payment ─────────────────────────────────────────────────────────
async function recordPayment(req, res, next) {
  try {
    const { amount, pay_date, pay_mode, utr_number, reference, notes } = req.body;
    const inv = await Invoice.findOne({ where: { id: req.params.id, company_id: req.company_id } });
    if(!inv) throw new AppError('Invoice not found', 404, 'NOT_FOUND');
    if(inv.status === 'cancelled') throw new AppError('Invoice is cancelled', 400, 'CANCELLED');

    const amtNum      = parseFloat(amount);
    if(isNaN(amtNum) || amtNum <= 0) throw new AppError('Invalid payment amount', 400, 'INVALID_AMOUNT');

    const newReceived    = parseFloat(inv.received || 0) + amtNum;
    const newOutstanding = Math.max(0, parseFloat(inv.total) - newReceived);
    const newStatus      = newReceived >= parseFloat(inv.total) ? 'paid' : 'partial';

    await inv.update({
      received:    newReceived,
      outstanding: newOutstanding,
      status:      newStatus,
      pay_date:    pay_date || dayjs().format('YYYY-MM-DD'),
      pay_mode:    pay_mode || null,
      pay_utr:     utr_number || null,
    });

    // Record in general ledger
    await Transaction.create({
      company_id:  req.company_id,
      txn_type:    'income',
      date:        pay_date || dayjs().format('YYYY-MM-DD'),
      category:    'Invoice Payment',
      description: `Receipt for ${inv.inv_no}`,
      amount:      amtNum,
      party:       inv.client_name,
      pay_mode:    pay_mode || null,
      reference:   utr_number || reference,
      invoice_id:  inv.id,
      created_by:  req.user.id,
    });

    await delPattern(cacheKey(req.company_id, 'invoices*'));
    res.json({ success: true, data: { received: newReceived, outstanding: newOutstanding, status: newStatus } });
  } catch(e) { next(e); }
}

// ── Hold / Release ─────────────────────────────────────────────────────────
async function holdInvoice(req, res, next) {
  try {
    const inv = await Invoice.findOne({ where: { id: req.params.id, company_id: req.company_id } });
    if(!inv) throw new AppError('Invoice not found', 404, 'NOT_FOUND');
    await inv.update({ status: 'hold', hold_reason: req.body.reason || 'On hold' });
    res.json({ success: true, data: inv });
  } catch(e) { next(e); }
}

async function releaseInvoice(req, res, next) {
  try {
    const inv = await Invoice.findOne({ where: { id: req.params.id, company_id: req.company_id } });
    if(!inv) throw new AppError('Invoice not found', 404, 'NOT_FOUND');
    if(inv.status !== 'hold') throw new AppError('Invoice is not on hold', 400, 'NOT_ON_HOLD');
    await inv.update({ status: 'pending', hold_reason: null, released_at: new Date() });
    res.json({ success: true, data: inv });
  } catch(e) { next(e); }
}

// ── WhatsApp share ─────────────────────────────────────────────────────────
async function shareWhatsApp(req, res, next) {
  try {
    const inv = await Invoice.findOne({ where: { id: req.params.id, company_id: req.company_id } });
    if(!inv) throw new AppError('Invoice not found', 404, 'NOT_FOUND');
    const company = await Company.findByPk(req.company_id, { attributes: ['name','phone'] });

    const mn = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    const d  = dayjs(inv.inv_date);
    const message = [
      `Dear ${inv.client_name} Team,`,
      ``,
      `Please find invoice details for ${mn[d.month()]} ${d.year()}:`,
      ``,
      `📋 Invoice No : ${inv.inv_no}`,
      `📅 Date       : ${inv.inv_date}`,
      `⏰ Due Date   : ${inv.due_date || 'As agreed'}`,
      `💰 Amount     : ₹${Number(inv.total).toLocaleString('en-IN')}`,
      `📝 ${amountInWords(parseFloat(inv.total))}`,
      ``,
      `Please process payment by due date.`,
      ``,
      `Regards,`,
      company.name,
      company.phone || '',
    ].join('\n');

    await inv.update({ shared_via: 'whatsapp', shared_at: new Date() });
    res.json({ success: true, data: { wa_url: `https://wa.me/?text=${encodeURIComponent(message)}`, message } });
  } catch(e) { next(e); }
}

// ── Delete (soft) ──────────────────────────────────────────────────────────
async function remove(req, res, next) {
  try {
    const inv = await Invoice.findOne({ where: { id: req.params.id, company_id: req.company_id } });
    if(!inv) throw new AppError('Invoice not found', 404, 'NOT_FOUND');
    if(inv.status === 'paid') throw new AppError('Cannot delete a paid invoice', 400, 'INVOICE_PAID');
    await inv.destroy();
    await delPattern(cacheKey(req.company_id, 'invoices*'));
    res.json({ success: true, message: 'Invoice deleted' });
  } catch(e) { next(e); }
}

// ── GSTR-1 export ──────────────────────────────────────────────────────────
async function gstr1Export(req, res, next) {
  try {
    const { month, year } = req.query;
    const company = await Company.findByPk(req.company_id);
    const where   = {
      company_id: req.company_id,
      status:     { [Op.notIn]: ['cancelled','draft'] },
    };
    if(month && year) {
      const from = dayjs(`${year}-${String(month).padStart(2,'0')}-01`).startOf('month').format('YYYY-MM-DD');
      const to   = dayjs(`${year}-${String(month).padStart(2,'0')}-01`).endOf('month').format('YYYY-MM-DD');
      where.inv_date = { [Op.between]: [from, to] };
    }

    const invoices = await Invoice.findAll({ where, include: [{ model: InvoiceItem, as: 'items' }] });

    // B2B (client has GSTIN)
    const b2b = invoices.filter(i => i.client_gstin).map(i => ({
      ctin: i.client_gstin,
      inv:  [{
        inum: i.inv_no, idt: i.inv_date, val: parseFloat(i.total),
        pos:  i.supply_type === 'inter' ? '27' : (company.state_code || '29'),
        rchrg:'N', inv_typ:'R',
        itms: [{ num:1, itm_det:{
          txval: parseFloat(i.taxable), rt: parseFloat(i.gst_rate),
          camt: parseFloat(i.cgst), samt: parseFloat(i.sgst), iamt: parseFloat(i.igst),
        }}],
      }],
    }));

    // B2CS (no GSTIN)
    const b2cs = invoices.filter(i => !i.client_gstin).map(i => ({
      sply_ty: i.supply_type === 'inter' ? 'INTER' : 'INTRA',
      rt:      parseFloat(i.gst_rate),
      typ:     'OE',
      taxbl_val: parseFloat(i.taxable),
      iamt:    parseFloat(i.igst),
      camt:    parseFloat(i.cgst),
      samt:    parseFloat(i.sgst),
    }));

    res.json({ success: true, data: { gstin: company.gstin, period: `${month}${year}`, b2b, b2cs } });
  } catch(e) { next(e); }
}

module.exports = {
  list, getOne, create, createValidation, update,
  recordPayment, holdInvoice, releaseInvoice,
  shareWhatsApp, remove, gstr1Export,
};
