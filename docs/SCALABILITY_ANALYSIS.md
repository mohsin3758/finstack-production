# SCALABILITY ANALYSIS — FinStack ERP v21
**Date:** 2026-05-22 | **Target:** 1,000 tenants / 50,000 concurrent users

---

## 1. CURRENT CAPACITY ESTIMATE

### Baseline (Single Node, 2 vCPU / 4GB RAM)
| Metric | Current | Bottleneck |
|--------|---------|-----------|
| Concurrent API requests | ~200-400 | Express single-thread; 20 DB connections |
| DB connections | 20 (pool max) | PostgreSQL; Sequelize pool |
| Redis ops/sec | ~50,000 | ioredis, single connection |
| Invoice generation | Sequential | No PDF worker concurrency |
| Queue throughput | 3 jobs/sec | BullMQ concurrency config |
| Tenant limit | ~500 active | Above this, dashboard query gets slow |

### Bottleneck 1 — Single Express Instance
Node.js is single-threaded. CPU-bound payroll calculations for bulk processing block the 
event loop. With `cluster` mode or PM2, 2 vCPU → 2 workers → ~2× throughput.

### Bottleneck 2 — PostgreSQL Pool Exhaustion
```
Current: pool.max = 20 per service
         api service: up to 20 connections
         worker service: up to 20 connections
         Total: 40 connections

Supabase free: 20 connections  → IMMEDIATE EXHAUSTION
Supabase pro:  60 connections  → exhausted at moderate load
PG default:    100 connections → OK for single-server
```

### Bottleneck 3 — Redis KEYS Pattern (FIXED — still needs SCAN migration)
```javascript
// Current (problematic in production):
const keys = await redis.keys(pattern);  // Blocks Redis event loop

// Fix (implemented below):
const keys = [];
let cursor = '0';
do {
  const [next, batch] = await redis.scan(cursor, 'MATCH', pattern, 'COUNT', 100);
  cursor = next;
  keys.push(...batch);
} while (cursor !== '0');
```

### Bottleneck 4 — Dashboard Query (9 parallel DB calls)
```javascript
// Current: runs on every request (5-min cache helps but cold start is expensive)
await Promise.all([
  Invoice.findOne(...),   // COUNT + SUM aggregations
  Invoice.findOne(...),   // Previous month
  Employee.count(...),
  Client.count(...),
  Transaction.findOne(...),
  Invoice.findAll(...),   // Last 10
  Invoice.findAll(...),   // Overdue
  Invoice.findAll(...),   // Monthly trend (GROUP BY)
  LeaveRequest.count(...),
]);
// With 1000 tenants, concurrent cache misses = 9000 simultaneous DB queries
```

---

## 2. SCALING ARCHITECTURE (Target: 10,000 tenants)

```
                          ┌─────────────────┐
                          │  Cloudflare CDN  │
                          │  (WAF + DDoS)    │
                          └────────┬────────┘
                                   │
                          ┌────────▼────────┐
                          │   Load Balancer  │
                          │  (Railway/nginx) │
                          └────┬────────┬───┘
                               │        │
                    ┌──────────▼──┐  ┌──▼──────────┐
                    │  API Node 1 │  │  API Node 2 │  ← Horizontal scaling
                    │  (Express)  │  │  (Express)  │
                    └──────┬──────┘  └──────┬──────┘
                           │                │
                    ┌──────▼────────────────▼──────┐
                    │         PgBouncer             │  ← Connection pooling
                    │    (transaction mode)         │
                    └─────────────┬────────────────┘
                                  │
                    ┌─────────────▼────────────────┐
                    │    PostgreSQL 15 Primary      │
                    │    (Supabase / RDS)          │
                    └──────────────────────────────┘
                          │ read replicas
                    ┌─────▼───────────────────────┐
                    │    Read Replica (reports)    │
                    └─────────────────────────────┘

                    ┌─────────────────────────────┐
                    │     Redis Cluster / Upstash  │
                    │   (cache + BullMQ backing)   │
                    └─────────────────────────────┘

                    ┌─────────────────────────────┐
                    │   Worker Fleet (BullMQ)      │
                    │  (2-4 instances, auto-scale) │
                    └─────────────────────────────┘
```

