# FinStack ERP v21 — AVIIN JOBS SERVICES

> India-first Enterprise SaaS: GST Invoicing · Payroll (PF/ESI/PT/TDS) · HRMS · Accounting · CFO Dashboard

---

## Quick Start (Docker)

```bash
# 1. Configure
cp backend/.env.example backend/.env      # edit secrets
cp frontend/.env.local.example frontend/.env.local

# 2. Build frontend
cd frontend && npm install && npm run build && cd ..

# 3. Start (dev mode — HTTP only, no SSL)
docker compose -f docker-compose.yml -f docker-compose.dev.yml up -d --build

# 4. Login at http://localhost
#    Email:    admin@aviinjobs.com
#    Password: Admin@2026
```

> Full documentation: see README.md sections below ↓

---

## What This Is

FinStack is a production-ready, multi-tenant SaaS ERP for Indian businesses:

- **GST Invoicing** — CGST/SGST (intra) + IGST (inter), GSTR-1 export
- **Payroll Engine** — PF 12%, ESI 0.75%/3.25%, PT state slabs, TDS Sec 192
- **HRMS** — Leave management (EL/CL/SL/ML/PL/CO/LWP), Employee lifecycle
- **Accounting** — Income/Expense ledger, P&L
- **CFO Dashboard** — KPIs, revenue trends, overdue invoices

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | Next.js 14, TypeScript, Tailwind CSS, Zustand, React Query |
| Backend | Node.js 20, Express.js, Sequelize ORM |
| Database | PostgreSQL 15 |
| Cache/Queue | Redis 7, BullMQ |
| Proxy | Nginx 1.25 |
| Containers | Docker + Docker Compose |

---

## Local Dev (Without Docker)

```bash
# Backend
cd backend
npm install
cp .env.example .env              # edit: DB_HOST=localhost, REDIS_HOST=localhost
node src/utils/migrate.js         # apply schema.sql
node src/utils/seed.js            # insert AVIIN demo data
npm run dev                       # API on :3001
npm run worker                    # BullMQ workers (separate terminal)

# Frontend
cd frontend
npm install
cp .env.local.example .env.local  # NEXT_PUBLIC_API_URL=http://localhost:3001/api/v1
npm run dev                       # Dev server on :3000
```

---

## India Payroll Formulas

| Component | Employee | Employer | Ceiling |
|-----------|----------|----------|---------|
| PF | 12% of basic | 12% (EPF 3.67% + EPS 8.33%) | ₹15,000 basic |
| ESI | 0.75% of gross | 3.25% of gross | Gross ≤ ₹21,000 |
| PT (Karnataka) | ₹200/month | — | Gross > ₹15,000 |
| TDS | Configured % per employee | — | Gross salary |

---

## Roles

| Role | Access Level |
|------|-------------|
| super_admin | All companies |
| admin | Full company access |
| billing_manager | Invoices, clients |
| hr_manager | Employees, payroll, leaves |
| accountant | Accounts, reports |
| viewer | Read-only |

---

## Demo Data

Login: `admin@aviinjobs.com` / `Admin@2026`

Clients: NeoSoft, Invenio, Embital  
Employees: Rajesh Kumar, Priya Sharma, Amit Patel  
Invoice: INV-345 for ₹1,65,200 (NeoSoft, May 2026)

---

## Production Deployment Checklist

```bash
# 1. Generate strong secrets
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"

# 2. Edit backend/.env — set:
#    JWT_SECRET, JWT_REFRESH_SECRET, DB_PASSWORD, REDIS_PASSWORD, SMTP_*

# 3. Get SSL certificate
certbot certonly --standalone -d finstack.yourdomain.com
cp /etc/letsencrypt/live/finstack.yourdomain.com/{fullchain,privkey}.pem nginx/ssl/

# 4. Build and deploy
cd frontend && npm run build && cd ..
docker compose up -d --build

# 5. Schema auto-applies via Docker entrypoint (schema.sql + seed.sql)
# 6. Change admin password immediately after first login
```

---

## Troubleshooting

**401 on every API call** → Check `NEXT_PUBLIC_API_URL` in `frontend/.env.local`  
**DB connection refused** → Check `DB_HOST=postgres` (Docker) or `localhost` (local)  
**Redis errors in logs** → Non-fatal. App runs without Redis. Check password match.  
**Blank page** → Rebuild frontend: `cd frontend && npm run build`  

---

## Files Reference

| File | Purpose |
|------|---------|
| `backend/.env` | Secrets (never commit) |
| `database/schema.sql` | PostgreSQL schema |
| `database/seed.sql` | AVIIN demo data |
| `nginx/nginx.conf` | Production (SSL) |
| `nginx/nginx.dev.conf` | Dev (HTTP only) |
| `docker-compose.dev.yml` | Dev overrides |

---

*FinStack ERP v21.0.0 — AVIIN JOBS SERVICES — https://www.aviinjobs.com*
