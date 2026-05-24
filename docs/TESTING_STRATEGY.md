# TESTING STRATEGY — FinStack ERP v21
**Date:** 2026-05-22 | **Current Coverage:** 0% → **Target:** 75%

---

## TESTING STACK

| Layer | Tool | Purpose |
|-------|------|---------|
| Backend unit | Jest + Supertest | API integration, service unit tests |
| Payroll | Jest | Formula correctness, edge cases |
| RBAC | Jest + Supertest | Role boundary violations |
| E2E | Playwright | Full user flows |
| Load | k6 | Performance baselines |

---

## BACKEND TEST SETUP

```bash
cd backend
npm install --save-dev jest supertest @jest/globals
```

```json
// backend/package.json — add/update:
{
  "scripts": {
    "test":       "jest --forceExit --detectOpenHandles",
    "test:watch": "jest --watch",
    "test:coverage": "jest --coverage --forceExit"
  },
  "jest": {
    "testEnvironment": "node",
    "coverageDirectory": "coverage",
    "collectCoverageFrom": ["src/**/*.js", "!src/jobs/worker.js"],
    "coverageThreshold": {
      "global": { "branches": 60, "functions": 70, "lines": 70 }
    },
    "testTimeout": 30000,
    "setupFiles": ["./src/tests/setup.js"]
  }
}
```

---

## TEST FILE 1 — Payroll Engine (Priority: CRITICAL)

