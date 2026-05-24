# PRODUCTION GAP REPORT — FinStack ERP v21
**Date:** 2026-05-22 | **Type:** Go/No-Go Assessment

---

## VERDICT: ⛔ NOT PRODUCTION READY (14 blockers)

The platform has a solid foundation but cannot serve real paying customers until the following
gaps are resolved. Estimated time to production readiness: **3-4 weeks** with focused effort.

---

## BLOCKER GAPS (Must fix before launch)

### PG-001 🔴 — Zero Automated Test Coverage
- **Backend test files:** 0
- **Frontend test files:** 0
- **Risk:** Any refactor can silently break payroll calculations, GST logic, or auth
- **Impact:** Cannot safely deploy updates; cannot onboard enterprise customers
- **Fix:** Minimum 60% coverage on payroll/GST/auth before launch

### PG-002 🔴 — PDF Generation Not Implemented
**File:** `backend/src/jobs/worker.js`
```javascript
case 'generate_pdf': {
  // TODO: integrate puppeteer for real PDF generation
  const pdfUrl = `/uploads/invoices/${inv.inv_no.replace(...)}.pdf`;
  await inv.update({ pdf_url: pdfUrl });  // ← returns fake URL, no file created
```
- Invoice PDF download will 404
- Payslip PDF download not implemented anywhere
- **Fix:** Install `puppeteer-core` + `@sparticuz/chromium` for serverless; implement template

### PG-003 🔴 — Timesheet Parsing is a Stub
**File:** `backend/src/jobs/worker.js`
```javascript
case 'parse_timesheet': {
  logger.info(`[Invoice] Parsing timesheet: ${job.data.filename}`);
  return { parsed: true, filename: job.data.filename };  // ← does nothing
```
- Upload UI exists but processing produces no result
- **Fix:** Implement XLSX/CSV parsing with `xlsx` package

### PG-004 🔴 — Secrets in Git History
- `backend/.env` with production-equivalent secrets is committed
- See SR-001 for remediation steps

### PG-005 🔴 — No Environment Validation
- App starts with insecure JWT defaults silently
- **Fix:** Validate required env vars before `app.listen()` (implemented below)

### PG-006 🔴 — SSL Certificates Not Provisioned
- `nginx.conf` references `/etc/nginx/ssl/fullchain.pem` which doesn't exist
- Docker Compose will fail to start Nginx without these files
- **Fix:** Add Let's Encrypt Certbot container or document manual SSL setup

### PG-007 🔴 — No Database Backup Strategy
- PostgreSQL data in Docker volume `postgres_data` with no backup job
- A server crash = permanent data loss for all tenants
- **Fix:** Daily pg_dump to S3/GCS with 30-day retention

### PG-008 🔴 — No Error Monitoring
- No Sentry, Datadog, or equivalent
- Production errors are silent (logged to file, but no alerting)
- **Fix:** Add Sentry SDK to both backend and frontend

### PG-009 🔴 — Audit Log Partitions Expire in 2027
- `audit_logs_default` catches post-2026 records but loses quarterly partitioning
- Performance degrades as all 2027+ logs go to single default partition
- **Fix:** Add auto-partition creation (pg_partman or cron job)

### PG-010 🔴 — No Rate Limit on Token Refresh
- `POST /auth/refresh` has no `authLimiter` applied
- Enables brute-force and DoS on Redis
- **Fix:** One-line addition to routes/index.js

### PG-011 🟠 — Database Pool Exhaustion on Supabase
- Sequelize pool max:20 × 2 services = 40 connections
- Supabase free: 20, pro: 60 — will exhaust under modest load
- **Fix:** Add PgBouncer or reduce pool max to 8 per service

### PG-012 🟠 — No Container Resource Limits
- No `mem_limit`, `cpu_quota` in docker-compose.yml
- A memory leak in one container can starve all others on the host
- **Fix:** Add resource constraints for all services

### PG-013 🟠 — Email Footer Hardcodes "AVIIN JOBS SERVICES"
**File:** `backend/src/services/emailService.js`
```javascript
<p>© ${new Date().getFullYear()} AVIIN JOBS SERVICES. All rights reserved.</p>
```
- SaaS product must use company name from database, not hardcoded value
- **Fix:** Pass `companyName` from company record into email template

### PG-014 🟡 — No SaaS Billing Integration
- `subscription` field exists in companies table but is never validated/enforced
- No payment gateway (Razorpay/Stripe)
- No feature gating based on plan
- Trial period (`subscription_end`) is set but never checked against feature access
- **Fix:** Implement billing middleware (Phase 7)

---

## NON-BLOCKER GAPS (Fix in Sprint 1-2)

| ID | Gap | Priority |
|----|-----|---------|
| PG-015 | Form 16 / Form 24Q not implemented | P2 |
| PG-016 | EPFO ECR file generation missing | P2 |
| PG-017 | ESIC return generation missing | P2 |
| PG-018 | User management UI page missing | P2 |
| PG-019 | No Bull Board for queue monitoring | P2 |
| PG-020 | No frontend error boundaries | P2 |
| PG-021 | TDS calculation simplified (no annual projection) | P2 |
| PG-022 | No GSTR-2A reconciliation | P3 |
| PG-023 | No Cloudflare WAF integration | P2 |
| PG-024 | No multi-region deployment config | P3 |
| PG-025 | leaveController is a god object (settings/users/audit embedded) | P3 |

---

## WHAT IS WORKING CORRECTLY

| Component | Status |
|-----------|--------|
| Authentication (login/logout/refresh) | ✅ Production-ready |
| RBAC (6 roles, static matrix) | ✅ Production-ready |
| Invoice creation with GST (CGST/SGST/IGST) | ✅ Production-ready |
| Payroll engine (PF/ESI/PT/TDS) | ✅ Production-ready |
| Multi-tenant isolation (application-level) | ✅ Good (needs RLS) |
| Database schema (26 tables, proper indexes) | ✅ Production-ready |
| Redis caching (fail-safe after fix) | ✅ Production-ready |
| BullMQ job queues | ✅ Production-ready |
| Email templates | ✅ Production-ready |
| Audit logging | ✅ Production-ready |
| Docker + Nginx setup | ✅ Ready with SSL fix |
| CI/CD pipeline structure | ✅ Ready with secrets config |

---

## PRODUCTION READINESS SCORECARD

| Category | Score | Blocker |
|----------|-------|---------|
| Security | 45/100 | SR-001, SR-002 |
| Testing | 0/100 | PG-001 |
| Core Features | 70/100 | PG-002, PG-003 |
| Infrastructure | 60/100 | PG-006, PG-007, PG-012 |
| Observability | 10/100 | PG-008 |
| Compliance | 65/100 | PG-015 to PG-017 |
| **OVERALL** | **42/100** | **NOT READY** |
