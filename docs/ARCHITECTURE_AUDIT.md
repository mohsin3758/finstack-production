# ARCHITECTURE AUDIT — FinStack ERP v21
**Date:** 2026-05-22 | **Auditor:** Senior Staff Engineer  
**Scope:** Full repository — backend, frontend, database, infrastructure, security

---

## 1. EXECUTIVE SUMMARY

FinStack ERP is a multi-tenant India-first SaaS ERP platform targeting SMEs. The codebase is
functionally complete for its MVP scope (invoicing, payroll, HR, accounts) and passes TypeScript
compilation and Next.js build with zero errors. Core architecture decisions are sound. However,
**zero automated test coverage**, multiple **hardcoded secrets in committed files**, three
**TODO production stubs**, and several **scaling bottlenecks** must be resolved before any
customer-facing deployment.

**Overall Architecture Grade: B+ (Production-Capable with 12 mandatory fixes)**

---

## 2. SYSTEM TOPOLOGY

```
Internet
   │
   ▼
Cloudflare (WAF + CDN)        ← NOT YET INTEGRATED
   │
   ▼
Nginx 1.25 (Reverse Proxy)
├── /               → Next.js static export (Nginx serves /usr/share/nginx/html)
├── /api/v1/*       → Node.js API (localhost:3001)
└── /uploads/*      → Static file serving (Nginx direct)
   │
   ▼
Node.js 20 Express API (port 3001)
├── Middleware: Helmet, CORS, HPP, Compression, Morgan, RateLimiter
├── Routes: 54 endpoints across 12 resource domains
├── Auth: JWT (HS256, 8h access + 30d refresh in Redis httpOnly cookie)
├── RBAC: Static permission matrix (6 roles, no DB query per request)
└── BullMQ Workers (separate process): invoice, email, notification, payroll
   │
   ├──▶ PostgreSQL 15 (Sequelize ORM)
   │    ├── 26 tables, 20 indexes
   │    ├── UUID primary keys throughout
   │    ├── Partitioned audit_logs by quarter
   │    ├── Soft deletes via paranoid (deleted_at)
   │    └── Pool: min:2, max:20
   │
   └──▶ Redis 7
        ├── Token blacklist (BL:token → TTL)
        ├── User cache (fs:{company}:user:{id} → 5min)
        ├── Dashboard cache (fs:{company}:dashboard:summary → 5min)
        └── BullMQ backing store
```

---

## 3. BACKEND ARCHITECTURE

### 3.1 Framework & Structure
| Aspect | Implementation | Assessment |
|--------|---------------|------------|
| Framework | Express 4.19 + express-async-errors | ✅ Solid |
| Language | Node.js 20 CommonJS | ⚠️ Migrate to ESM long-term |
| ORM | Sequelize 6 + PostgreSQL dialect | ✅ Appropriate for schema complexity |
| Validation | Joi (validators/) + express-validator (controllers) | ⚠️ Two validation libraries — consolidate to Joi |
| Auth | JWT HS256 + bcryptjs (12 rounds) | ✅ Correct |
| Queue | BullMQ 5 on Redis 7 | ✅ Production-grade |
| Logging | Winston (file rotation + console) | ✅ Good |
| Error handling | Centralized AppError class | ✅ Consistent |

### 3.2 Controller Analysis
| Controller | LOC | Concerns |
|-----------|-----|---------|
| authController.js | ~280 | Inline jwt require removed ✓; register uses transaction ✓ |
| invoiceController.js | ~340 | Counter uses atomic SQL ✓; create/update use transactions ✓ |
| employeeController.js | ~150 | processPayroll has conflictFields ✓ |
| dashboardController.js | ~90 | 9 parallel queries; Redis cache 5min ✓ |
| leaveController.js | ~280 | Embeds settings/users/audit/notifications — **should be split** |

### 3.3 Service Layer
| Service | Status | Issues |
|---------|--------|--------|
| payrollService.js | ✅ Complete | PF/ESI/PT/TDS correctly implemented |
| emailService.js | ✅ Complete | SMTP conditional; templates HTML-complete |
| PDF generation | ❌ **TODO STUB** | `generate_pdf` worker returns fake URL |
| Timesheet parsing | ❌ **TODO STUB** | `parse_timesheet` returns `{parsed:true}` only |

### 3.4 Multi-Tenant Isolation
- **Implementation:** Application-level `company_id` filter on every query ✅
- **Risk:** No PostgreSQL Row-Level Security (RLS) — a bug in any query can leak cross-tenant data
- **Missing:** No tenant isolation integration tests
- **IDOR Risk:** Employee/invoice IDs are globally unique UUIDs — but routes only filter by `company_id`
  which is correctly enforced in all controllers ✅

---

## 4. FRONTEND ARCHITECTURE

### 4.1 Stack Assessment
| Aspect | Implementation | Assessment |
|--------|---------------|------------|
| Framework | Next.js 14 App Router | ✅ |
| Output | Static export (`output: 'export'`) | ⚠️ No SSR/ISR; no dynamic routes |
| State | Zustand (persisted) + React Query v5 | ✅ |
| Forms | React Hook Form + Zod | ✅ |
| HTTP | Axios with auto-refresh interceptor | ✅ |
| Charts | Recharts | ✅ |
| UI | Tailwind + Radix UI + Lucide | ✅ |
| Error Boundaries | **MISSING** | ❌ Any render error crashes entire page |
| Accessibility | Partial (Radix handles dialogs) | ⚠️ |

### 4.2 Auth Flow
```
Login → Zustand (token in sessionStorage/localStorage) → Axios interceptor injects Bearer
         ↓
     401 received → POST /auth/refresh (cookie-based) → new token → retry
         ↓
     Refresh fails → clearToken → redirect /login
```
*Correct pattern. `isLoggedIn` now persisted to prevent flash redirect on refresh.* ✅

