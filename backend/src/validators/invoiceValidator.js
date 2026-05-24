'use strict';
const Joi = require('joi');

// ── Invoice Item ───────────────────────────────────────────────────────────
const itemSchema = Joi.object({
  sort_order:     Joi.number().integer().min(1).default(1),
  description:    Joi.string().max(500).optional().allow('', null),
  role:           Joi.string().max(200).optional().allow('', null),
  date_of_joining:Joi.date().iso().optional().allow(null),
  hsn_code:       Joi.string().max(12).default('998519'),
  calendar_days:  Joi.number().integer().min(1).max(31).default(30),
  worked_days:    Joi.number().min(0).max(31).default(0),
  po_value:       Joi.number().min(0).default(0),
  billing_rate:   Joi.number().min(0).required(),
  gst_row:        Joi.number().min(0).default(0),
  total_row:      Joi.number().min(0).default(0),
  contractor_id:  Joi.string().uuid().optional().allow(null),
});

// ── Create Invoice ─────────────────────────────────────────────────────────
const createInvoiceSchema = Joi.object({
  client_id:      Joi.string().uuid().optional().allow(null),
  inv_no:         Joi.string().max(50).optional().allow('', null),  // auto if omitted
  template:       Joi.number().integer().min(1).max(10).default(1),
  // Client snapshot
  client_name:    Joi.string().trim().max(200).required(),
  client_gstin:   Joi.string().uppercase().max(15).optional().allow('', null),
  client_email:   Joi.string().email().max(150).optional().allow('', null),
  client_address: Joi.string().max(1000).optional().allow('', null),
  // Dates
  inv_date:       Joi.date().iso().required(),
  due_date:       Joi.date().iso().min(Joi.ref('inv_date')).optional().allow(null),
  // GST
  supply_type:    Joi.string().valid('intra','inter').required(),
  gst_rate:       Joi.number().min(0).max(28).required(),
  hsn_code:       Joi.string().max(12).default('998519'),
  // Amounts (calculated server-side but can be passed)
  discount:       Joi.number().min(0).default(0),
  // Items
  items:          Joi.array().items(itemSchema).min(1).required(),
  // Meta
  notes:          Joi.string().max(2000).optional().allow('', null),
  payroll_month:  Joi.number().integer().min(1).max(12).optional().allow(null),
  payroll_year:   Joi.number().integer().min(2000).max(2100).optional().allow(null),
  inv_mode:       Joi.string().valid('client','individual','custom').optional().allow(null),
});

// ── Update Invoice ─────────────────────────────────────────────────────────
const updateInvoiceSchema = createInvoiceSchema
  .fork(['client_name','inv_date','supply_type','gst_rate','items'], s => s.optional())
  .append({ status: Joi.string().valid('draft','pending','sent','cancelled').optional() });

// ── Record Payment ─────────────────────────────────────────────────────────
const paymentSchema = Joi.object({
  amount:     Joi.number().positive().required(),
  pay_date:   Joi.date().iso().required(),
  pay_mode:   Joi.string().valid('NEFT','IMPS','RTGS','UPI','cheque','cash','card').optional(),
  utr_number: Joi.string().max(100).optional().allow('', null),
  reference:  Joi.string().max(200).optional().allow('', null),
  notes:      Joi.string().max(500).optional().allow('', null),
});

// ── Hold Invoice ───────────────────────────────────────────────────────────
const holdSchema = Joi.object({
  reason: Joi.string().min(3).max(500).required(),
});

// ── Validate middleware factory ────────────────────────────────────────────
function validateBody(schema) {
  return (req, _res, next) => {
    const { error, value } = schema.validate(req.body, {
      abortEarly:   false,
      stripUnknown: true,
      convert:      true,
    });
    if (error) {
      const details = error.details.map(d => ({
        field:   d.context?.key || d.context?.label,
        message: d.message.replace(/"/g, ''),
      }));
      const err = new Error('Validation failed');
      err.status  = 400; err.code = 'VALIDATION_ERROR';
      err.details = details; err.isOperational = true;
      return next(err);
    }
    req.body = value;
    next();
  };
}

module.exports = {
  createInvoiceSchema,
  updateInvoiceSchema,
  paymentSchema,
  holdSchema,
  itemSchema,
  validateCreate:  validateBody(createInvoiceSchema),
  validateUpdate:  validateBody(updateInvoiceSchema),
  validatePayment: validateBody(paymentSchema),
  validateHold:    validateBody(holdSchema),
};
