'use strict';
/**
 * validateEnv.js — Validates required environment variables before server start.
 * Call this as the FIRST thing in app.js, before any other imports that read env vars.
 *
 * Philosophy: fail loudly on startup rather than silently using insecure defaults.
 */

const REQUIRED = [
  { key: 'JWT_SECRET',          minLen: 32, desc: 'JWT signing secret' },
  { key: 'JWT_REFRESH_SECRET',  minLen: 32, desc: 'JWT refresh signing secret' },
  { key: 'COOKIE_SECRET',       minLen: 32, desc: 'Cookie signing secret' },
  { key: 'DB_PASSWORD',         minLen: 8,  desc: 'PostgreSQL password' },
];

const INSECURE_DEFAULTS = [
  'finstack_jwt_dev_secret_minimum_32_characters_long',
  'finstack_refresh_dev_secret_minimum_32_characters',
  'finstack_dev_cookie_secret_change_in_prod_32chars',
  'finstack_secret_2026',
  'redis_secret_2026',
];

function validateEnv() {
  const isProd = process.env.NODE_ENV === 'production';
  const errors = [];
  const warnings = [];

  // 1. Check required vars exist and meet minimum length
  for (const { key, minLen, desc } of REQUIRED) {
    const val = process.env[key];
    if (!val) {
      errors.push(`Missing required env var: ${key} (${desc})`);
    } else if (val.length < minLen) {
      errors.push(`${key} is too short: ${val.length} chars, minimum ${minLen} (${desc})`);
    }
  }

  // 2. In production, reject known insecure defaults
  if (isProd) {
    for (const { key } of REQUIRED) {
      const val = process.env[key];
      if (val && INSECURE_DEFAULTS.includes(val)) {
        errors.push(`SECURITY: ${key} is using a known insecure default value in production`);
      }
    }

    // 3. Reject development SMTP credentials gap
    if (!process.env.SMTP_USER) {
      warnings.push('SMTP_USER not set — email features disabled');
    }

    // 4. Ensure SSL/TLS in production
    if (process.env.DB_SSL !== 'true') {
      warnings.push('DB_SSL is not true — database connection is unencrypted');
    }

    // 5. Ensure FRONTEND_URL is set correctly
    if (!process.env.FRONTEND_URL || process.env.FRONTEND_URL.includes('localhost')) {
      errors.push('FRONTEND_URL must be set to a production domain in production');
    }
  }

  // Output warnings
  if (warnings.length > 0) {
    console.warn('\n⚠️  Environment Warnings:');
    warnings.forEach(w => console.warn(`   • ${w}`));
    console.warn('');
  }

  // Fail on errors
  if (errors.length > 0) {
    console.error('\n🚨 FATAL: Environment validation failed. Fix the following issues:\n');
    errors.forEach((e, i) => console.error(`   ${i + 1}. ${e}`));
    console.error('\nApplication cannot start with invalid configuration.\n');
    process.exit(1);
  }

  console.log('✓ Environment validation passed');
}

module.exports = { validateEnv };
