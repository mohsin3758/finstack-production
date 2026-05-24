'use strict';
const Joi = require('joi');

// PAN regex: 5 letters + 4 digits + 1 letter
const panRe    = /^[A-Z]{5}[0-9]{4}[A-Z]$/;
// IFSC regex: 4 letters + 0 + 6 alphanumeric
const ifscRe   = /^[A-Z]{4}0[A-Z0-9]{6}$/;
// GSTIN regex
const gstinRe  = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
// Phone
const phoneRe  = /^\+?[0-9]{10,13}$/;

// ── Create / Update Employee ───────────────────────────────────────────────
const employeeSchema = Joi.object({
  code:          Joi.string().max(30).optional().allow('', null),
  name:          Joi.string().trim().min(2).max(150).required(),
  designation:   Joi.string().max(100).optional().allow('', null),
  department:    Joi.string().max(100).optional().allow('', null),
  emp_type:      Joi.string().valid('permanent','contract','intern','consultant').default('permanent'),
  status:        Joi.string().valid('active','inactive','notice','separated').default('active'),
  date_of_joining: Joi.date().iso().optional().allow(null),
  date_of_birth:   Joi.date().iso().optional().allow(null),
  gender:        Joi.string().valid('male','female','other').optional().allow('', null),
  email:         Joi.string().email().max(150).optional().allow('', null),
  phone:         Joi.string().pattern(phoneRe).optional().allow('', null)
                   .messages({ 'string.pattern.base': 'Invalid phone number (10-13 digits)' }),
  pan:           Joi.string().uppercase().pattern(panRe).optional().allow('', null)
                   .messages({ 'string.pattern.base': 'Invalid PAN format (AAAAA9999A)' }),
  aadhar:        Joi.string().pattern(/^[0-9]{12}$/).optional().allow('', null)
                   .messages({ 'string.pattern.base': 'Aadhaar must be exactly 12 digits' }),
  uan:           Joi.string().pattern(/^[0-9]{12}$/).optional().allow('', null)
                   .messages({ 'string.pattern.base': 'UAN must be exactly 12 digits' }),
  // Salary
  basic:         Joi.number().min(0).max(10000000).default(0),
  hra:           Joi.number().min(0).max(10000000).default(0),
  da:            Joi.number().min(0).max(10000000).default(0),
  special_allow: Joi.number().min(0).max(10000000).default(0),
  lta:           Joi.number().min(0).max(10000000).default(0),
  // Statutory
  pf_enrolled:   Joi.number().valid(0, 1).default(1),
  esi_enrolled:  Joi.number().valid(0, 1).default(0),
  pt_enrolled:   Joi.number().valid(0, 1).default(1),
  tds_rate:      Joi.number().min(0).max(40).default(0),
  // Bank
  bank_name:     Joi.string().max(150).optional().allow('', null),
  bank_account:  Joi.string().pattern(/^[0-9]{9,25}$/).optional().allow('', null)
                   .messages({ 'string.pattern.base': 'Invalid bank account number (9-25 digits)' }),
  bank_ifsc:     Joi.string().uppercase().pattern(ifscRe).optional().allow('', null)
                   .messages({ 'string.pattern.base': 'Invalid IFSC (e.g. SBIN0001234)' }),
  // Address
  address:       Joi.string().max(500).optional().allow('', null),
  city:          Joi.string().max(100).optional().allow('', null),
  state:         Joi.string().max(100).optional().allow('', null),
  pincode:       Joi.string().pattern(/^[1-9][0-9]{5}$/).optional().allow('', null)
                   .messages({ 'string.pattern.base': 'Invalid pincode (6 digits)' }),
});

// ── Process Payroll ────────────────────────────────────────────────────────
const processPayrollSchema = Joi.object({
  month: Joi.number().integer().min(1).max(12).required(),
  year:  Joi.number().integer().min(2000).max(2100).required(),
  employees: Joi.array().items(Joi.object({
    employee_id:     Joi.string().uuid().required(),
    present_days:    Joi.number().min(0).max(31).default(26),
    working_days:    Joi.number().integer().min(1).max(31).default(26),
    calendar_days:   Joi.number().integer().min(28).max(31).default(30),
    advance:         Joi.number().min(0).default(0),
    other_deduction: Joi.number().min(0).default(0),
    other_allowance: Joi.number().min(0).default(0),
  })).min(1).required(),
});

// ── Validate helper ────────────────────────────────────────────────────────
function validate(schema, data) {
  const { error, value } = schema.validate(data, {
    abortEarly:    false,
    stripUnknown:  true,
    convert:       true,
  });
  if (error) {
    const details = error.details.map(d => ({ field: d.context?.key, message: d.message.replace(/"/g, '') }));
    const err = new Error('Validation failed');
    err.status  = 400;
    err.code    = 'VALIDATION_ERROR';
    err.details = details;
    err.isOperational = true;
    throw err;
  }
  return value;
}

// Middleware factory
function validateBody(schema) {
  return (req, _res, next) => {
    try {
      req.body = validate(schema, req.body);
      next();
    } catch (e) { next(e); }
  };
}

module.exports = {
  employeeSchema,
  processPayrollSchema,
  validateEmployee:     validateBody(employeeSchema),
  validatePayroll:      validateBody(processPayrollSchema),
  validate,
};
