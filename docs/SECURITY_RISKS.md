# SECURITY RISKS — FinStack ERP v21
**Classification:** Internal — Engineering Only  
**Date:** 2026-05-22 | **Standard:** OWASP Top 10, CWE/SANS

---

## SEVERITY LEGEND
- 🔴 **CRITICAL** — Must fix before ANY customer data
- 🟠 **HIGH** — Fix within 72 hours of launch
- 🟡 **MEDIUM** — Fix within Sprint 1
- 🟢 **LOW** — Fix within 30 days

---

## SR-001 🔴 CRITICAL — Secrets Committed to Repository

**File:** `backend/.env` (committed to git history)  
**CWE:** CWE-798 (Hard-coded Credentials)

```
DB_PASSWORD=finstack_secret_2026       ← in git
JWT_SECRET=finstack_jwt_dev_secret...  ← in git
REDIS_PASSWORD=redis_secret_2026       ← in git
COOKIE_SECRET=finstack_dev_cookie...   ← in git
```

**Risk:** Anyone with repo access has database credentials. If repo is ever public or leaked, 
all tenant data is compromised.

**Fix:**
```bash
# 1. Rotate ALL secrets immediately
# 2. Add to .gitignore (already there — but file was committed before)
# 3. Remove from git history
git filter-repo --path backend/.env --invert-paths
# 4. Use GitHub Secrets / Doppler / AWS Secrets Manager in CI/CD
# 5. Add pre-commit hook to detect secrets
pip install detect-secrets
detect-secrets scan > .secrets.baseline
```

---

## SR-002 🔴 CRITICAL — No Startup Environment Validation

**File:** `backend/app.js`  
**CWE:** CWE-676 (Use of Potentially Dangerous Function)

App starts successfully with `JWT_SECRET=finstack_jwt_dev_secret_minimum_32_characters_long` 
(the development default). In production, if the env variable is missing, the app uses this 
insecure default and **all tokens are forgeable**.

**Fix:** Add env validation before server start (see Security Hardening section).

---

## SR-003 🟠 HIGH — nodemailer Vulnerability (CVE)

**Package:** nodemailer (installed version has 1 high severity advisory)  
**Risk:** Potential email header injection, SSRF via SMTP

**Fix:**
```bash
cd backend
npm update nodemailer
# If no fix available, add custom header sanitization
```

---

## SR-004 🟠 HIGH — Redis KEYS Command (Blocking O(N))

**File:** `backend/src/config/redis.js` line: `const keys = await redis.keys(pattern)`  
**CWE:** CWE-400 (Uncontrolled Resource Consumption)

`KEYS *` is O(N) and blocks the Redis event loop. With thousands of cache entries, this causes 
Redis to become unresponsive, blocking ALL BullMQ jobs and cache operations simultaneously.

**Fix:** Replace with `SCAN`-based iteration (see Implementation section).

---

## SR-005 🟠 HIGH — No PostgreSQL Row-Level Security

**File:** `database/schema.sql`  
**CWE:** CWE-284 (Improper Access Control)

Multi-tenancy is enforced **only at the application layer**. A single bug in any Sequelize 
query (e.g., missing `where: { company_id }`) exposes all tenants' data.

**Risk scenario:** Developer adds `Employee.findAll()` without `company_id` filter → all 
companies' employees leak to any authenticated user.

**Fix:**
```sql
-- Add RLS to all tenant tables as defense-in-depth
ALTER TABLE employees ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON employees
  USING (company_id = current_setting('app.company_id')::uuid);

-- Set at connection time in database.js
await sequelize.query("SET app.company_id = :cid", { replacements: { cid: company_id } });
```

---

## SR-006 🟠 HIGH — No Environment Variable Validation

The application does not validate that required environment variables are set and non-default 
before accepting traffic. Misconfigured deployments silently use insecure defaults.

**Variables at risk:**
- `JWT_SECRET` (default is a known string)
- `JWT_REFRESH_SECRET` (same)
- `COOKIE_SECRET` (default is a known string)
- `DB_PASSWORD` (default exposed in repo)

---

## SR-007 🟡 MEDIUM — CSRF Not Protected on State-Changing Endpoints

**Affected:** All POST/PUT/PATCH/DELETE routes  
**CWE:** CWE-352 (Cross-Site Request Forgery)

While JWT in Authorization header provides CSRF protection for API calls, the refresh token 
endpoint `POST /auth/refresh` reads from an httpOnly cookie. A CSRF attack against this 
endpoint can rotate tokens without JavaScript access to the cookie.

**Fix:** Add `SameSite=Strict` on refresh_token cookie (already set ✅) + double-submit 
cookie pattern for the refresh endpoint.

---

## SR-008 🟡 MEDIUM — File Upload Security Gaps

**File:** `backend/src/controllers/leaveController.js` (uploadCtrl)  
**CWE:** CWE-434 (Unrestricted Upload of File with Dangerous Type)

Issues:
1. MIME type checked but **not verified against file magic bytes** (content sniffing attack)
2. No file size limit per route type (global 25MB for all)
3. No virus/malware scanning
4. Files stored in `uploads/` directory served directly — potential for stored XSS via SVG

