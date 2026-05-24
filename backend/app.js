'use strict';
require('dotenv').config();

// ── Validate environment BEFORE any other code runs ────────────────────────
const { validateEnv } = require('./src/utils/validateEnv');
validateEnv();

require('express-async-errors');

const express      = require('express');
const helmet       = require('helmet');
const cors         = require('cors');
const compression  = require('compression');
const morgan       = require('morgan');
const cookieParser = require('cookie-parser');
const hpp          = require('hpp');
const crypto       = require('crypto');
const path         = require('path');
const fs           = require('fs');

const { sequelize }    = require('./src/config/database');
const logger           = require('./src/utils/logger');
const { rateLimiter }  = require('./src/middlewares/rateLimiter');
const { errorHandler } = require('./src/middlewares/errorHandler');
const routes           = require('./src/routes');

const app  = express();
const PORT = parseInt(process.env.PORT || '3001');

// ── Ensure required dirs ──────────────────────────────────────────────────
['uploads','logs'].forEach(d => {
  const dir = path.join(process.cwd(), d);
  if(!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});

// ── Security ──────────────────────────────────────────────────────────────
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc:   ["'self'","'unsafe-inline'"],
      scriptSrc:  ["'self'"],
      imgSrc:     ["'self'","data:","https:"],
      connectSrc: ["'self'"],
    }
  },
  crossOriginEmbedderPolicy: false,
  hsts: { maxAge: 63072000, includeSubDomains: true, preload: true },
}));

// ── CORS ──────────────────────────────────────────────────────────────────
const allowedOrigins = (process.env.FRONTEND_URL || 'http://localhost:3000')
  .split(',').map(s => s.trim());

app.use(cors({
  origin(origin, cb) {
    // Always validate origin — no environment-based bypass
    if (!origin || allowedOrigins.includes(origin)) {
      cb(null, true);
    } else {
      cb(new Error(`CORS: origin ${origin} not allowed`));
    }
  },
  credentials:    true,
  methods:        ['GET','POST','PUT','PATCH','DELETE','OPTIONS'],
  allowedHeaders: ['Content-Type','Authorization','X-Request-ID','X-Company-ID'],
  maxAge:         600,
}));

// ── Body parsing ──────────────────────────────────────────────────────────
app.use(compression());
app.use(hpp());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser(process.env.COOKIE_SECRET || 'finstack_cookie_secret_dev'));

// ── Request ID + timing ───────────────────────────────────────────────────
app.use((req, res, next) => {
  req.id      = crypto.randomUUID();
  req.startAt = Date.now();
  res.setHeader('X-Request-ID', req.id);
  next();
});

// ── Logging ───────────────────────────────────────────────────────────────
app.use(morgan(':method :url :status :res[content-length] - :response-time ms', {
  stream: { write: msg => logger.http(msg.trim()) },
  skip:   (req) => req.url === '/health',
}));

// ── Input sanitization (XSS protection on all body strings) ─────────────
const { sanitizeBody } = require('./src/utils/sanitize');
app.use(sanitizeBody);

// ── Rate limiting (global) ────────────────────────────────────────────────
app.use('/api/', rateLimiter);

// ── Static uploads ────────────────────────────────────────────────────────
app.use('/uploads', express.static(path.join(process.cwd(), 'uploads'), {
  maxAge: '7d',
  setHeaders(res) { res.setHeader('X-Content-Type-Options','nosniff'); }
}));

// ── Health check ──────────────────────────────────────────────────────────
app.get('/health', async (_req, res) => {
  try {
    await sequelize.authenticate();
    res.json({
      status: 'ok',
      db:     'connected',
      ts:     new Date().toISOString(),
      uptime: Math.round(process.uptime()),
    });
  } catch(e) {
    res.status(503).json({ status: 'degraded', db: 'disconnected', error: e.message });
  }
});

// ── API routes ────────────────────────────────────────────────────────────
app.use('/api/v1', routes);

// ── 404 ───────────────────────────────────────────────────────────────────
app.use((_req, res) => {
  res.status(404).json({ success: false, code: 'NOT_FOUND', message: 'Endpoint not found' });
});

// ── Global error handler ──────────────────────────────────────────────────
app.use(errorHandler);

// ── Startup ───────────────────────────────────────────────────────────────
async function start() {
  try {
    await sequelize.authenticate();
    logger.info('✓ PostgreSQL connected');

    if(process.env.NODE_ENV === 'development') {
      // Use migrate.js (schema.sql) for schema changes, not Sequelize sync
      // sync validate:true only checks that tables exist without modifying them
      await sequelize.sync({ force: false });
      logger.info('✓ DB connection validated');
    }

    const server = app.listen(PORT, '0.0.0.0', () => {
      logger.info(`✓ FinStack API v21.0.0 listening on :${PORT} [${process.env.NODE_ENV || 'development'}]`);
    });

    // Graceful shutdown
    const shutdown = async (signal) => {
      logger.info(`${signal} received — shutting down gracefully`);
      server.close(async () => {
        await sequelize.close();
        logger.info('Server closed');
        process.exit(0);
      });
      setTimeout(() => { logger.error('Force shutdown'); process.exit(1); }, 10000);
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT',  () => shutdown('SIGINT'));

  } catch(err) {
    logger.error('Fatal startup error:', err.message);
    process.exit(1);
  }
}

start();
module.exports = app; // For tests
