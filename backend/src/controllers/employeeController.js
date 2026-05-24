'use strict';
const { body, validationResult } = require('express-validator');
const { Op } = require('sequelize');
const { Employee, PayrollRecord, LeaveRequest } = require('../models');
const { calculatePayroll }  = require('../services/payrollService');
const { AppError }          = require('../middlewares/errorHandler');
const { delPattern, cacheKey } = require('../config/redis');

const createValidation = [
  body('name').trim().notEmpty().isLength({ max: 150 }),
  body('email').optional().trim().normalizeEmail().isEmail(),
  body('phone').optional().trim().matches(/^\+?[0-9]{10,13}$/),
  body('pan').optional().trim().toUpperCase().matches(/^[A-Z]{5}[0-9]{4}[A-Z]$/).withMessage('Invalid PAN'),
  body('bank_ifsc').optional().trim().toUpperCase().matches(/^[A-Z]{4}0[A-Z0-9]{6}$/).withMessage('Invalid IFSC'),
  body('basic').optional().isFloat({ min: 0 }),
  body('date_of_joining').optional().isISO8601(),
];

async function list(req, res, next) {
  try {
    const { status, department, search, page = 1, limit = 50 } = req.query;
    const where = { company_id: req.company_id };
    if(status)     where.status     = status;
    if(department) where.department = department;
    if(search) {
      where[Op.or] = [
        { name:  { [Op.iLike]: `%${search}%` } },
        { code:  { [Op.iLike]: `%${search}%` } },
        { email: { [Op.iLike]: `%${search}%` } },
        { designation: { [Op.iLike]: `%${search}%` } },
      ];
    }
    const { count, rows } = await Employee.findAndCountAll({
      where, order: [['name','ASC']],
      limit:  parseInt(limit),
      offset: (parseInt(page)-1) * parseInt(limit),
      attributes: { exclude: ['aadhar'] },  // Never expose Aadhaar in list
    });
    res.json({ success: true, data: rows, meta: { total: count, page: parseInt(page), limit: parseInt(limit) } });
  } catch(e) { next(e); }
}

async function getOne(req, res, next) {
  try {
    const emp = await Employee.findOne({
      where:      { id: req.params.id, company_id: req.company_id },
      attributes: { exclude: ['aadhar'] },  // Never expose full Aadhaar (UIDAI compliance)
    });
    if(!emp) throw new AppError('Employee not found', 404, 'NOT_FOUND');
    res.json({ success: true, data: emp });
  } catch(e) { next(e); }
}

async function create(req, res, next) {
  try {
    const errors = validationResult(req);
    if(!errors.isEmpty()) return res.status(400).json({ success: false, errors: errors.array() });

    if(req.body.code) {
      const dup = await Employee.findOne({ where: { company_id: req.company_id, code: req.body.code } });
      if(dup) throw new AppError('Employee code already exists', 409, 'DUPLICATE_CODE');
    }
    if(req.body.email) {
      const dup = await Employee.findOne({ where: { company_id: req.company_id, email: req.body.email } });
      if(dup) throw new AppError('Email already exists for an employee', 409, 'DUPLICATE_EMAIL');
    }

    const emp = await Employee.create({ ...req.body, company_id: req.company_id, created_by: req.user.id });
    await delPattern(cacheKey(req.company_id, 'employees*'));
    res.status(201).json({ success: true, data: emp });
  } catch(e) { next(e); }
}

async function update(req, res, next) {
  try {
    const emp = await Employee.findOne({ where: { id: req.params.id, company_id: req.company_id } });
    if(!emp) throw new AppError('Employee not found', 404, 'NOT_FOUND');
    const { id, company_id, created_at, created_by, ...updates } = req.body;
    await emp.update(updates);
    await delPattern(cacheKey(req.company_id, 'employees*'));
    res.json({ success: true, data: emp });
  } catch(e) { next(e); }
}

async function remove(req, res, next) {
  try {
    const emp = await Employee.findOne({ where: { id: req.params.id, company_id: req.company_id } });
    if(!emp) throw new AppError('Employee not found', 404, 'NOT_FOUND');
    // Soft-delete via Sequelize paranoid
    await emp.destroy();
    res.json({ success: true, message: 'Employee removed (soft delete)' });
  } catch(e) { next(e); }
}

async function processPayroll(req, res, next) {
  try {
    const { month, year, employees: epArr = [] } = req.body;
    if(!month || !year) throw new AppError('Month and year required', 400, 'MISSING_FIELDS');
    if(!epArr.length)   throw new AppError('At least one employee payroll entry required', 400, 'NO_EMPLOYEES');

    const results = [];
    for(const ep of epArr) {
      const emp = await Employee.findOne({ where: { id: ep.employee_id, company_id: req.company_id } });
      if(!emp) continue;

      const calc = calculatePayroll(emp.toJSON(), {
        present_days:    parseFloat(ep.present_days)    || 26,
        working_days:    parseInt(ep.working_days)       || 26,
        calendar_days:   parseInt(ep.calendar_days)      || 30,
        advance:         parseFloat(ep.advance)          || 0,
        other_deduction: parseFloat(ep.other_deduction)  || 0,
        other_allowance: parseFloat(ep.other_allowance)  || 0,
      });

      const [record] = await PayrollRecord.upsert({
        company_id:  req.company_id,
        employee_id: emp.id,
        month: parseInt(month), year: parseInt(year),
        ...calc,
        status:       'processed',
        processed_by: req.user.id,
      }, { returning: true, conflictFields: ['company_id', 'employee_id', 'month', 'year'] });

      results.push({ employee_id: emp.id, employee_name: emp.name, ...calc });
    }

    res.json({ success: true, data: results, count: results.length });
  } catch(e) { next(e); }
}

async function getPayrollHistory(req, res, next) {
  try {
    const { year } = req.query;
    const where = { company_id: req.company_id, employee_id: req.params.id };
    if(year) where.year = parseInt(year);
    const records = await PayrollRecord.findAll({ where, order: [['year','DESC'],['month','DESC']] });
    res.json({ success: true, data: records });
  } catch(e) { next(e); }
}

async function exportBankFile(req, res, next) {
  try {
    const { month, year } = req.query;
    if(!month || !year) throw new AppError('Month and year required', 400, 'MISSING_FIELDS');

    const records = await PayrollRecord.findAll({
      where: { company_id: req.company_id, month: parseInt(month), year: parseInt(year), status: 'processed' },
      include: [{ model: Employee, as: 'employee', attributes: ['name','bank_name','bank_account','bank_ifsc','code'] }],
    });

    const header = 'SL No,Beneficiary Name,Account Number,IFSC Code,Amount (INR),Payment Mode,Remarks\n';
    const rows   = records.map((r, i) =>
      [i+1, `"${r.employee?.name}"`, r.employee?.bank_account, r.employee?.bank_ifsc,
       parseFloat(r.net_pay).toFixed(2), 'NEFT',
       `"Salary ${month}/${year} - ${r.employee?.code}"`].join(',')
    ).join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="BankPayment_${month}_${year}.csv"`);
    res.send(header + rows);
  } catch(e) { next(e); }
}

module.exports = { list, getOne, create, createValidation, update, remove, processPayroll, getPayrollHistory, exportBankFile };
