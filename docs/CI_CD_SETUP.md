# CI/CD SETUP — FinStack ERP v21

## GitHub Actions Secrets Required
Set these in: GitHub → Settings → Secrets → Actions

```
PROD_HOST            # VPS IP or Railway public URL
PROD_USER            # SSH user (e.g., ubuntu)
PROD_SSH_KEY         # Private SSH key (no passphrase)
STAGING_HOST         # Staging server
STAGING_SSH_KEY      # Staging SSH key

# Docker registry (ghcr.io uses GITHUB_TOKEN automatically)

# Backend env (production)
PROD_JWT_SECRET      # 64-char hex
PROD_JWT_REFRESH     # 64-char hex (different from above)
PROD_COOKIE_SECRET   # 64-char hex
PROD_DB_PASSWORD     # Strong password
PROD_REDIS_PASSWORD  # Strong password
PROD_SMTP_PASS       # Gmail App Password

# Frontend
NEXT_PUBLIC_API_URL  # https://api.yourdomain.com/api/v1
NEXT_PUBLIC_SENTRY_DSN

# Error tracking
SENTRY_DSN
SENTRY_AUTH_TOKEN

# Codecov
CODECOV_TOKEN
```

## Pipeline Stages (current .github/workflows/ci-cd.yml)

```
PR opened
  └─► lint (Next.js ESLint + TSC)
  └─► test (Jest, needs PG + Redis service)
  └─► security-scan (Trivy)

Merge to staging
  └─► all above
  └─► build docker image
  └─► push to ghcr.io
  └─► deploy to staging via SSH

Merge to main
  └─► all above
  └─► deploy to production (zero-downtime)
  └─► smoke test /health
  └─► notify on success/failure
```

## Branch Strategy
```
main          ← Production (protected, requires PR + CI pass)
staging       ← Staging (auto-deploy on push)
dev/*         ← Feature branches
hotfix/*      ← Emergency fixes (skip staging)
```

## Rollback Strategy
```bash
# If production deploy fails:
# 1. Previous Docker image is still in ghcr.io with previous SHA tag
# 2. SSH to server and pull previous tag:
docker pull ghcr.io/your-org/finstack-api:sha-PREVIOUS
docker compose up -d --no-deps api
# 3. Verify health
curl https://api.finstack.aviinjobs.com/health
```