```javascript
// backend/src/tests/payrollService.test.js
const { calculatePayroll, calculateGST, amountInWords } = require('../services/payrollService');

describe('India Payroll Engine', () => {
  // ── PF Tests ─────────────────────────────────────────────────
  describe('Provident Fund (PF)', () => {
    test('PF employee = 12% of basic (capped at ₹15,000)', () => {
      const emp = { basic: 20000, pf_enrolled: 1, esi_enrolled: 0, pt_enrolled: 0, state: 'Karnataka' };
      const result = calculatePayroll(emp, { present_days: 26, working_days: 26 });
      // PF = 12% of min(20000, 15000) = 12% of 15000 = 1800
      expect(result.pf_employee).toBe(1800);
      expect(result.pf_employer).toBe(1800);
    });

    test('PF is zero when pf_enrolled = 0', () => {
      const emp = { basic: 30000, pf_enrolled: 0, esi_enrolled: 0, pt_enrolled: 0, state: 'Karnataka' };
      const result = calculatePayroll(emp, { present_days: 26, working_days: 26 });
      expect(result.pf_employee).toBe(0);
      expect(result.pf_employer).toBe(0);
    });

    test('EPF + EPS = total employer PF', () => {
      const emp = { basic: 15000, pf_enrolled: 1, esi_enrolled: 0, pt_enrolled: 0, state: 'Karnataka' };
      const result = calculatePayroll(emp, { present_days: 26, working_days: 26 });
      // EPF = 3.67% of 15000 = 550.5 ≈ 551
      // EPS = 8.33% of 15000 = 1249.5 ≈ 1250
      expect(result.epf_employer + result.eps_employer).toBe(result.pf_employer);
    });
  });

  // ── ESI Tests ────────────────────────────────────────────────
  describe('Employee State Insurance (ESI)', () => {
    test('ESI applicable when gross ≤ ₹21,000', () => {
      const emp = { basic: 12000, hra: 4800, pf_enrolled: 0, esi_enrolled: 1, pt_enrolled: 0, state: 'Karnataka' };
      const result = calculatePayroll(emp, { present_days: 26, working_days: 26 });
      // gross = 16800; ESI emp = 0.75% of 16800 = 126; employer = 3.25% of 16800 = 546
      expect(result.esi_employee).toBe(126);
      expect(result.esi_employer).toBe(546);
    });

    test('ESI NOT applicable when gross > ₹21,000', () => {
      const emp = { basic: 20000, hra: 5000, pf_enrolled: 0, esi_enrolled: 1, pt_enrolled: 0, state: 'Karnataka' };
      const result = calculatePayroll(emp, { present_days: 26, working_days: 26 });
      expect(result.esi_employee).toBe(0);
      expect(result.esi_employer).toBe(0);
    });
  });

  // ── PT Tests ─────────────────────────────────────────────────
  describe('Professional Tax (PT)', () => {
    test('Karnataka PT = ₹200 when gross > ₹15,000', () => {
      const emp = { basic: 20000, pf_enrolled: 0, esi_enrolled: 0, pt_enrolled: 1, state: 'Karnataka' };
      const result = calculatePayroll(emp, { present_days: 26, working_days: 26 });
      expect(result.pt).toBe(200);
    });

    test('Karnataka PT = ₹0 when gross ≤ ₹15,000', () => {
      const emp = { basic: 10000, hra: 4000, pf_enrolled: 0, esi_enrolled: 0, pt_enrolled: 1, state: 'Karnataka' };
      const result = calculatePayroll(emp, { present_days: 26, working_days: 26 });
      expect(result.pt).toBe(0);
    });

    test('Maharashtra PT slabs correct', () => {
      const emp1 = { basic: 6000, pf_enrolled: 0, esi_enrolled: 0, pt_enrolled: 1, state: 'Maharashtra' };
      const emp2 = { basic: 8000, pf_enrolled: 0, esi_enrolled: 0, pt_enrolled: 1, state: 'Maharashtra' };
      const emp3 = { basic: 12000, pf_enrolled: 0, esi_enrolled: 0, pt_enrolled: 1, state: 'Maharashtra' };
      expect(calculatePayroll(emp1, { present_days: 26, working_days: 26 }).pt).toBe(0);
      expect(calculatePayroll(emp2, { present_days: 26, working_days: 26 }).pt).toBe(175);
      expect(calculatePayroll(emp3, { present_days: 26, working_days: 26 }).pt).toBe(200);
    });
  });

  // ── Proration Tests ──────────────────────────────────────────
  describe('Attendance Proration', () => {
    test('50% present = 50% gross', () => {
      const emp = { basic: 20000, pf_enrolled: 0, esi_enrolled: 0, pt_enrolled: 0, state: 'Karnataka' };
      const result = calculatePayroll(emp, { present_days: 13, working_days: 26 });
      expect(result.basic_earned).toBe(10000);
    });

    test('net_pay is never negative', () => {
      const emp = { basic: 5000, pf_enrolled: 1, esi_enrolled: 1, pt_enrolled: 1, tds_rate: 30, state: 'Karnataka' };
      const result = calculatePayroll(emp, { present_days: 5, working_days: 26 });
      expect(result.net_pay).toBeGreaterThanOrEqual(0);
    });
  });
});

// ── GST Tests ────────────────────────────────────────────────
describe('GST Calculations', () => {
  test('IGST for inter-state supply', () => {
    const result = calculateGST(100000, 18, 'inter');
    expect(result.igst).toBe(18000);
    expect(result.cgst).toBe(0);
    expect(result.sgst).toBe(0);
    expect(result.total_gst).toBe(18000);
  });

  test('CGST + SGST for intra-state supply', () => {
    const result = calculateGST(100000, 18, 'intra');
    expect(result.cgst).toBe(9000);
    expect(result.sgst).toBe(9000);
    expect(result.igst).toBe(0);
    expect(result.cgst + result.sgst).toBe(18000);
  });

  test('Zero-rated supply', () => {
    const result = calculateGST(100000, 0, 'inter');
    expect(result.total_gst).toBe(0);
  });
});

// ── Amount in Words Tests ────────────────────────────────────
describe('amountInWords (Indian system)', () => {
  test('1,65,200 = One Lakh Sixty Five Thousand Two Hundred Rupees Only', () => {
    expect(amountInWords(165200)).toContain('Lakh');
    expect(amountInWords(165200)).toContain('Rupees Only');
  });

  test('zero returns Zero Rupees Only', () => {
    expect(amountInWords(0)).toBe('Zero Rupees Only');
  });

  test('handles paise', () => {
    const result = amountInWords(100.50);
    expect(result).toContain('Paise');
  });
});
```

---

## TEST FILE 2 — Authentication & RBAC (Priority: CRITICAL)