**Fix:**
```javascript
// Verify magic bytes
const { fileTypeFromBuffer } = await import('file-type');
// Sanitize filename completely
const safeFilename = `${crypto.randomUUID()}${path.extname(file.originalname).toLowerCase()}`;
// Separate size limits per endpoint
// Block SVG uploads (XSS vector)
const BLOCKED_TYPES = ['image/svg+xml', 'text/html', 'application/x-php'];
```

---

## SR-009 🟡 MEDIUM — Token Refresh Endpoint Not Rate Limited

**File:** `backend/src/routes/index.js`
```javascript
router.post('/auth/refresh', auth.refreshToken);  // NO rate limiter
```

An attacker can flood the refresh endpoint to enumerate valid refresh tokens or cause DoS 
on Redis (each call does a Redis GET).

**Fix:** Add `authLimiter` to `/auth/refresh`.

---

## SR-010 🟡 MEDIUM — Sensitive Data in JWT Payload

**File:** `backend/src/middlewares/auth.js`
```javascript
const payload = { user_id, company_id, role, name }
```

The `name` field is included in the JWT payload. While JWTs are not encrypted (only signed), 
including PII in tokens increases exposure surface. Tokens can be logged by proxies.

**Fix:** Remove `name` from payload; fetch from cache or DB on decode.

---

## SR-011 🟡 MEDIUM — Bank Account Number Stored Plaintext

**File:** `database/schema.sql` — `employees.bank_account`, `companies.bank_account`

Bank account numbers are stored as plaintext VARCHAR. This is sensitive financial data 
requiring encryption at rest per PCI-DSS principles.

**Fix:** Encrypt using `pgcrypto` `pgp_sym_encrypt()` or application-layer AES-256-GCM.

---

## SR-012 🟡 MEDIUM — Health Endpoint Leaks Version

**File:** `backend/app.js`
```javascript
res.json({ status: 'ok', version: '21.0.0', db: 'connected' });
```

Version disclosure helps attackers target known vulnerabilities in specific versions.

**Fix:** Remove `version` from public health endpoint; add to internal `/_health` only.

---

## SR-013 🟡 MEDIUM — CORS Allows All Origins in Development

**File:** `backend/app.js`
```javascript
if(!origin || allowedOrigins.includes(origin) || process.env.NODE_ENV === 'development') {
  cb(null, true);  // ← allows ANYTHING in development
```

If NODE_ENV is accidentally set to 'development' in production, CORS is completely open.

**Fix:** Remove the `NODE_ENV` bypass; always validate against allowedOrigins.

---

## SR-014 🟡 MEDIUM — Aadhaar Number Exposed in API Response

**File:** `backend/src/models/index.js` — Employee model  
**CWE:** CWE-200 (Exposure of Sensitive Information)

The `aadhar` field is excluded in the list endpoint but **returned in `getOne()`** response.  
Aadhaar is sensitive PII regulated by UIDAI. It should never be returned in full.

**Fix:**
```javascript
// In Employee model, never return full Aadhaar
attributes: { exclude: ['aadhar'] }  // Always exclude
// Store only last 4 digits for display: 'XXXX-XXXX-1234'
```

---

## SR-015 🟢 LOW — Winston Logs May Capture Sensitive Request Data

**File:** `backend/src/utils/logger.js` + `app.js` Morgan logger  

Morgan logs the full URL including query strings. Query params may contain sensitive data 
(e.g., `?email=user@example.com`).

**Fix:** Implement a custom Morgan token that redacts sensitive query params.

---

## SR-016 🟢 LOW — No Content Security Policy on API Responses

The API serves HTML error pages without a Content-Security-Policy header when Helmet's 
`contentSecurityPolicy` is configured only for the API server, not Nginx.

**Fix:** Ensure Nginx adds CSP headers for all non-API responses.

---

## OWASP TOP 10 COVERAGE

| OWASP Category | Status | Notes |
|---------------|--------|-------|
| A01 Broken Access Control | 🟡 Partial | RBAC ✓; no RLS; no tenant isolation tests |
| A02 Cryptographic Failures | 🟡 Partial | bcrypt ✓; JWT HS256 (should be RS256 for SaaS); bank account plaintext |
| A03 Injection | ✅ Good | Sequelize parameterized queries; Joi validation |
| A04 Insecure Design | 🟡 Partial | No threat model; no secrets rotation plan |
| A05 Security Misconfiguration | 🔴 Critical | Secrets in git; no env validation |
| A06 Vulnerable Components | 🟠 High | nodemailer high CVE |
| A07 Auth Failures | ✅ Good | Account lockout ✓; token blacklist ✓; secure cookies ✓ |
| A08 Software Integrity | 🟡 Partial | No SBOM; no supply chain verification |
| A09 Logging Failures | ✅ Good | Audit logs ✓; Winston ✓; structured logging |
| A10 SSRF | 🟡 Low risk | No user-supplied URLs fetched server-side currently |
