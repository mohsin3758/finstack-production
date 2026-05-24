'use strict';
const crypto = require('crypto');           // MUST be at top — used in users.invite
const dayjs  = require('dayjs');
const { Op } = require('sequelize');
const { LeaveRequest, Employee, User, Company, AuditLog, Notification } = require('../models');
const { AppError }     = require('../middlewares/errorHandler');
const { hashPassword } = require('../middlewares/auth');

// ── Leave CRUD ─────────────────────────────────────────────────────────────
const leave = {
  async list(req, res, next) {
    try {
      const { status, employee_id, from, to } = req.query;
      const where = { company_id: req.company_id };
      if (status)      where.status      = status;
      if (employee_id) where.employee_id = employee_id;
      if (from || to) {
        where.from_date = {};
        if (from) where.from_date[Op.gte] = from;
        if (to)   where.from_date[Op.lte] = to;
      }
      const rows = await LeaveRequest.findAll({
        where,
        order:   [['created_at', 'DESC']],
        limit:   200,
        include: [{ model: Employee, as: 'employee', attributes: ['id','name','code','department'] }],
      });
      res.json({ success: true, data: rows });
    } catch (e) { next(e); }
  },

  async create(req, res, next) {
    try {
      const { employee_id, leave_type, from_date, to_date, reason } = req.body;
      if (!employee_id || !leave_type || !from_date || !to_date)
        throw new AppError('employee_id, leave_type, from_date, to_date required', 400, 'MISSING_FIELDS');
      const days = dayjs(to_date).diff(dayjs(from_date), 'day') + 1;
      if (days <= 0) throw new AppError('to_date must be >= from_date', 400, 'INVALID_DATES');
      const lv = await LeaveRequest.create({
        company_id: req.company_id,
        employee_id, leave_type, from_date, to_date, days, reason, status: 'pending',
      });
      res.status(201).json({ success: true, data: lv });
    } catch (e) { next(e); }
  },

  async approve(req, res, next) {
    try {
      const lv = await LeaveRequest.findOne({ where: { id: req.params.id, company_id: req.company_id } });
      if (!lv) throw new AppError('Leave request not found', 404, 'NOT_FOUND');
      if (lv.status !== 'pending') throw new AppError('Leave not pending', 400, 'ALREADY_PROCESSED');
      await lv.update({ status: 'approved', approved_by: req.user.id, approved_at: new Date() });
      res.json({ success: true, data: lv });
    } catch (e) { next(e); }
  },

  async reject(req, res, next) {
    try {
      const lv = await LeaveRequest.findOne({ where: { id: req.params.id, company_id: req.company_id } });
      if (!lv) throw new AppError('Leave request not found', 404, 'NOT_FOUND');
      await lv.update({
        status:           'rejected',
        approved_by:      req.user.id,
        approved_at:      new Date(),
        rejection_reason: req.body.reason || 'Rejected',
      });
      res.json({ success: true, data: lv });
    } catch (e) { next(e); }
  },
};

module.exports = { leave };
