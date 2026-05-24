# BILLING ARCHITECTURE — FinStack ERP v21
**Date:** 2026-05-22 | **Gateway:** Razorpay (Primary) + Stripe (International)

---

## SUBSCRIPTION PLANS

| Plan | Price | Employees | Invoices/mo | Users | Features |
|------|-------|-----------|------------|-------|---------|
| Trial | ₹0 / 14 days | 10 | 25 | 2 | All features |
| Starter | ₹999/mo | 25 | 100 | 3 | Core ERP |
| Professional | ₹2,499/mo | 100 | Unlimited | 10 | + AI Assistant |
| Enterprise | ₹7,999/mo | Unlimited | Unlimited | Unlimited | + White-label |

---

## BILLING DATABASE SCHEMA

```sql
-- Add to schema.sql (migration):
CREATE TYPE plan_id AS ENUM ('trial','starter','professional','enterprise');

CREATE TABLE subscription_plans (
  id          plan_id PRIMARY KEY,
  name        VARCHAR(100) NOT NULL,
  price_inr   NUMERIC(10,2) DEFAULT 0,
  price_usd   NUMERIC(10,2) DEFAULT 0,
  max_employees INTEGER DEFAULT 10,
  max_invoices_pm INTEGER DEFAULT 25,
  max_users    INTEGER DEFAULT 2,
  features     JSONB DEFAULT '{}',
  active       BOOLEAN DEFAULT true
);

CREATE TABLE billing_subscriptions (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id          UUID NOT NULL REFERENCES companies(id),
  plan_id             plan_id NOT NULL DEFAULT 'trial',
  status              VARCHAR(30) DEFAULT 'trial',  -- trial, active, past_due, suspended, cancelled
  razorpay_sub_id     VARCHAR(100) UNIQUE,
  razorpay_customer_id VARCHAR(100),
  current_period_start TIMESTAMPTZ,
  current_period_end   TIMESTAMPTZ,
  trial_end           TIMESTAMPTZ,
  cancel_at_period_end BOOLEAN DEFAULT false,
  payment_method      VARCHAR(50),
  last_payment_at     TIMESTAMPTZ,
  last_payment_amount NUMERIC(10,2),
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  updated_at          TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE billing_invoices (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id      UUID NOT NULL REFERENCES companies(id),
  subscription_id UUID REFERENCES billing_subscriptions(id),
  razorpay_inv_id VARCHAR(100) UNIQUE,
  amount          NUMERIC(10,2) NOT NULL,
  currency        VARCHAR(3) DEFAULT 'INR',
  status          VARCHAR(30) DEFAULT 'pending',  -- pending, paid, failed, refunded
  invoice_date    DATE NOT NULL,
  due_date        DATE,
  paid_at         TIMESTAMPTZ,
  payment_id      VARCHAR(100),
  pdf_url         TEXT,
  line_items      JSONB,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE usage_metrics (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id  UUID NOT NULL REFERENCES companies(id),
  metric_date DATE NOT NULL,
  employees   INTEGER DEFAULT 0,
  invoices    INTEGER DEFAULT 0,
  users       INTEGER DEFAULT 0,
  api_calls   INTEGER DEFAULT 0,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(company_id, metric_date)
);
```

---

## RAZORPAY INTEGRATION

```bash
cd backend
npm install razorpay
```

