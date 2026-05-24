'use strict';
const { AppError } = require('./errorHandler');

/**
 * subscriptionGuard.js
 *
 * Middleware that enforces subscription state before allowing access.
 * Run this AFTER authenticate() so req.user and req.user.company are available.
 *
 * Subscription states:
 *   trial       → full access until subscription_end date
 *   active      → full access
 *   past_due    → read-only access (can view but not create/update/delete)
 *   suspended   → no access
 *   cancelled   → no access
 */

const WRITE_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

// Routes always allowed regardless of subscription
const ALWAYS_ALLOWED = new Set([
  '/auth/me', '/auth/logout', '/auth/change-password',
  '/settings',  // Need to access settings to update billing
  '/notifications',
]);

function subscriptionGuard(req, _res, next) {
  const company = req.user?.company;
  if (!company) return next(new AppError('Company context missing', 403, 'NO_COMPANY'));

  // super_admin bypasses subscription checks
  if (req.user?.role === 'super_admin') return next();

  const { subscription, subscription_end } = company;
  const now = new Date();
  const path = req.path;

  // Always allow specific routes
  if (ALWAYS_ALLOWED.has(path)) return next();

  // Suspended or cancelled: block everything
  if (subscription === 'suspended' || subscription === 'cancelled') {
    throw new AppError(
      'Your subscription has been suspended. Please contact support.',
      402, 'SUBSCRIPTION_SUSPENDED'
    );
  }

  // Trial: check expiry date
  if (subscription === 'trial') {
    if (subscription_end && new Date(subscription_end) < now) {
      // Trial expired: allow reads, block writes
      if (WRITE_METHODS.has(req.method)) {
        throw new AppError(
          'Your free trial has expired. Please upgrade to continue.',
          402, 'TRIAL_EXPIRED'
        );
      }
    }
    return next();
  }

  // Past due: read-only
  if (subscription === 'past_due') {
    if (WRITE_METHODS.has(req.method)) {
      throw new AppError(
        'Your subscription payment is overdue. Please update your payment method.',
        402, 'PAYMENT_PAST_DUE'
      );
    }
    return next();
  }

  // Active subscription
  if (subscription === 'active') return next();

  // Unknown state: allow but log
  console.warn(`Unknown subscription state '${subscription}' for company ${company.id}`);
  next();
}

module.exports = { subscriptionGuard };
