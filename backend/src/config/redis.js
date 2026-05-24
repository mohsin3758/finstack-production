'use strict';
const Redis  = require('ioredis');
const logger = require('../utils/logger');

const CONN = {
  host:     process.env.REDIS_HOST     || 'localhost',
  port:     parseInt(process.env.REDIS_PORT || '6379'),
  password: process.env.REDIS_PASSWORD || undefined,
  db:       parseInt(process.env.REDIS_DB  || '0'),
  lazyConnect: true,
  retryStrategy: (times) => {
    if(times > 10) return null;
    return Math.min(times * 300, 3000);
  },
  maxRetriesPerRequest: 3,
};

// Cache client
const redis = new Redis(CONN);
redis.on('connect',      () => logger.info('✓ Redis connected'));
redis.on('error',        (e) => logger.error('Redis error:', e.message));
redis.on('reconnecting', () => logger.warn('Redis reconnecting…'));

// BullMQ requires separate connection (no subscribe conflict)
const bullOpts = { ...CONN, maxRetriesPerRequest: null, enableReadyCheck: false };

// ── TTL constants ─────────────────────────────────────────────────────────
const TTL = {
  SHORT:  5  * 60,       // 5 min
  MEDIUM: 30 * 60,       // 30 min
  LONG:   24 * 60 * 60,  // 24 h
};

// ── Helpers (fail-safe — app runs even if Redis is down) ─────────────────
const getCache = async (key) => {
  try { const v = await redis.get(key); return v ? JSON.parse(v) : null; }
  catch(e) { logger.warn(`Redis getCache failed [${key}]: ${e.message}`); return null; }
};
const setCache = async (key, val, ttl = TTL.MEDIUM) => {
  try { return await redis.setex(key, ttl, JSON.stringify(val)); }
  catch(e) { logger.warn(`Redis setCache failed [${key}]: ${e.message}`); return null; }
};
const delCache = async (key) => {
  try { return await redis.del(key); }
  catch(e) { logger.warn(`Redis delCache failed [${key}]: ${e.message}`); return null; }
};
const delPattern = async (pattern) => {
  // Use SCAN instead of KEYS to avoid blocking Redis event loop (O(N) safety)
  try {
    let cursor = '0';
    const keysToDelete = [];
    do {
      const [next, batch] = await redis.scan(cursor, 'MATCH', pattern, 'COUNT', 100);
      cursor = next;
      keysToDelete.push(...batch);
    } while (cursor !== '0');
    if (keysToDelete.length > 0) {
      // Delete in chunks of 100 to avoid large DEL commands
      for (let i = 0; i < keysToDelete.length; i += 100) {
        await redis.del(keysToDelete.slice(i, i + 100));
      }
    }
  } catch(e) { logger.warn(`Redis delPattern failed [${pattern}]: ${e.message}`); }
};
const cacheKey = (company, ...parts) => `fs:${company}:${parts.join(':')}`;

module.exports = { redis, bullOpts, TTL, getCache, setCache, delCache, delPattern, cacheKey };
