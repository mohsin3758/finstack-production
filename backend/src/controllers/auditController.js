'use strict';
const { AuditLog } = require('../models');
const { Op }       = require('sequelize');

async function list(req, res, next) {
  try {
    const { resource, action, user_id, page = 1, limit = 50, from, to } = req.query;
    const where = {};
    if (req.user.role !== 'super_admin') where.company_id = req.company_id;
    if (resource) where.resource = resource;
    if (action)   where.action   = action;
    if (user_id)  where.user_id  = user_id;
    if (from || to) {
      where.created_at = {};
      if (from) where.created_at[Op.gte] = new Date(from);
      if (to)   where.created_at[Op.lte] = new Date(to);
    }
    const { count, rows } = await AuditLog.findAndCountAll({
      where,
      order:  [['created_at', 'DESC']],
      limit:  parseInt(limit),
      offset: (parseInt(page) - 1) * parseInt(limit),
    });
    res.json({ success: true, data: rows, meta: { total: count, page: parseInt(page), pages: Math.ceil(count / limit) } });
  } catch (e) { next(e); }
}

module.exports = { list };
