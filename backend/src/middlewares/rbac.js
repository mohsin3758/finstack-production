'use strict';
const { AppError } = require('./errorHandler');

// Role rank (higher = more access)
const ROLE_RANK = { viewer:0, accountant:1, hr_manager:2, billing_manager:3, admin:4, super_admin:5 };

// Static permission matrix — no DB query per request
const PERMS = {
  super_admin:     { '*': ['*'] },
  admin: {
    employees:    ['create','read','update','delete','export','approve'],
    payroll:      ['create','read','update','delete','approve','export'],
    invoices:     ['create','read','update','delete','export','approve'],
    clients:      ['create','read','update','delete'],
    accounts:     ['create','read','update','delete','export'],
    leaves:       ['create','read','update','approve','reject'],
    attendance:   ['create','read','update'],
    compliance:   ['read','export'],
    reports:      ['read','export'],
    settings:     ['read','update'],
    users:        ['create','read','update','delete'],
    audit:        ['read'],
    notifications:['read','update'],
  },
  billing_manager: {
    invoices:     ['create','read','update','export'],
    clients:      ['create','read','update'],
    payroll:      ['read'],
    accounts:     ['read'],
    reports:      ['read'],
    notifications:['read','update'],
  },
  hr_manager: {
    employees:    ['create','read','update','export'],
    payroll:      ['create','read','update','approve','export'],
    attendance:   ['create','read','update'],
    leaves:       ['create','read','update','approve','reject'],
    compliance:   ['read'],
    reports:      ['read'],
    notifications:['read','update'],
  },
  accountant: {
    accounts:     ['create','read','update','export'],
    invoices:     ['read','export'],
    payroll:      ['read'],
    reports:      ['read','export'],
    compliance:   ['read'],
    notifications:['read','update'],
  },
  viewer: {
    employees:    ['read'],
    payroll:      ['read'],
    invoices:     ['read'],
    clients:      ['read'],
    accounts:     ['read'],
    reports:      ['read'],
    notifications:['read'],
  },
};

function hasPermission(user, resource, action) {
  if (!user?.role) return false;
  if (user.role === 'super_admin') return true;
  const rolePerms = PERMS[user.role] || {};
  if (rolePerms['*']?.includes('*')) return true;
  const allowed = rolePerms[resource] || [];
  if (allowed.includes('*') || allowed.includes(action)) return true;
  // User-level custom override (stored in users.permissions JSONB)
  const custom = user.permissions || {};
  if (custom[resource]?.includes(action)) return true;
  return false;
}

// ── Middleware factory ────────────────────────────────────────────────────
// Named `permit` (not `require`) to avoid shadowing Node.js built-in require
function permit(resource, action) {
  return (req, _res, next) => {
    if (!req.user)
      return next(new AppError('Authentication required', 401, 'UNAUTHORIZED'));
    if (!hasPermission(req.user, resource, action))
      return next(new AppError(`Permission denied: cannot ${action} ${resource}`, 403, 'FORBIDDEN'));
    next();
  };
}

// ── Minimum role-rank middleware ───────────────────────────────────────────
function requireRank(minRole) {
  return (req, _res, next) => {
    if (!req.user)
      return next(new AppError('Authentication required', 401, 'UNAUTHORIZED'));
    if ((ROLE_RANK[req.user.role] ?? -1) < (ROLE_RANK[minRole] ?? 99))
      return next(new AppError(`Requires ${minRole} role or higher`, 403, 'FORBIDDEN'));
    next();
  };
}

module.exports = { permit, requireRank, hasPermission, ROLE_RANK, PERMS };
