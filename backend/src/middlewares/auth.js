'use strict';
// ============================================================
// auth.js — JWT authentication middleware
// ============================================================
const jwt    = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');

const { AppError }  = require('./errorHandler');
const { getCache, setCache, delCache, cacheKey, TTL } = require('../config/redis');
const logger = require('../utils/logger');

const ACCESS_SECRET  = process.env.JWT_SECRET         || 'finstack_jwt_dev_secret_change_in_prod';
const REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'finstack_refresh_dev_secret_change_in_prod';
const ACCESS_EXP     = process.env.JWT_EXPIRES_IN     || '8h';

// ── Token factories ───────────────────────────────────────────────────────
function generateAccessToken(payload)  {
  return jwt.sign(payload, ACCESS_SECRET,  { expiresIn: ACCESS_EXP,  algorithm: 'HS256' });
}
function generateRefreshToken(payload) {
  return jwt.sign(payload, REFRESH_SECRET, { expiresIn: '30d',       algorithm: 'HS256' });
}

// ── Authenticate middleware ───────────────────────────────────────────────
async function authenticate(req, _res, next) {
  try {
    const header = req.headers.authorization;
    if(!header?.startsWith('Bearer ')) throw new AppError('Access token required', 401, 'UNAUTHORIZED');

    const token = header.slice(7);

    // Blacklist check
    if(await getCache(`bl:${token}`)) throw new AppError('Token revoked', 401, 'TOKEN_REVOKED');

    let decoded;
    try {
      decoded = jwt.verify(token, ACCESS_SECRET);
    } catch(e) {
      if(e.name === 'TokenExpiredError') throw new AppError('Token expired', 401, 'TOKEN_EXPIRED');
      throw new AppError('Invalid token', 401, 'TOKEN_INVALID');
    }

    // User from cache
    const uKey = cacheKey(decoded.company_id, 'user', decoded.user_id);
    let user   = await getCache(uKey);

    if(!user) {
      const { User, Company } = require('../models');
      const dbUser = await User.findOne({
        where:   { id: decoded.user_id, company_id: decoded.company_id },
        include: [{ model: Company, as: 'company', attributes: ['id','name','slug','gstin','active','subscription'] }],
        attributes: { exclude: ['password_hash','reset_token','mfa_secret'] },
      });
      if(!dbUser) throw new AppError('User not found', 401, 'USER_NOT_FOUND');
      user = dbUser.toJSON();
      await setCache(uKey, user, TTL.SHORT);
    }

    if(user.status !== 'active')       throw new AppError('Account inactive', 401, 'ACCOUNT_INACTIVE');
    if(!user.company?.active)           throw new AppError('Company suspended', 403, 'COMPANY_SUSPENDED');
    if(user.locked_until && new Date(user.locked_until) > new Date())
      throw new AppError('Account locked', 401, 'ACCOUNT_LOCKED');

    req.user       = user;
    req.company_id = user.company_id;
    next();
  } catch(e) { next(e); }
}

// ── Blacklist a token (on logout) ─────────────────────────────────────────
async function blacklistToken(token) {
  try {
    const d = jwt.decode(token);
    if(!d?.exp) return;
    const ttl = Math.max(1, d.exp - Math.floor(Date.now()/1000));
    await setCache(`bl:${token}`, 1, ttl);
  } catch(e) { logger.warn('blacklistToken error:', e.message); }
}

// ── Password helpers ──────────────────────────────────────────────────────
const hashPassword    = (pw) => bcrypt.hash(pw, 12);
const comparePassword = (pw, hash) => bcrypt.compare(pw, hash);

module.exports = {
  authenticate, blacklistToken,
  generateAccessToken, generateRefreshToken,
  hashPassword, comparePassword,
};