---

## 3. DATABASE SCALING STRATEGY

### Phase 1 (0–500 tenants): Current setup
- Single PostgreSQL 15 instance
- PgBouncer with pool_size=10 per service
- Read replicas for dashboard/reports queries

### Phase 2 (500–5,000 tenants): Tenant sharding preparation
```sql
-- Add shard_key to companies table
ALTER TABLE companies ADD COLUMN shard_id SMALLINT DEFAULT 0;

-- Route heavy tenants to dedicated schema
CREATE SCHEMA tenant_heavy;
-- Move top 10% revenue tenants to dedicated schema
```

### Phase 3 (5,000+ tenants): Full horizontal sharding
- Citus extension on PostgreSQL
- Distribute by `company_id`
- Coordinator → worker node routing

---

## 4. CACHING STRATEGY IMPROVEMENTS

### Current
```
User profile: 5 min TTL
Dashboard:    5 min TTL
Invoice list: invalidated on write
```

### Target (multi-layer)
```
L1: In-process LRU (node-lru-cache)  → 10s TTL, 100 entries
    ↓ miss
L2: Redis (current)                   → 5min TTL
    ↓ miss
L3: PostgreSQL                        → source of truth

Benefits:
- Reduces Redis hits by ~80% for hot paths
- User profile lookup: 0ms (L1) vs 5ms (Redis) vs 50ms (PG)
```

---

## 5. QUEUE SCALING

### Current
```
invoiceWorker:    concurrency: 3  (OK for <100 invoices/day)
emailWorker:      concurrency: 5  (OK for <500 emails/day)
notifWorker:      concurrency: 10 (OK for <1000 notifs/day)
payrollWorker:    concurrency: 2  (OK for <50 employees)
```

### Target (1,000 tenants)
```
Invoice queue:   auto-scaling 3→20 workers based on queue depth
Email queue:     delegate to SendGrid/Resend (external SMTP pool)
Payroll queue:   concurrency: 10, batch employees in chunks of 50
Add DLQ:         failed jobs → dead_letters queue → alerting
Add Bull Board:  visibility into queue health
```

---

## 6. FRONTEND SCALING

### Current Limitation
- Static export (`output: 'export'`) — no SSR
- All pages are client-rendered SPA
- Single Nginx instance serving static files

### Target
```
Option A (Simple): Vercel deployment
  - CDN-served Next.js pages globally
  - Edge caching with 1-year cache on static assets
  - No changes needed to code

Option B (Self-hosted): Nginx + Cloudflare
  - Static files: Cloudflare cache (current setup)
  - Dynamic API: Railway/Fly.io
  - Upload files: Cloudflare R2 / S3

Limitation of static export:
  - Cannot do server-side auth checks (cookie reading)
  - Cannot do ISR (incremental static regeneration)
  - All navigation is client-side — slower on cold start
```

---

## 7. PERFORMANCE TARGETS (SLA)

| Endpoint | Current (est.) | Target P95 | Strategy |
|---------|---------------|-----------|---------|
| POST /auth/login | 120ms | <200ms | bcrypt 12 rounds is correct |
| GET /dashboard | 800ms (cold) | <300ms | Warm cache + read replica |
| GET /invoices | 50ms | <100ms | Pagination enforced |
| POST /invoices | 200ms | <500ms | Acceptable (transaction) |
| POST /payroll/process | 2-5s | <10s | Queue it async |
| GET /employees | 30ms | <100ms | ✅ Already fast |

---

## 8. QUICK WINS (Implement This Week)

1. **Fix SCAN**: Replace `redis.keys()` with cursor-based SCAN
2. **Add PgBouncer**: Reduce pool max:20 → max:8; add PgBouncer in docker-compose
3. **Add PM2**: Replace `node app.js` with `pm2 start app.js -i max` in Dockerfile
4. **Add compression**: Already in Express ✅; verify Nginx gzip is on for API responses
5. **Paginate employees**: Enforce `limit` in all list endpoints (already done ✅)
6. **Index `transactions.date`**: Add missing index for accounts page queries
