'use strict';
const { User }     = require('../models');
const { AppError } = require('../middlewares/errorHandler');
const { hashPassword } = require('../middlewares/auth');
const { emailQueue }   = require('../jobs/queues');
const crypto  = require('crypto');
const logger  = require('../utils/logger');

async function list(req, res, next) {
  try {
    const users = await User.findAll({
      where: { company_id: req.company_id },
      attributes: { exclude: ['password_hash', 'reset_token', 'mfa_secret', 'refresh_tokens'] },
      order: [['name', 'ASC']],
    });
    res.json({ success: true, data: users });
  } catch (e) { next(e); }
}

async function invite(req, res, next) {
  try {
    const { name, email, role, phone } = req.body;
    if (!name || !email) throw new AppError('Name and email required', 400, 'MISSING_FIELDS');

    const existing = await User.findOne({ where: { company_id: req.company_id, email } });
    if (existing) throw new AppError('Email already exists in this company', 409, 'EMAIL_EXISTS');

    const tempPassword = crypto.randomBytes(6).toString('hex') + 'A1!';
    const user = await User.create({
      company_id:    req.company_id,
      name, email, phone,
      role:          role || 'viewer',
      password_hash: await hashPassword(tempPassword),
      status:        'active',
    });

    // Fire-and-forget: email failure should not block user creation
    emailQueue.add('welcome', { to: email, name, tempPassword, loginUrl: process.env.FRONTEND_URL })
      .catch(err => logger.warn('Email queue error (invite):', err.message));

    res.status(201).json({
      success: true,
      message: `User invited. Temporary password sent to ${email}`,
      data:    { id: user.id, email: user.email, role: user.role },
    });
  } catch (e) { next(e); }
}

async function update(req, res, next) {
  try {
    const user = await User.findOne({ where: { id: req.params.id, company_id: req.company_id } });
    if (!user) throw new AppError('User not found', 404, 'NOT_FOUND');

    const { password, id, company_id, ...updates } = req.body;
    if (password) {
      if (password.length < 8) throw new AppError('Password min 8 characters', 400, 'WEAK_PASSWORD');
      updates.password_hash = await hashPassword(password);
    }
    await user.update(updates);
    res.json({ success: true, data: { id: user.id, name: user.name, email: user.email, role: user.role, status: user.status } });
  } catch (e) { next(e); }
}

async function remove(req, res, next) {
  try {
    if (req.params.id === req.user.id) throw new AppError('Cannot delete your own account', 400, 'SELF_DELETE');
    const user = await User.findOne({ where: { id: req.params.id, company_id: req.company_id } });
    if (!user) throw new AppError('User not found', 404, 'NOT_FOUND');
    await user.destroy();
    res.json({ success: true, message: 'User removed' });
  } catch (e) { next(e); }
}

module.exports = { list, invite, update, remove };
