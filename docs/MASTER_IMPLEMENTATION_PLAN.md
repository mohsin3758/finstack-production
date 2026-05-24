# MASTER IMPLEMENTATION PLAN — FinStack ERP v21
**Date:** 2026-05-22 | **Target Launch:** 6 weeks from now

---

## WEEK-BY-WEEK EXECUTION PLAN

### WEEK 1 — Security & Stability (Blockers)
**Goal:** Make the codebase safe to push to production with real data.

| Day | Task | Owner | Done? |
|-----|------|-------|-------|
| Mon | Remove .env from git history | DevOps | ⬜ |
| Mon | Generate production secrets (openssl rand -hex 32) | DevOps | ⬜ |
| Mon | ✅ Environment validation (validateEnv.js) | — | ✅ |
| Mon | ✅ CORS dev bypass removed | — | ✅ |
| Mon | ✅ Redis KEYS → SCAN | — | ✅ |
| Tue | ✅ Rate limit token refresh endpoint | — | ✅ |
| Tue | ✅ XSS sanitization middleware | — | ✅ |
| Tue | ✅ Aadhaar excluded from responses | — | ✅ |
| Tue | ✅ Subscription enforcement middleware | — | ✅ |
| Wed | ✅ Frontend ErrorBoundary | — | ✅ |
| Wed | nodemailer: npm audit fix | Dev | ⬜ |
| Thu | SSL certificate setup (Certbot/Cloudflare) | DevOps | ⬜ |
| Thu | Database backup cron job | DevOps | ⬜ |
| Fri | Sentry integration (backend + frontend) | Dev | ⬜ |
| Fri | Deploy to staging, smoke test | QA | ⬜ |

### WEEK 2 — Test Coverage (P1)
**Goal:** Reach 60% coverage on critical paths before any feature work.

| Day | Task | Owner |
|-----|------|-------|
| Mon-Tue | payrollService.test.js (all formulas, edge cases) | Dev |
| Tue | calculateGST tests (CGST/SGST/IGST, all rates) | Dev |
| Wed | auth.test.js (login, refresh, logout, lockout) | Dev |
| Wed | rbac.test.js (all 6 roles × all resources) | Dev |
| Thu | tenant isolation tests | Dev |
| Thu | invoice.test.js (create, pay, GST validation) | Dev |
| Fri | CI/CD: require coverage ≥60% to merge | DevOps |
| Fri | Wire Playwright for E2E login + invoice creation | Dev |

### WEEK 3 — PDF & Production Features
**Goal:** Fix production stubs; core features fully functional.

| Day | Task | Owner |
|-----|------|-------|
| Mon-Wed | Invoice PDF generation (puppeteer-core + HTML template) | Dev |
| Mon | Payslip PDF generation | Dev |
| Wed-Thu | Timesheet XLSX parsing (xlsx package) | Dev |
| Thu | Form 16 / 24Q generation (basic implementation) | Dev |
| Fri | User management UI page in frontend | Dev |
| Fri | GSTR-1 download button in Compliance page | Dev |

### WEEK 4 — Monitoring & Infrastructure
**Goal:** Full observability before customer traffic.

| Day | Task | Owner |
|-----|------|-------|
| Mon | BetterStack log ingestion | DevOps |
| Tue | Uptime Kuma monitors for all services | DevOps |
| Tue | Prometheus + Grafana (optional) | DevOps |
| Wed | Docker resource limits (cpu/memory) | DevOps |
| Wed | PgBouncer in docker-compose | DevOps |
| Thu | Load test with k6 (establish baselines) | QA |
| Thu | Database index audit (add missing indexes) | Dev |
| Fri | Audit log partition auto-creation for 2027 | Dev |

### WEEK 5 — SaaS Billing
**Goal:** Revenue infrastructure in place.

| Day | Task | Owner |
|-----|------|-------|
| Mon | Razorpay account setup + plan creation | Business |
| Mon-Tue | billingService.js (create sub, webhook handler) | Dev |
| Tue | billing database migration (subscription_plans etc.) | Dev |
| Wed | Webhook endpoint + signature verification | Dev |
| Wed | Feature gating middleware (employee/invoice limits) | Dev |
| Thu | Billing page in frontend | Dev |
| Fri | End-to-end billing flow test | QA |

