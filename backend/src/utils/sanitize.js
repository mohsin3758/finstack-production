'use strict';
const xss = require('xss');

/**
 * sanitize.js — Centralized input sanitization utilities.
 * Used by controllers before writing user input to the database.
 */

// ── XSS-safe string sanitizer ─────────────────────────────────────────────
function sanitizeString(str) {
  if (typeof str !== 'string') return str;
  return xss(str.trim(), {
    whiteList:       {},     // No HTML tags allowed
    stripIgnoreTag:  true,
    stripIgnoreTagBody: ['script', 'style'],
  });
}

// ── Sanitize an entire object's string fields ─────────────────────────────
function sanitizeObject(obj) {
  if (!obj || typeof obj !== 'object') return obj;
  const result = {};
  for (const [k, v] of Object.entries(obj)) {
    if (typeof v === 'string') {
      result[k] = sanitizeString(v);
    } else if (typeof v === 'object' && v !== null && !Array.isArray(v)) {
      result[k] = sanitizeObject(v);
    } else if (Array.isArray(v)) {
      result[k] = v.map(item => typeof item === 'string' ? sanitizeString(item) : item);
    } else {
      result[k] = v;
    }
  }
  return result;
}

// ── Mask sensitive fields for logging ─────────────────────────────────────
const SENSITIVE_FIELDS = new Set([
  'password', 'password_hash', 'token', 'secret', 'key',
  'aadhar', 'otp', 'cvv', 'card_number', 'bank_account',
  'jwt', 'access_token', 'refresh_token', 'api_key',
]);

function maskSensitive(obj, depth = 0) {
  if (!obj || typeof obj !== 'object' || depth > 5) return obj;
  const result = {};
  for (const [k, v] of Object.entries(obj)) {
    if (SENSITIVE_FIELDS.has(k.toLowerCase())) {
      result[k] = '***REDACTED***';
    } else if (typeof v === 'object' && v !== null) {
      result[k] = maskSensitive(v, depth + 1);
    } else {
      result[k] = v;
    }
  }
  return result;
}

// ── Safe filename for uploads ──────────────────────────────────────────────
function sanitizeFilename(filename) {
  if (!filename || typeof filename !== 'string') return 'upload';
  // Keep only safe characters, replace everything else with underscore
  const name = filename
    .replace(/\s+/g, '_')
    .replace(/[^a-zA-Z0-9._-]/g, '')
    .toLowerCase()
    .slice(0, 100);
  return name || 'upload';
}

// ── Express middleware: sanitize req.body strings ──────────────────────────
function sanitizeBody(req, _res, next) {
  if (req.body && typeof req.body === 'object') {
    req.body = sanitizeObject(req.body);
  }
  next();
}

module.exports = { sanitizeString, sanitizeObject, maskSensitive, sanitizeFilename, sanitizeBody };
