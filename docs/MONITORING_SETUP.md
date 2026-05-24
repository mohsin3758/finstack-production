# MONITORING SETUP — FinStack ERP v21
**Date:** 2026-05-22 | **Stack:** Sentry + BetterStack + Uptime Kuma

---

## MONITORING ARCHITECTURE

```
Application → Sentry (errors + performance)
           → BetterStack (structured logs)
           → Uptime Kuma (uptime checks)
           → Prometheus + Grafana (metrics) [optional, self-hosted]
```

---

## SENTRY INTEGRATION

### Backend Setup

```bash
cd backend
npm install @sentry/node @sentry/profiling-node
```

```javascript
// backend/src/utils/monitoring.js
'use strict';
const Sentry = require('@sentry/node');
const { nodeProfilingIntegration } = require('@sentry/profiling-node');

function initSentry() {
  if (!process.env.SENTRY_DSN) {
    console.warn('[Monitoring] SENTRY_DSN not set — error tracking disabled');
    return;
  }

  Sentry.init({
    dsn:         process.env.SENTRY_DSN,
    environment: process.env.NODE_ENV || 'development',
    release:     `finstack@${process.env.npm_package_version || '21.0.0'}`,
    integrations: [
      nodeProfilingIntegration(),
      Sentry.httpIntegration(),
      Sentry.expressIntegration(),
    ],
    tracesSampleRate:   process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
    profilesSampleRate: 0.1,
    beforeSend(event) {
      // Strip PII from events
      if (event.user) {
        delete event.user.email;
        delete event.user.ip_address;
      }
      return event;
    },
  });

  console.log('✓ Sentry initialized');
}

// Custom error reporter
function captureError(error, context = {}) {
  Sentry.withScope(scope => {
    Object.entries(context).forEach(([k, v]) => scope.setExtra(k, v));
    Sentry.captureException(error);
  });
}

// Payroll failure tracking
function trackPayrollFailure(employeeId, companyId, error) {
  Sentry.captureEvent({
    message:  `Payroll processing failed for employee ${employeeId}`,
    level:    'error',
    tags:     { type: 'payroll_failure', company_id: companyId },
    extra:    { employee_id: employeeId, error: error.message },
  });
}

// Invoice generation failure
function trackInvoiceFailure(invoiceId, error) {
  Sentry.captureEvent({
    message: `Invoice generation failed: ${invoiceId}`,
    level:   'error',
    tags:    { type: 'invoice_failure' },
    extra:   { invoice_id: invoiceId, error: error.message },
  });
}

// Auth failure tracking (brute-force detection)
function trackAuthFailure(email, ip, reason) {
  Sentry.captureEvent({
    message: `Auth failure: ${reason}`,
    level:   'warning',
    tags:    { type: 'auth_failure', reason },
    extra:   { ip },  // Don't log email (PII)
  });
}

module.exports = {
  Sentry, initSentry, captureError,
  trackPayrollFailure, trackInvoiceFailure, trackAuthFailure,
};
```

```javascript
// Add to app.js (after dotenv, before everything else):
const { initSentry, Sentry } = require('./src/utils/monitoring');
initSentry();

// BEFORE routes:
app.use(Sentry.Handlers.requestHandler());
app.use(Sentry.Handlers.tracingHandler());

// AFTER routes, BEFORE errorHandler:
app.use(Sentry.Handlers.errorHandler());
```

### Frontend Sentry Setup

```bash
cd frontend
npm install @sentry/nextjs
```

```javascript
// frontend/sentry.client.config.ts
import * as Sentry from '@sentry/nextjs';
Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  environment: process.env.NODE_ENV,
  tracesSampleRate: 0.1,
  replaysOnErrorSampleRate: 1.0,
  integrations: [
    Sentry.replayIntegration({ maskAllText: true, blockAllMedia: true }),
  ],
});
```

---

## BETTERSTACK (LOG MANAGEMENT)

```bash
cd backend
npm install @logtail/node @logtail/winston
```

