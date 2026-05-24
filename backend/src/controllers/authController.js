'use strict';
const { body, validationResult } = require('express-validator');
const crypto  = require('crypto');
const jwt     = require('jsonwebtoken');
const dayjs   = require('dayjs');
const { Op }  = require('sequelize');

const { User, Company, AuditLog } = require('../models');
const {
  hashPassword, comparePassword,
  generateAccessToken, generateRefreshToken,
  blacklistToken,
} = require('../middlewares/auth');
const { AppError }  = require('../middlewares/errorHandler');
const { setCache, getCache, delCache, cacheKey, TTL } = require('../config/redis');
const logger = require('../utils/logger');

// ── Validation rules ───────────────────────────────────────────────────────
const registerValidation = [
  body('company_name').trim().notEmpty().isLength({ max: 200 }).withMessage('Company name required'),
  body('company_gstin').optional().trim().toUpperCase()
    .matches(/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/).withMessage('Invalid GSTIN'),
  body('name').trim().notEmpty().isLength({ max: 150 }).withMessage('Your name required'),
  body('email').trim().normalizeEmail().isEmail().withMessage('Valid email required'),
  body('password').isLength({ min: 8 }).matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('Password: min 8 chars, must have uppercase, lowercase, number'),
];

const loginValidation = [
  body('email').trim().normalizeEmail().isEmail(),
  body('password').notEmpty(),
];

// ── Register ───────────────────────────────────────────────────────────────
async function register(req, res, next) {
  try {
    const errors = validationResult(req);
    if(!errors.isEmpty()) return res.status(400).json({ success: false, code: 'VALIDATION_ERROR', errors: errors.array() });

    const { company_name, company_gstin, name, email, password, phone } = req.body;

    const existing = await User.findOne({ where: { email } });
    if(existing) throw new AppError('Email already registered', 409, 'EMAIL_EXISTS');

    const slug = company_name.toLowerCase()
      .replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'')
      .slice(0,80) + '-' + crypto.randomBytes(3).toString('hex');

    const { sequelize } = require('../models');
    const { company, user } = await sequelize.transaction(async (t) => {
      const company = await Company.create({
        name: company_name, slug,
        gstin: company_gstin || null,
        subscription: 'trial',
        subscription_end: dayjs().add(14,'day').format('YYYY-MM-DD'),
      }, { transaction: t });

      const user = await User.create({
        company_id:    company.id,
        name, email, phone,
        password_hash: await hashPassword(password),
        role:          'admin',
        status:        'active',
      }, { transaction: t });

      return { company, user };
    });

    // Audit log outside transaction (non-critical)
    AuditLog.create({
      company_id: company.id, user_id: user.id, user_name: name,
      action: 'create', resource: 'auth',
      new_values: { event: 'company_registered', company: company_name },
      ip_address: req.ip, endpoint: req.originalUrl, http_method: 'POST',
      status_code: 201, created_at: new Date(),
    }).catch(() => {});

    logger.info(`New company registered: ${company_name} [${company.id}]`);
    res.status(201).json({
      success: true,
      message: '14-day trial started. Please login.',
      data: { company_id: company.id },
    });
  } catch(e) { next(e); }
}

// ── Login ──────────────────────────────────────────────────────────────────
async function login(req, res, next) {
  try {
    const errors = validationResult(req);
    if(!errors.isEmpty()) return res.status(400).json({ success: false, errors: errors.array() });

    const { email, password, remember_me = false } = req.body;

    const user = await User.findOne({
      where: { email },
      include: [{
        model: Company, as: 'company',
        attributes: ['id','name','slug','gstin','active','subscription','subscription_end',
                     'inv_prefix','inv_counter','settings','logo_url','state_code'],
      }],
    });

    const authFail = () => { throw new AppError('Invalid email or password', 401, 'AUTH_FAILED'); };
    if(!user) authFail();

    if(user.status === 'suspended') throw new AppError('Account suspended. Contact support.', 401, 'SUSPENDED');

    if(user.locked_until && new Date(user.locked_until) > new Date()) {
      const mins = Math.ceil((new Date(user.locked_until) - new Date()) / 60000);
      throw new AppError(`Account locked. Try again in ${mins} minutes.`, 401, 'ACCOUNT_LOCKED');
    }

    const valid = await comparePassword(password, user.password_hash);
    if(!valid) {
      const fails = (user.failed_logins || 0) + 1;
      const upd   = { failed_logins: fails };
      if(fails >= 5) upd.locked_until = dayjs().add(15,'minute').toDate();
      await user.update(upd);
      authFail();
    }

    if(!user.company?.active) throw new AppError('Company account suspended.', 403, 'COMPANY_SUSPENDED');

    await user.update({ failed_logins: 0, locked_until: null, last_login: new Date(), login_count: (user.login_count||0)+1 });

    const payload = { user_id: user.id, company_id: user.company_id, role: user.role, name: user.name };
    const accessToken  = generateAccessToken(payload);
    const refreshToken = generateRefreshToken({ ...payload, remember_me });

    const rttl = remember_me ? 60*60*24*30 : 60*60*24*7;
    await setCache(cacheKey(user.company_id, 'refresh', user.id), refreshToken, rttl);

    res.cookie('refresh_token', refreshToken, {
      httpOnly: true,
      secure:   process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge:   rttl * 1000,
      path:     '/api/v1/auth',
    });

    await AuditLog.create({
      company_id: user.company_id, user_id: user.id, user_name: user.name, user_role: user.role,
      action: 'login', resource: 'auth',
      ip_address: req.ip, user_agent: req.get('User-Agent'),
      endpoint: req.originalUrl, http_method: 'POST', status_code: 200,
      new_values: { event: 'login', ip: req.ip }, created_at: new Date(),
    });

    const { password_hash, reset_token, mfa_secret, ...safeUser } = user.toJSON();

    res.json({
      success:    true,
      data: {
        access_token: accessToken,
        token_type:   'Bearer',
        expires_in:   process.env.JWT_EXPIRES_IN || '8h',
        user:         safeUser,
        company:      user.company,
        permissions:  user.permissions || {},
      },
    });
  } catch(e) { next(e); }
}

