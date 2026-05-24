'use strict';
const { Company } = require('../models');
const { AppError } = require('../middlewares/errorHandler');
const { delCache, cacheKey } = require('../config/redis');

async function get(req, res, next) {
  try {
    const company = await Company.findByPk(req.company_id, {
      attributes: { exclude: ['api_key'] },
    });
    if (!company) throw new AppError('Company not found', 404, 'NOT_FOUND');
    res.json({ success: true, data: company });
  } catch (e) { next(e); }
}

async function update(req, res, next) {
  try {
    const company = await Company.findByPk(req.company_id);
    if (!company) throw new AppError('Company not found', 404, 'NOT_FOUND');

    const allowed = [
      'name', 'address', 'city', 'state', 'state_code', 'pincode',
      'phone', 'email', 'website',
      'bank_name', 'bank_account', 'bank_ifsc', 'bank_branch',
      'inv_prefix', 'logo_url', 'settings',
    ];
    const updates = {};
    allowed.forEach(k => { if (req.body[k] !== undefined) updates[k] = req.body[k]; });

    await company.update(updates);
    await delCache(cacheKey(req.company_id, 'user', req.user.id));
    res.json({ success: true, data: company });
  } catch (e) { next(e); }
}

module.exports = { get, update };