### 4.3 Missing Pages / Features
| Feature | Status |
|---------|--------|
| Leaves page | ✅ Added |
| Reports page | ✅ Exists (basic) |
| User management page | ⚠️ API exists, no dedicated UI page |
| Payslip PDF download | ❌ Missing |
| GSTR-1 download UI | ⚠️ API exists, no download button |
| Form 16 / Form 24Q | ❌ Not implemented |
| Billing / Subscription management | ❌ Not implemented |
| AI assistant | ❌ Not implemented |

---

## 5. DATABASE ARCHITECTURE

### 5.1 Schema Quality
- **Tables:** 26 (comprehensive for MVP)
- **UUID PKs:** All tables ✅ (prevents enumeration attacks)
- **Soft deletes:** Companies, Users, Employees, Clients, Invoices, Transactions ✅
- **Indexes:** 20 indexes covering primary query patterns ✅
- **Partitioning:** audit_logs by quarter (2026 Q1-Q4 + default) ✅
- **Triggers:** updated_at auto-update, invoice payment sync ✅

### 5.2 Schema Gaps
| Issue | Risk | Fix |
|-------|------|-----|
| No RLS policies | High | Add PG Row-Level Security as defense-in-depth |
| audit_log partitions only cover 2026 | Medium | Add 2027 partitions or auto-create |
| No migration versioning | Medium | Add db-migrate or flyway |
| companies.bank_account stored plaintext | High | Encrypt at application layer |
| No created_at index on transactions | Low | Add for date-range queries |
| payroll_records has no unique index in Sequelize model | Medium | Add for upsert reliability |

### 5.3 Connection Pool Analysis
```
Pool: min:2, max:20 connections
Statement timeout: 30s
Idle transaction timeout: 60s

Risk: 20 connections × (API + Worker) = 40 connections total
Supabase free tier: 20 connections MAX → will exhaust on dual-service deploy
Fix: Use PgBouncer or set max:8 per service for Supabase
```

---

## 6. INFRASTRUCTURE

### 6.1 Docker Architecture
| Service | Image | Concerns |
|---------|-------|---------|
| postgres | postgres:15-alpine | ✅ |
| redis | redis:7-alpine | ✅ |
| api | Custom (node:20-alpine, multi-stage) | ✅ |
| worker | Same image, different CMD | ✅ |
| nginx | nginx:1.25-alpine | ✅ |

**Missing:**
- No resource limits (cpu/memory) on any container
- No Docker Compose health-check → restart dependency chain
- No PgBouncer for connection pooling
- Single API replica (no horizontal scaling config)

### 6.2 Nginx Configuration
- TLS 1.2/1.3 with strong ciphers ✅
- HSTS preload ✅
- Rate limiting zones: global(60/min), auth(10/min), upload(20/hr) ✅
- Proxy cache for GET API responses ✅
- Security headers ✅
- **Missing:** Cloudflare real IP restoration (`set_real_ip_from`)
- **Missing:** `limit_req_zone` for API key tier-based throttling

---

## 7. INDIA COMPLIANCE ASSESSMENT

| Regulation | Implementation | Status |
|-----------|---------------|--------|
| GST CGST/SGST (intra-state) | calculateGST() | ✅ |
| GST IGST (inter-state) | calculateGST() | ✅ |
| PF EPF 3.67% + EPS 8.33% | calculatePayroll() | ✅ |
| ESI 0.75% emp / 3.25% employer | calculatePayroll() | ✅ |
| PT Karnataka ₹200 >₹15k | getPT() | ✅ |
| PT Maharashtra slabs | PT_SLABS | ✅ |
| TDS Sec 192 (simplified %) | calculatePayroll() | ⚠️ Simplified — no annual projection |
| GSTR-1 B2B/B2CS export | gstr1Export() | ✅ JSON format |
| Form 16 / Form 24Q | — | ❌ Not implemented |
| EPFO ECR file | — | ❌ Not implemented |
| ESIC Return | — | ❌ Not implemented |

---

## 8. QUEUE ARCHITECTURE

```
BullMQ Queues (Redis-backed):
├── invoice     (concurrency: 3)  — generate_pdf★, send_email, check_overdue, parse_timesheet★
├── email       (concurrency: 5)  — password_reset, welcome, invoice_sent, payslip, tds_due
├── notification(concurrency: 10) — create DB notification
└── payroll     (concurrency: 2)  — bulk_process

★ = stub/incomplete
```

**Missing:**
- No dead-letter queue (DLQ) monitoring
- No job retry alerting
- No queue dashboard (Bull Board)
- PDF generation is a stub (no puppeteer)

---

## 9. SUMMARY RISK TABLE

| Category | Severity | Count |
|----------|---------|-------|
| Hardcoded secrets in committed .env | 🔴 Critical | 1 |
| Zero test coverage | 🔴 Critical | 1 |
| Production stubs (PDF, timesheet) | 🔴 Critical | 2 |
| No PostgreSQL RLS | 🟠 High | 1 |
| nodemailer high vulnerability | 🟠 High | 1 |
| Redis KEYS O(N) blocking | 🟠 High | 1 |
| No env validation at startup | 🟠 High | 1 |
| No error boundaries (frontend) | 🟠 High | 1 |
| No DB connection limit for Supabase | 🟠 High | 1 |
| No CSRF protection | 🟡 Medium | 1 |
| leaveController god object | 🟡 Medium | 1 |
| Two validation libraries | 🟡 Medium | 1 |
| audit_log partitions expire 2027 | 🟡 Medium | 1 |
| No Bull Board monitoring | 🟡 Medium | 1 |
| emailService hardcodes company name | 🟡 Medium | 1 |
