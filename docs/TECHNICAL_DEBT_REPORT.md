# TECHNICAL DEBT REPORT — FinStack ERP v21
**Date:** 2026-05-22 | **Framework:** SQALE (Maintainability Index)

---

## DEBT SUMMARY

| Category | Severity | Estimated Fix Time |
|----------|---------|-------------------|
| Testing (0% coverage) | 🔴 Critical | 3 weeks |
| Production stubs | 🔴 Critical | 1 week |
| leaveController god object | 🟠 High | 2 days |
| Two validation libraries | 🟡 Medium | 1 day |
| CommonJS → ESM | 🟡 Medium | 1 week |
| Missing TypeScript on backend | 🟡 Medium | 2 weeks |
| Duplicate DB client (pg + Sequelize) | 🟡 Medium | 1 day |
| No migration versioning | 🟡 Medium | 2 days |
| Worker embeds business logic | 🟡 Medium | 2 days |
| Frontend has no error boundaries | 🟡 Medium | 1 day |
| **Total estimated effort** | | **~6-7 weeks** |

---

## TD-001 🔴 — Zero Test Coverage (Most Critical Debt)

**Impact:** Cannot refactor safely; payroll bugs go undetected; compliance failures possible.

```
Backend:
  - No unit tests for payrollService.js (PF/ESI/PT calculations)
  - No unit tests for calculateGST() (CGST/SGST/IGST logic)
  - No integration tests for any API endpoint
  - No auth tests (token expiry, refresh, blacklist)
  - No RBAC tests (role boundary violations)
  - No multi-tenant isolation tests

Frontend:
  - No component tests
  - No E2E tests (Playwright)
  - No visual regression tests
```

**Minimum viable test plan:**
```
Priority 1 (Before launch):
  ✓ payrollService.test.js — all calculation branches
  ✓ gst.test.js — CGST/SGST/IGST for each supply type
  ✓ auth.test.js — login, token refresh, logout, lockout
  ✓ rbac.test.js — each role's boundaries
  ✓ tenant.test.js — cross-tenant data isolation

Priority 2 (Sprint 1):
  ✓ invoice.test.js — create, update, payment recording
  ✓ employee.test.js — create, payroll process
  ✓ E2E: login → create invoice → record payment
```

---

## TD-002 🔴 — Production Stubs (Broken Features)

### PDF Generation
```javascript
// backend/src/jobs/worker.js — STUB
case 'generate_pdf': {
  const pdfUrl = `/uploads/invoices/FAKE_URL.pdf`;  // File never created
  await inv.update({ pdf_url: pdfUrl });
```

**Fix:** Install `puppeteer-core` + HTML invoice template → PDF

### Timesheet Parsing
```javascript
// backend/src/jobs/worker.js — STUB
case 'parse_timesheet': {
  return { parsed: true, filename: job.data.filename };  // Does nothing
```

**Fix:** Implement XLSX parsing with `xlsx` package

---

## TD-003 🟠 — leaveController God Object

**File:** `backend/src/controllers/leaveController.js` (280+ lines)

This single file exports: `leave`, `settings`, `users`, `audit`, `notifications`, `uploadCtrl`  
It's a dumping ground that violates Single Responsibility Principle.

**Refactor plan:**
```
src/controllers/
├── leaveController.js       ← Only leave CRUD
├── settingsController.js    ← Company settings (standalone) ✓ already exists
├── usersController.js       ← User management ✓ already exists
├── auditController.js       ← Audit log reading ✓ already exists
├── notificationController.js← Notifications ✓ already exists
└── uploadController.js      ← File uploads ✓ already exists

Action: Split leaveController.js to only contain leave logic.
Crypto import at bottom of file (after module.exports) is also a bug risk.
```

---

## TD-004 🟡 — Two Validation Libraries (Joi + express-validator)

**authController.js** uses `express-validator`:
```javascript
const { body, validationResult } = require('express-validator');
body('email').trim().normalizeEmail().isEmail()
```

**employeeController.js** and **invoiceController.js** use `Joi`:
```javascript
const { employeeSchema } = require('../validators/employeeValidator');
```

**Fix:** Standardize on Joi throughout. Remove express-validator dependency.  
**Effort:** 1 day to migrate auth validation to Joi.

---

## TD-005 🟡 — CommonJS Throughout (No ESM)

All backend files use `require()` / `module.exports`. Node.js 20 supports native ESM.

**Risk:** As the ecosystem migrates to ESM-only packages (e.g., `file-type`, `got`, newer 
chalk), CommonJS interop will become increasingly painful.

**Fix:** Migrate incrementally:
1. Add `"type": "module"` to package.json
2. Rename `.js` → `.mjs` or use conditional exports
3. Replace `require()` → `import`
**Effort:** 1 week (low priority, no functional impact)

---

## TD-006 🟡 — Backend Has No TypeScript

Frontend has full TypeScript. Backend uses plain JavaScript.

**Risk:** Type errors in payroll calculations, GST logic, or API responses go undetected at 
compile time and only surface as runtime bugs in production (with customer data).

**Fix:** Add `@types/node`, `@types/express`, `ts-node`, `typescript` to backend devDeps.  
Migrate incrementally controller by controller.  
**Effort:** 2 weeks

---

## TD-007 🟡 — Two PostgreSQL Clients in Backend

`backend/src/config/database.js` uses **Sequelize** (via `pg` driver).  
`backend/src/utils/migrate.js` and `seed.js` use **raw `pg.Client`**.

This means two different connection mechanisms, two different error paths.

**Fix:** Migrate `migrate.js` and `seed.js` to use Sequelize's `sequelize.query()` directly.

---

## TD-008 🟡 — No Database Migration Versioning

Schema changes are managed by a single `schema.sql` that is run on fresh DB init.

**Problem:** If schema needs to change on a live database (add column, add index), there is 
no mechanism to apply incremental changes. The only option is full drop-and-recreate.

**Fix:** Add `db-migrate` or `node-pg-migrate`:
```
database/migrations/
├── 20260522000001_initial_schema.sql
├── 20260522000002_add_subscription_features.sql
└── 20260523000001_add_rls_policies.sql
```

---

## TD-009 🟡 — Business Logic in Queue Workers

**File:** `backend/src/jobs/worker.js`

The `payrollWorker` directly calls `calculatePayroll()` and `PayrollRecord.upsert()`.  
The `invoiceWorker` directly does `Invoice.update()`.

**Fix:** Workers should call service-layer functions, not implement logic:
```javascript
// Instead of:
const calc = calculatePayroll(emp.toJSON(), { present_days: 26 });
await PayrollRecord.upsert({ ...calc });

// Workers should call:
await PayrollService.processEmployee(emp.id, { month, year, present_days: 26 });
```

---

## TD-010 🟡 — No Frontend Error Boundaries

Any JavaScript error in a React component causes the entire page to become a blank white 
screen with no user feedback.

**Fix:** Add React Error Boundary components:
```typescript
// src/components/ErrorBoundary.tsx
class ErrorBoundary extends React.Component {
  state = { hasError: false, error: null };
  static getDerivedStateFromError(error) { return { hasError: true, error }; }
  render() {
    if (this.state.hasError) return <ErrorFallback error={this.state.error} />;
    return this.props.children;
  }
}
```