```javascript
// backend/src/services/billingService.js
'use strict';
const Razorpay = require('razorpay');
const crypto   = require('crypto');
const logger   = require('../utils/logger');

const razorpay = new Razorpay({
  key_id:     process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

const PLAN_IDS = {
  starter:      process.env.RAZORPAY_PLAN_STARTER,
  professional: process.env.RAZORPAY_PLAN_PROFESSIONAL,
  enterprise:   process.env.RAZORPAY_PLAN_ENTERPRISE,
};

// Create Razorpay subscription
async function createSubscription(companyId, planId, customerData) {
  const sub = await razorpay.subscriptions.create({
    plan_id:         PLAN_IDS[planId],
    total_count:     12,  // 12 billing cycles
    quantity:        1,
    customer_notify: 1,
    notes:           { company_id: companyId, plan: planId },
  });
  return sub;
}

// Verify webhook signature
function verifyWebhookSignature(body, signature) {
  const expectedSig = crypto
    .createHmac('sha256', process.env.RAZORPAY_WEBHOOK_SECRET)
    .update(JSON.stringify(body))
    .digest('hex');
  return crypto.timingSafeEqual(
    Buffer.from(expectedSig, 'hex'),
    Buffer.from(signature, 'hex')
  );
}

// Handle webhook events
async function handleWebhook(event, payload) {
  const { BillingSubscription, Company } = require('../models');
  logger.info(`[Billing] Webhook received: ${event}`);

  switch (event) {
    case 'subscription.activated':
    case 'subscription.charged': {
      const sub = payload.subscription.entity;
      await BillingSubscription.upsert({
        razorpay_sub_id: sub.id,
        status:          'active',
        current_period_start: new Date(sub.current_start * 1000),
        current_period_end:   new Date(sub.current_end   * 1000),
        last_payment_at:      new Date(),
      }, { conflictFields: ['razorpay_sub_id'] });
      // Update company subscription
      await Company.update(
        { subscription: 'active', subscription_end: new Date(sub.current_end * 1000) },
        { where: { id: sub.notes.company_id } }
      );
      break;
    }

    case 'subscription.pending':
    case 'subscription.halted': {
      const sub = payload.subscription.entity;
      await BillingSubscription.update(
        { status: 'past_due' },
        { where: { razorpay_sub_id: sub.id } }
      );
      await Company.update(
        { subscription: 'past_due' },
        { where: { id: sub.notes.company_id } }
      );
      break;
    }

    case 'subscription.cancelled': {
      const sub = payload.subscription.entity;
      await BillingSubscription.update(
        { status: 'cancelled' },
        { where: { razorpay_sub_id: sub.id } }
      );
      await Company.update(
        { subscription: 'cancelled' },
        { where: { id: sub.notes.company_id } }
      );
      break;
    }
  }
}

module.exports = { createSubscription, verifyWebhookSignature, handleWebhook };
```

---

## FEATURE GATING MIDDLEWARE

```javascript
// backend/src/middlewares/featureGate.js
'use strict';
const { AppError } = require('./errorHandler');

const PLAN_LIMITS = {
  trial:        { max_employees: 10, max_invoices: 25,  max_users: 2,  ai: false },
  starter:      { max_employees: 25, max_invoices: 100, max_users: 3,  ai: false },
  professional: { max_employees: 100,max_invoices: 9999,max_users: 10, ai: true  },
  enterprise:   { max_employees: 9999,max_invoices:9999,max_users:9999,ai: true  },
};

function requireFeature(feature) {
  return async (req, _res, next) => {
    const plan  = req.user?.company?.subscription || 'trial';
    const limits = PLAN_LIMITS[plan] || PLAN_LIMITS.trial;
    if (!limits[feature]) {
      throw new AppError(
        `${feature} is not available on the ${plan} plan. Please upgrade.`,
        403, 'FEATURE_GATED'
      );
    }
    next();
  };
}

function checkEmployeeLimit() {
  return async (req, _res, next) => {
    const { Employee } = require('../models');
    const { subscriptionGuard } = require('./subscriptionGuard');
    const plan   = req.user?.company?.subscription || 'trial';
    const limits = PLAN_LIMITS[plan] || PLAN_LIMITS.trial;
    const count  = await Employee.count({ where: { company_id: req.company_id, status: 'active' } });
    if (count >= limits.max_employees) {
      throw new AppError(
        `Employee limit (${limits.max_employees}) reached for your plan.`,
        403, 'EMPLOYEE_LIMIT_REACHED'
      );
    }
    next();
  };
}

module.exports = { requireFeature, checkEmployeeLimit, PLAN_LIMITS };
```

---

## BILLING API ROUTES

```javascript
// Add to backend/src/routes/index.js:
const billing = require('../controllers/billingController');
router.post('/billing/subscribe',           authenticate, billing.createSubscription);
router.post('/billing/webhook',             billing.handleWebhook);  // No auth — webhook
router.get ('/billing/subscription',        authenticate, billing.getSubscription);
router.post('/billing/cancel',             authenticate, billing.cancelSubscription);
router.get ('/billing/invoices',           authenticate, billing.getBillingInvoices);
router.get ('/billing/usage',              authenticate, billing.getUsage);
router.get ('/billing/plans',                            billing.getPlans);
```

---

## FRONTEND BILLING COMPONENTS

```typescript
// frontend/src/app/billing/page.tsx
// - Plan comparison table
// - Current plan usage meters (employees used / allowed)
// - Upgrade button → Razorpay checkout
// - Invoice history
// - Cancel subscription
```

---

## ENVIRONMENT VARIABLES

```bash
RAZORPAY_KEY_ID=rzp_live_xxxxxxxx
RAZORPAY_KEY_SECRET=your_secret
RAZORPAY_WEBHOOK_SECRET=your_webhook_secret
RAZORPAY_PLAN_STARTER=plan_xxxxxx
RAZORPAY_PLAN_PROFESSIONAL=plan_xxxxxx
RAZORPAY_PLAN_ENTERPRISE=plan_xxxxxx
```
