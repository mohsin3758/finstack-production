'use strict';
const { Op } = require('sequelize');
const { Client } = require('../models');
const { AppError } = require('../middlewares/errorHandler');

async function list(req, res, next) {
  try {
    const { search, active = 'true', page = 1, limit = 50 } = req.query;
    const where = { company_id: req.company_id };
    if(active !== 'all') where.active = active !== 'false';
    if(search) {
      where[Op.or] = [
        { name:  { [Op.iLike]: `%${search}%` } },
        { gstin: { [Op.iLike]: `%${search}%` } },
        { email: { [Op.iLike]: `%${search}%` } },
      ];
    }
    const { count, rows } = await Client.findAndCountAll({
      where, order: [['name','ASC']],
      limit: parseInt(limit), offset: (parseInt(page)-1)*parseInt(limit),
    });
    res.json({ success: true, data: rows, meta: { total: count, page: parseInt(page) } });
  } catch(e) { next(e); }
}

async function getOne(req, res, next) {
  try {
    const c = await Client.findOne({ where: { id: req.params.id, company_id: req.company_id } });
    if(!c) throw new AppError('Client not found', 404, 'NOT_FOUND');
    res.json({ success: true, data: c });
  } catch(e) { next(e); }
}

async function create(req, res, next) {
  try {
    if(req.body.gstin) {
      const dup = await Client.findOne({ where: { company_id: req.company_id, gstin: req.body.gstin } });
      if(dup) throw new AppError('Client with this GSTIN already exists', 409, 'DUPLICATE_GSTIN');
    }
    const c = await Client.create({ ...req.body, company_id: req.company_id });
    res.status(201).json({ success: true, data: c });
  } catch(e) { next(e); }
}

async function update(req, res, next) {
  try {
    const c = await Client.findOne({ where: { id: req.params.id, company_id: req.company_id } });
    if(!c) throw new AppError('Client not found', 404, 'NOT_FOUND');
    const { id, company_id, ...upd } = req.body;
    await c.update(upd);
    res.json({ success: true, data: c });
  } catch(e) { next(e); }
}

async function remove(req, res, next) {
  try {
    const c = await Client.findOne({ where: { id: req.params.id, company_id: req.company_id } });
    if(!c) throw new AppError('Client not found', 404, 'NOT_FOUND');
    await c.destroy();
    res.json({ success: true, message: 'Client deleted' });
  } catch(e) { next(e); }
}

module.exports = { list, getOne, create, update, remove };
