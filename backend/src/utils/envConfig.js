'use strict';
/**
 * envConfig.js — Single source of truth for all environment configuration.
 * Import this instead of reading process.env directly throughout the codebase.
 * Provides type coercion and defaults with documentation.
 */

const config = {
  // ── Server ──────────────────────────────────────────────────────────────
  env:          process.env.NODE_ENV       || 'development',
  port:         parseInt(process.env.PORT  || '3001'),
  isProd:       process.env.NODE_ENV       === 'production',
  isDev:        process.env.NODE_ENV       === 'development',
  frontendUrl:  process.env.FRONTEND_URL   || 'http://localhost:3000',

  // ── Database ─────────────────────────────────────────────────────────────
  db: {
    host:     process.env.DB_HOST     || 'localhost',
    port:     parseInt(process.env.DB_PORT || '5432'),
    name:     process.env.DB_NAME     || 'finstack',
    user:     process.env.DB_USER     || 'finstack',
    password: process.env.DB_PASSWORD,
    ssl:      process.env.DB_SSL      === 'true',
    log:      process.env.DB_LOG      === 'true',
    poolMax:  parseInt(process.env.DB_POOL_MAX || '20'),
    poolMin:  parseInt(process.env.DB_POOL_MIN || '2'),
  },

  // ── Redis ─────────────────────────────────────────────────────────────────
  redis: {
    host:     process.env.REDIS_HOST     || 'localhost',
    port:     parseInt(process.env.REDIS_PORT || '6379'),
    password: process.env.REDIS_PASSWORD || undefined,
    db:       parseInt(process.env.REDIS_DB   || '0'),
  },

  // ── JWT ───────────────────────────────────────────────────────────────────
  jwt: {
    secret:         process.env.JWT_SECRET         || 'INSECURE_DEFAULT',
    refreshSecret:  process.env.JWT_REFRESH_SECRET || 'INSECURE_DEFAULT',
    expiresIn:      process.env.JWT_EXPIRES_IN     || '8h',
    refreshExpiry:  '30d',
    cookieSecret:   process.env.COOKIE_SECRET      || 'INSECURE_DEFAULT',
  },

  // ── Rate Limiting ─────────────────────────────────────────────────────────
  rateLimit: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW || '15') * 60 * 1000,
    max:      parseInt(process.env.RATE_LIMIT_MAX    || '200'),
  },

  // ── Email ─────────────────────────────────────────────────────────────────
  smtp: {
    host:    process.env.SMTP_HOST   || 'smtp.gmail.com',
    port:    parseInt(process.env.SMTP_PORT || '587'),
    secure:  process.env.SMTP_SECURE === 'true',
    user:    process.env.SMTP_USER   || '',
    pass:    process.env.SMTP_PASS   || '',
    enabled: !!(process.env.SMTP_USER && process.env.SMTP_PASS),
  },

  // ── Logging ───────────────────────────────────────────────────────────────
  log: {
    level: process.env.LOG_LEVEL || (process.env.NODE_ENV === 'production' ? 'info' : 'debug'),
  },

  // ── Feature Flags ─────────────────────────────────────────────────────────
  features: {
    auditLog:   process.env.FEATURE_AUDIT    !== 'false',
    emailQueue: process.env.FEATURE_EMAIL    !== 'false',
    pdfGen:     process.env.FEATURE_PDF      === 'true',  // Disabled until implemented
    aiAssist:   process.env.FEATURE_AI       === 'true',  // Disabled until implemented
  },
};

module.exports = config;
