'use strict';
const rateLimit = require('express-rate-limit');

// Simple in-memory store (works for single instance)
// For multi-instance: swap with redis-rate-limit store
const rateLimiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW || '15') * 60 * 1000,
  max:      parseInt(process.env.RATE_LIMIT_MAX    || '200'),
  standardHeaders: true,
  legacyHeaders:   false,
  keyGenerator: (req) => `${req.company_id || req.ip}`,
  handler: (_req, res) => res.status(429).json({
    success: false, code: 'RATE_LIMIT',
    message: 'Too many requests. Please slow down.',
  }),
  skip: (req) => req.url === '/health',
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max:      10,
  keyGenerator: (req) => req.body?.email || req.ip,
  handler: (_req, res) => res.status(429).json({
    success: false, code: 'AUTH_RATE_LIMIT',
    message: 'Too many login attempts. Try again in 15 minutes.',
  }),
});

const heavyLimiter = rateLimit({
  windowMs: 60 * 1000,
  max:      10,
  handler: (_req, res) => res.status(429).json({
    success: false, code: 'HEAVY_RATE_LIMIT',
    message: 'Too many bulk operations.',
  }),
});

module.exports = { rateLimiter, authLimiter, heavyLimiter };
