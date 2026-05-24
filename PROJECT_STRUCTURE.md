# FinStack ERP — Project Structure

```
finstack/                              ← Root (docker-compose lives here)
├── .env                               ← Docker Compose variables (DB/Redis passwords)
├── .gitignore                         ← Git exclusions (node_modules, .env, out/)
├── docker-compose.yml                 ← Full production stack
├── docker-compose.dev.yml             ← Dev overrides (no SSL, port 3001 exposed)
├── CHANGELOG.md                       ← Version history
├── TASKS.md                           ← Backlog and deployment checklist
├── PROJECT_STRUCTURE.md               ← This file
├── README.md                          ← Setup guide
│
├── database/
│   ├── schema.sql                     ← Full PostgreSQL schema (run once via migrate.js)
│   └── seed.sql                       ← AVIIN demo data (admin@aviinjobs.com / Admin@2026)
│
├── nginx/
│   ├── nginx.conf                     ← Production config (SSL + rate limit + proxy cache)
│   ├── nginx.dev.conf                 ← Dev config (HTTP only, no SSL)
│   └── proxy_params                   ← Shared proxy header config
│
├── backend/                           ← Node.js Express API
│   ├── .env                           ← Local dev secrets (NOT committed to git)
│   ├── .env.example                   ← Template — copy to .env
│   ├── .dockerignore                  ← Prevents secrets/node_modules in Docker image
│   ├── Dockerfile                     ← Multi-stage: deps → production
│   ├── app.js                         ← Express entry point, graceful shutdown
│   ├── package.json
│   │
│   └── src/
│       ├── config/
│       │   ├── database.js            ← Sequelize + PostgreSQL pool (max 20)
│       │   └── redis.js               ← ioredis client + fail-safe cache helpers
│       │
│       ├── models/
│       │   └── index.js               ← All 11 Sequelize models + associations
│       │                                (Company, User, Employee, Client, Invoice,
│       │                                 InvoiceItem, PayrollRecord, Transaction,
│       │                                 LeaveRequest, AuditLog, Notification)
│       │
│       ├── middlewares/
│       │   ├── auth.js                ← JWT authenticate, token blacklist, bcrypt helpers
│       │   ├── rbac.js                ← permit(resource,action) + requireRank(role)
│       │   ├── errorHandler.js        ← AppError class, global handler, auditLog middleware
│       │   └── rateLimiter.js         ← global (200/15min), auth (10/15min), heavy (10/min)
│       │
│       ├── controllers/
│       │   ├── authController.js      ← register, login, refresh, logout, me, forgot/reset pw
│       │   ├── dashboardController.js ← CFO summary: 9 KPIs + monthly trend (Redis cached 5min)
│       │   ├── invoiceController.js   ← CRUD + GST calc + payment + hold/release + WhatsApp + GSTR-1
│       │   ├── employeeController.js  ← CRUD + payroll process + history + bank CSV export
│       │   ├── clientController.js    ← CRUD with GSTIN dedup check
│       │   ├── transactionController.js ← CRUD + P&L summary
│       │   ├── leaveController.js     ← Apply / approve / reject leave requests
│       │   ├── settingsController.js  ← Company profile get/update
│       │   ├── usersController.js     ← Team invite / update / remove (admin+)
│       │   ├── auditController.js     ← Read audit log (admin+)
│       │   ├── notificationController.js ← List / markRead / markAllRead
│       │   └── uploadController.js    ← multer file upload + timesheet queue trigger
│       │
│       ├── services/
│       │   ├── payrollService.js      ← India payroll: PF/ESI/PT/TDS + GST calc + amountInWords
│       │   └── emailService.js        ← nodemailer pool + 5 HTML templates
│       │
│       ├── validators/
│       │   ├── employeeValidator.js   ← Joi schema: employee create + payroll process
│       │   └── invoiceValidator.js    ← Joi schema: create + update + payment + hold
│       │
│       ├── routes/
│       │   └── index.js               ← All 40+ routes with RBAC + audit middleware
│       │
│       ├── jobs/
│       │   ├── queues.js              ← BullMQ queue definitions (invoice/email/payroll/notification)
│       │   └── worker.js              ← 4 workers: invoice·3 / email·5 / notification·10 / payroll·2
│       │
│       └── utils/
│           ├── logger.js              ← Winston: console + rotating file logs
│           ├── migrate.js             ← Runs schema.sql via pg.Client (node src/utils/migrate.js)
│           └── seed.js                ← Inserts AVIIN demo data (node src/utils/seed.js)
│
└── frontend/                          ← Next.js 14 + TypeScript + Tailwind
    ├── .env.local.example             ← Template — copy to .env.local
    ├── .eslintrc.json                 ← next/core-web-vitals rules
    ├── next.config.js                 ← output: export, NEXT_PUBLIC_API_URL
    ├── tailwind.config.ts             ← Brand colors, Inter font
    ├── tsconfig.json                  ← Path aliases @/* → ./src/*
    ├── postcss.config.js
    ├── package.json
    │
    └── src/
        ├── types/
        │   └── index.ts               ← All TypeScript types + enums (Company, User, Invoice…)
        │
        ├── lib/
        │   ├── api.ts                 ← Axios instance + 401 interceptor + refresh logic
        │   └── utils.ts               ← fmtCurrency, fmtDate, statusColor, getInitials…
        │
        ├── services/
        │   └── api.ts                 ← Typed API functions for every endpoint
        │
        ├── store/
        │   ├── authStore.ts           ← Zustand: login/logout/fetchMe + localStorage persist
        │   └── appStore.ts            ← Zustand: sidebar, notifications, unreadCount
        │
        ├── hooks/
        │   ├── useAuth.ts             ← handleLogin / handleRegister / handleLogout
        │   ├── useDashboard.ts        ← useQuery with 5-min auto-refresh
        │   ├── useInvoices.ts         ← CRUD + payment + hold + release + WhatsApp
        │   ├── useEmployees.ts        ← CRUD + processPayroll + payrollHistory
        │   ├── useClients.ts          ← CRUD
        │   ├── usePayroll.ts          ← useProcessPayroll + useExportBankFile + usePayrollHistory
        │   ├── useTransactions.ts     ← CRUD + useProfitLoss
        │   ├── useLeaves.ts           ← list + create + approve + reject
        │   ├── useSettings.ts         ← get + update company settings
        │   └── useUsers.ts            ← list + invite + update + remove
        │
        ├── components/
        │   ├── layout/
        │   │   ├── DashboardLayout.tsx ← Auth guard + sidebar + topbar wrapper
        │   │   ├── Sidebar.tsx         ← Collapsible nav: Dashboard/HR/Finance/Admin groups
        │   │   └── Topbar.tsx          ← Page title + notification bell (polling) + profile
        │   │
        │   ├── ui/
        │   │   ├── Button.tsx          ← Button (5 variants), Spinner, Badge, StatusBadge, Card, Empty
        │   │   ├── Input.tsx           ← Input, Select, Textarea, SearchInput
        │   │   ├── Modal.tsx           ← Accessible modal + ConfirmDialog
        │   │   ├── Table.tsx           ← Sortable + paginated + selectable data table
        │   │   ├── Badge.tsx           ← Re-exports from Button.tsx
        │   │   ├── Card.tsx            ← Re-exports from Button.tsx
        │   │   └── Spinner.tsx         ← Re-exports from Button.tsx
        │   │
        │   └── charts/
        │       ├── StatsCard.tsx       ← KPI card with trend indicator
        │       └── RevenueChart.tsx    ← Recharts AreaChart + BarChart with custom tooltip
        │
        └── app/                        ← Next.js App Router pages
            ├── globals.css             ← Tailwind base + custom: input-base, kpi-card, table-auto
            ├── layout.tsx              ← Root server layout (no 'use client')
            ├── providers.tsx           ← Client: QueryClientProvider + Toaster
            ├── page.tsx                ← Redirect: isLoggedIn → /dashboard else /login
            ├── login/page.tsx          ← Login form (email/password, remember me)
            ├── register/page.tsx       ← Registration (company + admin user)
            ├── dashboard/              ← CFO Dashboard: 9 KPIs, revenue chart, overdue list
            ├── invoices/               ← Invoice list + create + pay + hold + GSTR-1 export
            ├── employees/              ← Employee CRUD + payroll history tab
            ├── payroll/                ← Monthly payroll: present days → process → bank CSV
            ├── clients/                ← Client CRUD with GSTIN/supply type/payment terms
            ├── accounts/               ← Transactions ledger + P&L summary
            ├── compliance/             ← GSTR-1 B2B/B2CS export + TDS reminder
            ├── leaves/                 ← Leave apply/approve/reject (EL/CL/SL/ML/PL/CO/LWP)
            ├── reports/                ← Reports placeholder (v22 scope)
            └── settings/               ← Company profile: GSTIN/bank/invoice prefix
```

## Key Architecture Decisions

| Decision | Choice | Reason |
|----------|--------|--------|
| Frontend rendering | Static Export | Works offline, deployable on Nginx/CDN |
| State management | Zustand + React Query | Zustand for auth/UI, RQ for server state |
| ORM | Sequelize v6 | Battle-tested, good Postgres support |
| Cache | Redis + fail-safe fallback | App runs even if Redis is down |
| Auth | JWT HS256 + refresh | Stateless, scalable |
| RBAC | Static in-memory matrix | Zero DB queries per request |
| Payroll | Custom JS engine | India-specific PF/ESI/PT/TDS formulas |
| Queues | BullMQ v5 | Modern, Redis-backed, TypeScript-ready |
| Audit | Partitioned table | Quarterly partitions for query performance |