### WEEK 6 — AI Assistant + Launch Prep
**Goal:** AI feature working; final go-live checklist.

| Day | Task | Owner |
|-----|------|-------|
| Mon-Tue | aiService.js (Claude integration with tools) | Dev |
| Tue | AI chat UI in frontend | Dev |
| Wed | Final security audit (penetration test basics) | Security |
| Wed | Data protection policy / Privacy policy page | Legal |
| Thu | Customer acceptance testing (UAT with AVIIN) | QA |
| Thu | DNS cutover plan | DevOps |
| Fri | 🚀 Production Go-Live | All |

---

## PRIORITY FIXES (Ranked by Business Risk)

### 🔴 Do This Today (Blockers)
1. **Clean git history** — `git filter-repo --path backend/.env --invert-paths`
2. **Rotate all secrets** — new JWT_SECRET, DB_PASSWORD, REDIS_PASSWORD
3. **SSL certificates** — deploy fails without them
4. **Sentry** — you need to see production errors immediately

### 🟠 Do This Week 1
5. **Database backups** — one server crash = permanent data loss
6. **nodemailer audit fix** — `npm update nodemailer`
7. **Resource limits in docker-compose** — prevent cascade failures
8. **Staging deployment** — test in production-like environment first

### 🟡 Do Week 2
9. **Test coverage ≥60%** — mandatory before launch
10. **PDF generation** — invoices can't be downloaded without it
11. **Subscription enforcement** — currently set but trial is never expired

---

## PRODUCTION READINESS SCORE

| Category | Before | After (This Plan) | Target |
|----------|--------|------------------|--------|
| Security | 45/100 | 80/100 | 90/100 |
| Testing | 0/100 | 0/100→70/100 | 75/100 |
| Features | 70/100 | 85/100 | 90/100 |
| Infrastructure | 60/100 | 80/100 | 85/100 |
| Observability | 10/100 | 75/100 | 80/100 |
| Compliance | 65/100 | 75/100 | 85/100 |
| Billing | 0/100 | 70/100 | 80/100 |
| **OVERALL** | **42/100** | **76/100** | **85/100** |

---

## GO-LIVE CHECKLIST

### Infrastructure
- [ ] All secrets rotated and stored in GitHub Secrets / Doppler
- [ ] backend/.env removed from git history
- [ ] SSL certificate valid and auto-renewing
- [ ] Database backup running and tested (restore tested!)
- [ ] All Docker containers have resource limits
- [ ] Staging environment deployed and tested
- [ ] Cloudflare WAF enabled

### Application
- [ ] `npm run build` passes with 0 errors (✅ Already)
- [ ] `npx tsc --noEmit` passes (✅ Already)
- [ ] Test coverage ≥ 60% on payroll, auth, RBAC
- [ ] PDF generation working
- [ ] Subscription enforcement tested
- [ ] Email delivery tested (send test invoice, payslip)

### Security
- [ ] Penetration test (basics: OWASP Top 10)
- [ ] All CRITICAL and HIGH vulnerabilities resolved
- [ ] Aadhaar handling documented and tested
- [ ] HTTPS enforced (HSTS headers)
- [ ] Rate limiting verified with load test

### Monitoring
- [ ] Sentry receiving errors from staging
- [ ] Uptime monitors alerting correctly
- [ ] Error budget / SLA defined (e.g., 99.5% uptime)
- [ ] On-call rotation defined

### Business
- [ ] Privacy policy published
- [ ] Terms of service published
- [ ] Customer onboarding flow tested end-to-end
- [ ] First customer (AVIIN) signed off
- [ ] Razorpay subscription live
- [ ] Support channel ready (email/Telegram)

---

## TECHNICAL DEBT PAYDOWN SCHEDULE

| Debt Item | Target Sprint | Complexity |
|-----------|-------------|-----------|
| 0% test coverage | Week 2 | High |
| PDF generation stub | Week 3 | Medium |
| leaveController god object | Week 4 | Low |
| Two validation libraries | Week 4 | Low |
| Backend TypeScript migration | Q3 2026 | High |
| PostgreSQL RLS | Week 4 | Medium |
| No migration versioning | Week 3 | Medium |
| CommonJS → ESM | Q4 2026 | Medium |
