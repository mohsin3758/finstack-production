# FinStack ERP — CHANGELOG

All notable changes to this project are documented in this file.
Format: [Version] — DD MMM YYYY

---

## [v21.0.0] — 17 May 2026 — Production Release

### 🏗 Architecture
- Multi-tenant SaaS ERP: single codebase serving multiple companies
- Static Next.js 14 frontend (output: export) → served by Nginx
- Express.js API on Node 20 + PostgreSQL 15 + Redis 7 + BullMQ workers
- Docker Compose full-stack with health checks and graceful shutdown

### ✅ Frontend (Next.js 14 + TypeScript + Tailwind)
- 14 pages: dashboard, invoices, employees, payroll, clients, accounts, compliance, reports, settings, leaves, login, register, home (redirect), 404
- 10 React Query hooks: useInvoices, useEmployees, useClients, usePayroll, useTransactions, useLeaves, useSettings, useUsers, useDashboard, useAuth
- Zustand auth store with persist + JWT token rehydration
- Complete invoice create modal with client picker, GST type selection, auto-fill
- Leave management page: apply, approve, reject with EL/CL/SL/ML/PL/CO/LWP types
- Notification bell with 2-minute polling in Topbar
- Sidebar with all nav links including Leaves
- Real-time P&L summary in Accounts page

### ✅ Backend (Express.js + Sequelize + PostgreSQL)
- 40+ REST endpoints across 10 controllers
- Static RBAC: 6 roles (super_admin, admin, billing_manager, hr_manager, accountant, viewer)
- JWT HS256 access token (8h) + refresh token (30d) with Redis blacklist
- India payroll engine: PF 12% (EPF 3.67% + EPS 8.33%), ESI 0.75%/3.25%, PT state slabs, TDS Sec 192
- GST engine: CGST+SGST (intra-state) and IGST (inter-state)
- BullMQ workers: invoice, email, payroll, notification queues
- Audit log with quarterly partitioned PostgreSQL table
- amountInWords() in Indian number system (Lakhs/Crores)

### 🔧 Bug Fixes (QA Pass)

#### Critical Fixes
- **[INV-001]** Invoice number race condition: `read then increment` → `atomic increment + reload`
- **[INV-002]** `New Invoice` button had no onClick handler — added full create modal
- **[AUTH-001]** Seed admin password hash was a non-working placeholder — regenerated correctly
- **[DB-001]** `schema.sql` had no transaction wrapper — partial schema on failure possible — fixed
- **[DB-002]** `seed.sql` had COMMIT without BEGIN — fixed
- **[DB-003]** CREATE EXTENSION inside transaction → moved before BEGIN for PG compatibility
- **[PAY-001]** `PayrollRecord.upsert` missing `conflictFields` → PostgreSQL ON CONFLICT error — fixed
- **[RBAC-001]** Routes used `rbac.require()` (non-existent); rbac.js exports `rbac.permit()` — aligned
- **[REDIS-001]** Cache helpers crashed app on Redis unavailability — wrapped in try-catch with null fallback
- **[DOCKER-001]** Nginx couldn't serve `/uploads/` — volume only mounted to API — added shared volume
- **[DOCKER-002]** `REDIS_PASSWORD` empty in backend/.env, mismatched docker Redis password — fixed
- **[DOCKER-003]** `.dockerignore` missing — secrets baked into Docker image — created

#### TypeScript Fixes
- **[TS-001]** 4 pages: two JSX sibling roots without Fragment wrapper → TSX compile error
- **[TS-002]** `Input.tsx` `prefix` prop conflicts with `HTMLInputElement.prefix` → `Omit<>`
- **[TS-003]** 5 hook param interfaces missing index signature → added `[key: string]: unknown`
- **[TS-004]** `Company` type missing `website` and `pincode` fields
- **[TS-005]** `LeaveForm.leave_type` typed as `string` not `LeaveType`
- **[TS-006]** ESLint config referenced `@typescript-eslint/` rules without plugin — removed
- **[TS-007]** Unescaped apostrophe in `login/page.tsx` → `&apos;`

#### Runtime Fixes
- **[RT-001]** `sequelize.sync({ alter: true })` in dev could silently drop columns — replaced with `force: false`
- **[RT-002]** `emailQueue.add()` in user invite blocking — made fire-and-forget
- **[RT-003]** `jsonwebtoken` inline required in authController → moved to top-level
- **[RT-004]** `dayjs` inline required in transactionController → moved to top-level
- **[RT-005]** Unused `dayjs` import in auth.js middleware — removed
- **[RT-006]** `typeof window` guards missing in `setToken`/`clearToken`
- **[RT-007]** `DashboardLayout` `fetchMe` in useEffect deps → potential re-render loop — fixed selectors
- **[RT-008]** `Topbar` notification bell never fetched data — added 2-min polling useEffect
- **[RT-009]** `<a href>` in Topbar causing hard page reload → replaced with Next.js `<Link>`

### 📦 Infrastructure
- `docker-compose.dev.yml` override for local development (no SSL, port 3001 exposed)
- `nginx.dev.conf` for HTTP-only local dev
- Root `.env` created for docker-compose variable resolution
- `backend/.dockerignore` to prevent secrets/node_modules in Docker image

---

## [v20.x] — Mar–Apr 2026 — Beta builds

- Initial SaaS architecture setup
- Basic invoice and payroll modules
- Single-file HTML prototype (FinStack_AVIIN_v21.html) — 205/205 tests pass

---

## [v1.0–v19.x] — Jan–Feb 2026 — Internal builds

- AVIIN JOBS SERVICES internal tooling
- GST invoice generator
- Basic payroll calculator
