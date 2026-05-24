'use strict';
const { Op, fn, col } = require('sequelize');
const dayjs = require('dayjs');
const { Transaction } = require('../models');
const { AppError }    = require('../middlewares/errorHandler');

async function list(req, res, next) {
  try {
    const { type, from, to, page = 1, limit = 50, search } = req.query;
    const where = { company_id: req.company_id };
    if(type) where.txn_type = type;
    if(from || to) { where.date = {}; if(from) where.date[Op.gte]=from; if(to) where.date[Op.lte]=to; }
    if(search) where[Op.or] = [{ description:{[Op.iLike]:`%${search}%`} }, { party:{[Op.iLike]:`%${search}%`} }];

    const { count, rows } = await Transaction.findAndCountAll({
      where, order: [['date','DESC']],
      limit: parseInt(limit), offset: (parseInt(page)-1)*parseInt(limit),
    });
    // Summary
    const [income, expense] = await Promise.all([
      Transaction.sum('amount', { where: { ...where, txn_type: 'income' } }),
      Transaction.sum('amount', { where: { ...where, txn_type: 'expense' } }),
    ]);
    res.json({
      success: true, data: rows,
      summary: { income: income||0, expense: expense||0, net: (income||0)-(expense||0) },
      meta: { total: count, page: parseInt(page) },
    });
  } catch(e) { next(e); }
}

async function create(req, res, next) {
  try {
    if(!req.body.amount || parseFloat(req.body.amount) <= 0) throw new AppError('Amount must be > 0', 400, 'INVALID_AMOUNT');
    const txn = await Transaction.create({ ...req.body, company_id: req.company_id, created_by: req.user.id });
    res.status(201).json({ success: true, data: txn });
  } catch(e) { next(e); }
}

async function update(req, res, next) {
  try {
    const txn = await Transaction.findOne({ where: { id: req.params.id, company_id: req.company_id } });
    if(!txn) throw new AppError('Transaction not found', 404, 'NOT_FOUND');
    const { id, company_id, ...upd } = req.body;
    await txn.update(upd);
    res.json({ success: true, data: txn });
  } catch(e) { next(e); }
}

async function remove(req, res, next) {
  try {
    const txn = await Transaction.findOne({ where: { id: req.params.id, company_id: req.company_id } });
    if(!txn) throw new AppError('Transaction not found', 404, 'NOT_FOUND');
    await txn.destroy();
    res.json({ success: true, message: 'Transaction deleted' });
  } catch(e) { next(e); }
}

async function profitLoss(req, res, next) {
  try {
    const { from, to, month, year } = req.query;
    const where = { company_id: req.company_id };
    let dateFrom = from, dateTo = to;
    if(month && year && !from) {
      dateFrom = dayjs(`${year}-${String(month).padStart(2,'0')}-01`).startOf('month').format('YYYY-MM-DD');
      dateTo   = dayjs(`${year}-${String(month).padStart(2,'0')}-01`).endOf('month').format('YYYY-MM-DD');
    }
    if(dateFrom || dateTo) {
      where.date = {};
      if(dateFrom) where.date[Op.gte] = dateFrom;
      if(dateTo)   where.date[Op.lte] = dateTo;
    }
    const [income, expense] = await Promise.all([
      Transaction.sum('amount', { where: { ...where, txn_type: 'income' } }),
      Transaction.sum('amount', { where: { ...where, txn_type: 'expense' } }),
    ]);
    res.json({
      success: true,
      data: {
        income:  parseFloat(income  || 0),
        expense: parseFloat(expense || 0),
        net:     parseFloat(income  || 0) - parseFloat(expense || 0),
        period:  { from: dateFrom, to: dateTo },
      }
    });
  } catch(e) { next(e); }
}

module.exports = { list, create, update, remove, profitLoss };