```javascript
// backend/src/utils/logger.js — add BetterStack transport:
const { Logtail } = require('@logtail/node');
const { LogtailTransport } = require('@logtail/winston');

// In createLogger transports array:
if (process.env.BETTERSTACK_TOKEN) {
  const logtail = new Logtail(process.env.BETTERSTACK_TOKEN);
  transports.push(new LogtailTransport(logtail));
}
```

---

## UPTIME KUMA SETUP

```yaml
# Add to docker-compose.yml:
  uptime-kuma:
    image: louislam/uptime-kuma:1
    container_name: finstack_uptime
    restart: unless-stopped
    volumes:
      - uptime_data:/app/data
    ports:
      - "127.0.0.1:3100:3001"
    networks: [finstack_net]
```

```
Monitors to configure in Uptime Kuma UI:
1. API Health:      GET https://api.finstack.aviinjobs.com/health
   Interval: 60s, Alert if down for 2 checks

2. Frontend:        GET https://finstack.aviinjobs.com
   Interval: 60s

3. DB Connection:   GET https://api.finstack.aviinjobs.com/health
   Check: response.body.db === 'connected'

4. Login API:       POST https://api.finstack.aviinjobs.com/api/v1/auth/login
   Body: { "email": "monitor@finstack.internal", "password": "..." }
   Expected: 200 or 401 (server up = either is fine, 5xx = alert)

Alert channels: Telegram / Slack / Email
```

---

## PROMETHEUS METRICS (Optional — Advanced)

```bash
cd backend
npm install prom-client
```

```javascript
// backend/src/utils/metrics.js
'use strict';
const client = require('prom-client');

// Enable default Node.js metrics
const register = new client.Registry();
client.collectDefaultMetrics({ register });

// Custom metrics
const httpRequestDuration = new client.Histogram({
  name:    'http_request_duration_seconds',
  help:    'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status_code'],
  buckets: [0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10],
  registers: [register],
});

const invoiceCreationTotal = new client.Counter({
  name:    'invoice_creation_total',
  help:    'Total invoices created',
  labelNames: ['company_id', 'status'],
  registers: [register],
});

const payrollProcessingDuration = new client.Histogram({
  name:    'payroll_processing_duration_seconds',
  help:    'Duration of payroll processing',
  labelNames: ['company_id'],
  registers: [register],
});

const queueJobsTotal = new client.Counter({
  name:    'queue_jobs_total',
  help:    'Total queue jobs by status',
  labelNames: ['queue', 'status'],
  registers: [register],
});

const activeConnections = new client.Gauge({
  name:    'db_pool_active_connections',
  help:    'Active database pool connections',
  registers: [register],
});

// Metrics endpoint
function metricsRouter(app) {
  app.get('/metrics', async (_req, res) => {
    // Only allow from localhost/internal
    res.set('Content-Type', register.contentType);
    res.end(await register.metrics());
  });
}

module.exports = {
  register, metricsRouter,
  httpRequestDuration, invoiceCreationTotal,
  payrollProcessingDuration, queueJobsTotal, activeConnections,
};
```

---

## KEY ALERTS TO CONFIGURE

| Alert | Condition | Severity | Channel |
|-------|-----------|---------|---------|
| API down | /health returns non-200 for 2min | 🔴 Critical | PagerDuty + Telegram |
| DB connection failed | health.db !== 'connected' | 🔴 Critical | PagerDuty |
| Login failures spike | >20 failures/min same IP | 🟠 High | Telegram |
| Payroll job failed | BullMQ job fails after 3 retries | 🟠 High | Email |
| Invoice PDF failed | generate_pdf job fails | 🟡 Medium | Slack |
| Queue depth > 100 | email queue backlog | 🟡 Medium | Slack |
| Response time P95 > 2s | API latency degraded | 🟡 Medium | Slack |
| Memory usage > 80% | Container memory pressure | 🟡 Medium | Telegram |
| DB connections > 15 | Pool near exhaustion | 🟠 High | Telegram |

---

## ENVIRONMENT VARIABLES FOR MONITORING

```bash
# Add to backend .env:
SENTRY_DSN=https://your-key@sentry.io/project-id
BETTERSTACK_TOKEN=your-betterstack-source-token
METRICS_PORT=9090    # Internal only, not exposed via Nginx
```
