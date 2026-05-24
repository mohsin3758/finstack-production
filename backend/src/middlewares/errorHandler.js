'use strict';
const logger = require('../utils/logger');

// ── Custom error class ─────────────────────────────────────────────────────
class AppError extends Error {
  constructor(message, status = 500, code = 'INTERNAL_ERROR', details = null) {
    super(message);
    this.name          = 'AppError';
    this.status        = status;
    this.code          = code;
    this.details       = details;
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }
}

// ── Global error handler middleware ────────────────────────────────────────
function errorHandler(err, req, res, _next) {
  err.status = err.status || 500;
  err.code   = err.code   || 'INTERNAL_ERROR';

  if (err.status >= 500) {
    logger.error({ message: err.message, stack: err.stack, url: req.originalUrl, user: req.user?.id });
  } else {
    logger.warn(`${err.status} [${err.code}] ${err.message} — ${req.method} ${req.originalUrl}`);
  }

  // Sequelize unique constraint
  if (err.name === 'SequelizeUniqueConstraintError') {
    const field = err.errors?.[0]?.path || 'field';
    return res.status(409).json({ success:false, code:'DUPLICATE_ENTRY', message:`${field} already exists`, field });
  }
  // Sequelize validation
  if (err.name === 'SequelizeValidationError') {
    return res.status(400).json({
      success:false, code:'VALIDATION_ERROR', message:'Validation failed',
      errors: err.errors.map(e => ({ field: e.path, message: e.message })),
    });
  }
  // Sequelize foreign key
  if (err.name === 'SequelizeForeignKeyConstraintError') {
    return res.status(400).json({ success:false, code:'REFERENCE_ERROR', message:'Referenced record does not exist' });
  }

  const isProd = process.env.NODE_ENV === 'production';
  return res.status(err.status).json({
    success:   false,
    code:      err.code,
    message:   (err.isOperational || !isProd) ? err.message : 'Internal server error',
    details:   err.details || undefined,
    requestId: req.id,
    ...((!isProd && err.stack) && { stack: err.stack }),
  });
}

// ── Audit log middleware ────────────────────────────────────────────────────
// Uses res 'finish' event (sync-safe) instead of monkey-patching res.end
function auditLog(resource) {
  return (req, res, next) => {
    const WRITE_METHODS = ['POST','PUT','PATCH','DELETE'];
    if (!WRITE_METHODS.includes(req.method)) return next();

    const startTime = Date.now();

    res.on('finish', () => {
      // Fire-and-forget — do not block the response
      setImmediate(async () => {
        try {
          const { AuditLog } = require('../models');
          const actionMap = { POST:'create', PUT:'update', PATCH:'update', DELETE:'delete' };
          await AuditLog.create({
            company_id:  req.company_id  || null,
            user_id:     req.user?.id    || null,
            user_name:   req.user?.name  || null,
            user_role:   req.user?.role  || null,
            action:      actionMap[req.method] || 'update',
            resource,
            resource_id: req.params?.id  || null,
            new_values:  req.method !== 'DELETE' ? sanitizeBody(req.body) : null,
            ip_address:  req.ip,
            user_agent:  req.get('User-Agent'),
            endpoint:    req.originalUrl,
            http_method: req.method,
            status_code: res.statusCode,
            duration_ms: Date.now() - startTime,
          });
        } catch (e) {
          logger.warn('Audit log write failed:', e.message);
        }
      });
    });

    next();
  };
}

function sanitizeBody(body) {
  if (!body || typeof body !== 'object') return body;
  const safe = { ...body };
  ['password','password_hash','token','secret','key','aadhar','otp'].forEach(k => {
    if (k in safe) safe[k] = '***';
  });
  return safe;
}

module.exports = { AppError, errorHandler, auditLog };