```javascript
// backend/src/tests/auth.test.js
const request = require('supertest');
const app     = require('../../app');

const DEMO = {
  email:    'admin@aviinjobs.com',
  password: 'Admin@2026',
};

describe('Authentication', () => {
  let accessToken;

  test('POST /auth/login — valid credentials returns token', async () => {
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send(DEMO);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.access_token).toBeDefined();
    accessToken = res.body.data.access_token;
  });

  test('POST /auth/login — wrong password returns 401', async () => {
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: DEMO.email, password: 'wrong' });
    expect(res.status).toBe(401);
  });

  test('GET /auth/me — returns user with valid token', async () => {
    const res = await request(app)
      .get('/api/v1/auth/me')
      .set('Authorization', `Bearer ${accessToken}`);
    expect(res.status).toBe(200);
    expect(res.body.data.email).toBe(DEMO.email);
  });

  test('GET /auth/me — 401 without token', async () => {
    const res = await request(app).get('/api/v1/auth/me');
    expect(res.status).toBe(401);
  });

  test('POST /auth/logout — blacklists token', async () => {
    const res = await request(app)
      .post('/api/v1/auth/logout')
      .set('Authorization', `Bearer ${accessToken}`);
    expect(res.status).toBe(200);

    // Token should now be rejected
    const res2 = await request(app)
      .get('/api/v1/auth/me')
      .set('Authorization', `Bearer ${accessToken}`);
    expect(res2.status).toBe(401);
  });
});

describe('RBAC Enforcement', () => {
  test('viewer cannot create invoice', async () => {
    // Login as viewer, attempt to POST /invoices
    // ...test implementation
  });

  test('viewer can read invoices', async () => {
    // Viewer reads GET /invoices → 200
  });

  test('billing_manager can create invoice', async () => {
    // billing_manager creates invoice → 201
  });

  test('hr_manager cannot access invoices write', async () => {
    // hr_manager attempts POST /invoices → 403
  });
});

describe('Tenant Isolation', () => {
  test('Company A cannot access Company B employees', async () => {
    // Login as Company A admin
    // Attempt GET /employees with Company B employee ID
    // Should return 404, not the employee
  });

  test('Company A cannot see Company B invoices', async () => {
    // Login as Company A admin
    // GET /invoices should only return Company A invoices
  });
});
```

---

## TEST FILE 3 — Invoice & Payment Flow

```javascript
// backend/src/tests/invoice.test.js
describe('Invoice Lifecycle', () => {
  test('Create invoice with items calculates GST correctly', async () => {
    const payload = {
      client_name: 'Test Client Ltd',
      inv_date: '2026-05-01',
      supply_type: 'inter',
      gst_rate: 18,
      items: [{ billing_rate: 140000, role: 'Developer', worked_days: 30, calendar_days: 30, po_value: 140000 }],
    };
    const res = await request(app)
      .post('/api/v1/invoices')
      .set('Authorization', `Bearer ${adminToken}`)
      .send(payload);
    expect(res.status).toBe(201);
    expect(res.body.data.igst).toBe(25200);   // 18% of 140000
    expect(res.body.data.total).toBe(165200);
    expect(res.body.data.cgst).toBe(0);       // inter-state
  });

  test('Record payment updates outstanding correctly', async () => {
    // Partially pay invoice, check outstanding
    // Fully pay, check status becomes 'paid'
  });
});
```

---

## PLAYWRIGHT E2E SETUP

```bash
cd frontend
npm install --save-dev @playwright/test
npx playwright install chromium
```

```typescript
// frontend/playwright.config.ts
import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir: './src/tests/e2e',
  baseURL: 'http://localhost:3000',
  reporter: [['html'], ['list']],
  use: {
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
  },
});
```

```typescript
// frontend/src/tests/e2e/auth.spec.ts
import { test, expect } from '@playwright/test';

test('Login flow', async ({ page }) => {
  await page.goto('/login');
  await page.fill('[name="email"]', 'admin@aviinjobs.com');
  await page.fill('[name="password"]', 'Admin@2026');
  await page.click('button[type="submit"]');
  await expect(page).toHaveURL(/dashboard/);
  await expect(page.locator('h2')).toContainText('Dashboard');
});

test('Unauthenticated redirect', async ({ page }) => {
  await page.goto('/dashboard');
  await expect(page).toHaveURL(/login/);
});

test('Create invoice', async ({ page }) => {
  // Login, navigate to invoices, create invoice, verify
});
```

---

## COVERAGE TARGETS

| Module | Target | Priority |
|--------|--------|---------|
| payrollService.js | 95% | 🔴 Critical |
| auth middleware | 90% | 🔴 Critical |
| RBAC middleware | 95% | 🔴 Critical |
| invoiceController | 80% | 🟠 High |
| employeeController | 75% | 🟠 High |
| dashboardController | 70% | 🟡 Medium |
| emailService | 60% | 🟡 Medium |
| **Overall** | **75%** | |

---

## CI INTEGRATION

```yaml
# .github/workflows/ci-cd.yml — test job (replace existing):
- name: Run tests with coverage
  working-directory: backend
  run: npm run test:coverage
  env:
    NODE_ENV: test
    JWT_SECRET: test_jwt_secret_exactly_32_characters_long
    JWT_REFRESH_SECRET: test_refresh_secret_32_characters_long
    COOKIE_SECRET: test_cookie_secret_32_characters_long
    DB_HOST: localhost
    DB_PASSWORD: test_password
    REDIS_HOST: localhost
    REDIS_PASSWORD: ""

- name: Upload coverage to Codecov
  uses: codecov/codecov-action@v4
  with:
    file: backend/coverage/lcov.info
    flags: backend
    fail_ci_if_error: false
```