// ── Refresh token ──────────────────────────────────────────────────────────
async function refreshToken(req, res, next) {
  try {
    const token = req.cookies?.refresh_token || req.body?.refresh_token;
    if(!token) throw new AppError('Refresh token required', 401, 'REFRESH_REQUIRED');

    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_REFRESH_SECRET || 'finstack_refresh_dev_secret_change_in_prod');
    } catch(e) {
      throw new AppError('Invalid or expired refresh token', 401, 'REFRESH_INVALID');
    }

    const stored = await getCache(cacheKey(decoded.company_id, 'refresh', decoded.user_id));
    if(stored !== token) throw new AppError('Refresh token revoked', 401, 'REFRESH_REVOKED');

    const newAccess = generateAccessToken({
      user_id: decoded.user_id, company_id: decoded.company_id,
      role: decoded.role, name: decoded.name,
    });

    res.json({ success: true, data: { access_token: newAccess, token_type: 'Bearer' } });
  } catch(e) { next(e); }
}

// ── Logout ─────────────────────────────────────────────────────────────────
async function logout(req, res, next) {
  try {
    const token = req.headers.authorization?.slice(7);
    if(token) await blacklistToken(token);
    await delCache(cacheKey(req.company_id, 'refresh', req.user.id));
    await delCache(cacheKey(req.company_id, 'user',    req.user.id));
    res.clearCookie('refresh_token', { path: '/api/v1/auth' });

    await AuditLog.create({
      company_id: req.company_id, user_id: req.user.id, user_name: req.user.name,
      action: 'logout', resource: 'auth', ip_address: req.ip,
      endpoint: req.originalUrl, http_method: 'POST', status_code: 200, created_at: new Date(),
    });

    res.json({ success: true, message: 'Logged out successfully' });
  } catch(e) { next(e); }
}

// ── Me ─────────────────────────────────────────────────────────────────────
async function me(req, res) {
  const { password_hash, reset_token, mfa_secret, ...safe } = req.user?.toJSON ? req.user.toJSON() : req.user;
  res.json({ success: true, data: safe });
}

// ── Forgot password ────────────────────────────────────────────────────────
async function forgotPassword(req, res, next) {
  try {
    const { email } = req.body;
    if(!email) throw new AppError('Email required', 400, 'EMAIL_REQUIRED');

    const user = await User.findOne({ where: { email } });
    // Always 200 to prevent enumeration
    if(user) {
      const token   = crypto.randomBytes(32).toString('hex');
      const expires = dayjs().add(1,'hour').toDate();
      await user.update({ reset_token: token, reset_expires: expires });

      try {
        const { emailQueue } = require('../jobs/queues');
        await emailQueue.add('password_reset', {
          to:       email,
          name:     user.name,
          resetUrl: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/reset-password?token=${token}`,
        });
      } catch(e) { logger.warn('Email queue error:', e.message); }
    }

    res.json({ success: true, message: 'If that email exists, a reset link has been sent.' });
  } catch(e) { next(e); }
}

// ── Reset password ─────────────────────────────────────────────────────────
async function resetPassword(req, res, next) {
  try {
    const { token, password } = req.body;
    if(!token || !password) throw new AppError('Token and new password required', 400, 'MISSING_FIELDS');
    if(password.length < 8) throw new AppError('Password must be at least 8 characters', 400, 'WEAK_PASSWORD');

    const user = await User.findOne({
      where: { reset_token: token, reset_expires: { [Op.gt]: new Date() } }
    });
    if(!user) throw new AppError('Invalid or expired reset token', 400, 'TOKEN_INVALID');

    await user.update({
      password_hash: await hashPassword(password),
      reset_token:   null,
      reset_expires: null,
      failed_logins: 0,
      locked_until:  null,
    });

    // Invalidate all sessions
    await delCache(cacheKey(user.company_id, 'refresh', user.id));
    await delCache(cacheKey(user.company_id, 'user',    user.id));

    res.json({ success: true, message: 'Password reset successfully. Please login.' });
  } catch(e) { next(e); }
}

// ── Change password (authenticated) ───────────────────────────────────────
async function changePassword(req, res, next) {
  try {
    const { current_password, new_password } = req.body;
    if(!current_password || !new_password) throw new AppError('Both passwords required', 400, 'MISSING_FIELDS');
    if(new_password.length < 8) throw new AppError('Password must be at least 8 characters', 400, 'WEAK_PASSWORD');

    const user = await User.findByPk(req.user.id);
    const valid = await comparePassword(current_password, user.password_hash);
    if(!valid) throw new AppError('Current password is incorrect', 400, 'WRONG_PASSWORD');

    await user.update({ password_hash: await hashPassword(new_password) });
    await delCache(cacheKey(req.company_id, 'user', req.user.id));

    res.json({ success: true, message: 'Password changed successfully' });
  } catch(e) { next(e); }
}

module.exports = {
  register, registerValidation,
  login, loginValidation,
  refreshToken, logout, me,
  forgotPassword, resetPassword, changePassword,
};
