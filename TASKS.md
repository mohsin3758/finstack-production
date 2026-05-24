# FinStack ERP — TASKS.md

## ✅ COMPLETED (v21.0.0)

### Backend
- [x] Express.js API with 40+ endpoints
- [x] PostgreSQL schema with partitioned audit logs
- [x] Sequelize ORM models + associations (11 models)
- [x] JWT auth: access + refresh tokens, blacklist, account lock
- [x] RBAC: 6 roles, static permission matrix
- [x] India payroll engine: PF / ESI / PT / TDS Sec 192
- [x] GST engine: CGST+SGST (intra) + IGST (inter)
- [x] Invoice auto-numbering (atomic, race-condition safe)
- [x] BullMQ job queues: invoice / email / payroll / notification workers
- [x] Redis cache with fail-safe helpers
- [x] Audit log (quarterly partitioned)
- [x] File upload (multer, 25MB limit, MIME whitelist)
- [x] Email service (nodemailer, 5 templates)
- [x] migrate.js + seed.js utilities
- [x] Graceful shutdown (SIGTERM / SIGINT)

### Frontend
- [x] 14 pages (all routes building clean, static export)
- [x] TypeScript: 0 errors
- [x] 10 React Query hooks
- [x] Zustand auth store with token persistence
- [x] Invoice CRUD with GST create modal
- [x] Payment recording modal
- [x] Employee CRUD with payroll processing
- [x] Leave management (apply / approve / reject)
- [x] Client management
- [x] Accounts & P&L ledger
- [x] Compliance / GSTR-1 export
- [x] Settings (company profile)
- [x] Notification bell with polling
- [x] CFO Dashboard with KPIs + revenue chart

### Infrastructure
- [x] Docker Compose (postgres + redis + api + worker + nginx)
- [x] docker-compose.dev.yml override
- [x] Nginx production config (SSL, rate limiting, caching)
- [x] Nginx dev config (HTTP only)
- [x] GitHub Actions CI/CD (test → security scan → build → deploy)
- [x] .dockerignore
- [x] Environment templates (.env.example, .env.local.example)

---

## 🔄 IN PROGRESS

- [ ] Invoice line-item editor UI (add/edit/remove individual consultant rows in invoice)
- [ ] PDF generation (jsPDF in BullMQ worker — placeholder exists)
- [ ] GSTR-1 JSON download button wired to compliance/page.tsx

---

## 📋 NEXT SPRINT (v22)

### High Priority
- [ ] **Invoice PDF** — generate and email PDF via BullMQ `generate_pdf` job
- [ ] **Smart Payroll / Contractor billing UI** — `contractor_masters` table exists but no UI
- [ ] **Form 16 / Form 24Q** — payroll compliance forms
- [ ] **Attendance module** — mark attendance, auto-calculate present_days for payroll
- [ ] **GSTR-1 JSON download** — wire the export button on compliance page

### Medium Priority
- [ ] **Forgot password flow** — email with reset link (backend done, UI page missing)
- [ ] **User management page** — invite/manage team members (settings > team tab)
- [ ] **Payslip PDF** — per-employee payslip generation
- [ ] **UAN/PF portal export** — ECR file format for EPFO upload
- [ ] **ESI challan** — ESIC contribution report

### Low Priority / Nice to Have
- [ ] **Dark mode** — Tailwind `dark:` classes
- [ ] **PWA** — service worker + offline support
- [ ] **WhatsApp Business API** — replace wa.me link with API call
- [ ] **Tally XML export** — for accountants using Tally
- [ ] **Multi-currency** — USD billing for overseas clients
- [ ] **AI CFO insights** — Claude API integration for spend analysis

---

## 🐛 KNOWN LIMITATIONS (v21)

| # | Area | Limitation | Workaround |
|---|------|------------|------------|
| 1 | Invoice | Line items added via API only, no UI editor yet | Use API or future v22 line-item UI |
| 2 | PDF | Invoice PDF generation is queued but worker needs puppeteer setup | Install puppeteer in Docker image |
| 3 | Attendance | No UI — attendance.table exists in DB only | Mark via leave management proxy |
| 4 | Reports | Page is placeholder — no charts wired | Add recharts in v22 |
| 5 | SSL | Production nginx requires manual cert setup | Use nginx.dev.conf for local dev |

---

## 🧪 TEST COVERAGE

| Area | Status | Coverage |
|------|--------|----------|
| Payroll calculations | ✅ | Manual verified (PF/ESI/PT formulas) |
| GST calculations | ✅ | Manual verified (CGST/SGST/IGST) |
| Auth flow | ✅ | E2E manual test (login/logout/refresh) |
| API integration | ⏳ | Jest + Supertest scaffolded, no tests written |
| Frontend E2E | ⏳ | Not started (Playwright recommended) |

---

## 🏗 DEPLOYMENT CHECKLIST

- [ ] Change all secrets in `backend/.env` (JWT_SECRET, DB_PASSWORD, REDIS_PASSWORD)
- [ ] Get SSL certificates (Let's Encrypt recommended: `certbot --nginx`)
- [ ] Update `FRONTEND_URL` in backend/.env
- [ ] Update `NEXT_PUBLIC_API_URL` in frontend/.env.local
- [ ] Set `SMTP_USER` and `SMTP_PASS` for email
- [ ] Run `docker compose -f docker-compose.yml up -d --build`
- [ ] Schema auto-applies via Docker entrypoint (schema.sql + seed.sql)
- [ ] Login: `admin@aviinjobs.com` / `Admin@2026`
- [ ] Change admin password immediately after first login
