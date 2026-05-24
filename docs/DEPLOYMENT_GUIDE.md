# DEPLOYMENT GUIDE — FinStack ERP v21
**Target Platforms:** Vercel + Railway + Supabase + Upstash Redis + Cloudflare

---

## ARCHITECTURE OVERVIEW

```
[Users] → [Cloudflare CDN/WAF]
              ├── Static assets → Vercel (Next.js frontend)
              └── /api/* → Railway (Node.js API)
                              ├── Supabase PostgreSQL
                              ├── Upstash Redis
                              └── Railway Worker (BullMQ)
```

---

## OPTION A — CLOUD-MANAGED (RECOMMENDED FOR LAUNCH)

### Prerequisites
- GitHub account with repo
- Vercel account (free tier OK)
- Railway account ($5/month starter)
- Supabase account (free tier: 500MB DB)
- Upstash account (free tier: 10k req/day)
- Cloudflare account (free tier OK)
- Domain name (aviinjobs.com)

---

### STEP 1 — Supabase Database Setup

```bash
# 1. Create project at https://app.supabase.com
# 2. Go to SQL Editor and run:
cat database/schema.sql | # Paste into Supabase SQL Editor
cat database/seed.sql    | # Paste and run after schema

# 3. Get connection string from Settings → Database:
postgresql://postgres:[password]@[host]:5432/postgres

# 4. Set in Railway: DB_HOST, DB_NAME, DB_USER, DB_PASSWORD, DB_SSL=true

# 5. IMPORTANT: Supabase free = 20 DB connections
# Set DB_POOL_MAX=8 in backend .env (leaves room for direct queries)
```

### STEP 2 — Upstash Redis Setup

```bash
# 1. Create database at https://console.upstash.com
# 2. Select: us-east-1, TLS enabled
# 3. Copy: REDIS_URL (contains host, port, password)
# 4. Set in Railway:
REDIS_HOST=your-redis-endpoint.upstash.io
REDIS_PORT=6379
REDIS_PASSWORD=your_upstash_password
# Upstash requires TLS — add to redis.js:
tls: { rejectUnauthorized: false }
```

### STEP 3 — Railway Backend Deployment

```bash
# 1. Install Railway CLI
npm install -g @railway/cli
railway login

# 2. Create project
cd /path/to/finstack
railway init

# 3. Create API service (uses backend/Dockerfile)
railway up --service api

# 4. Set environment variables (Railway Dashboard → Variables):
NODE_ENV=production
PORT=3001
FRONTEND_URL=https://finstack.aviinjobs.com

DB_HOST=db.your-project.supabase.co
DB_PORT=5432
DB_NAME=postgres
DB_USER=postgres
DB_PASSWORD=your_supabase_password
DB_SSL=true
DB_POOL_MAX=8

REDIS_HOST=your-redis.upstash.io
REDIS_PORT=6379
REDIS_PASSWORD=your_upstash_password

JWT_SECRET=$(openssl rand -hex 32)
JWT_REFRESH_SECRET=$(openssl rand -hex 32)
COOKIE_SECRET=$(openssl rand -hex 32)
JWT_EXPIRES_IN=8h

SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=noreply@aviinjobs.com
SMTP_PASS=your_gmail_app_password

LOG_LEVEL=info

# 5. Create Worker service (same Dockerfile, different command)
railway up --service worker
# Set WORKER_CMD in Dockerfile or override:
# CMD ["node", "src/jobs/worker.js"]

# 6. Get Railway public URL (e.g., https://finstack-api.up.railway.app)
```

### STEP 4 — Vercel Frontend Deployment

```bash
# 1. Install Vercel CLI
npm install -g vercel
cd frontend

# 2. Set environment variables:
NEXT_PUBLIC_API_URL=https://your-railway-api.up.railway.app/api/v1

# 3. Build and deploy
vercel --prod

# 4. Add custom domain in Vercel dashboard:
# finstack.aviinjobs.com → CNAME finstack.vercel.app
```

### STEP 5 — Cloudflare Setup

```bash
# 1. Add domain to Cloudflare
# 2. Update nameservers at registrar
# 3. Create DNS records:
#    CNAME finstack     → finstack.vercel.app       (proxied)
#    CNAME api.finstack → finstack-api.railway.app  (proxied)

# 4. Enable WAF rules:
#    - Block SQL injection patterns
#    - Block XSS patterns
#    - Rate limit: 100 req/10sec per IP

# 5. Enable DDoS protection (automatic)
# 6. Enable bot fight mode
# 7. Enable Always HTTPS
# 8. Set SSL/TLS to Full (strict)

# 9. Page Rules:
#    *.finstack.aviinjobs.com/api/* → Cache: Bypass
#    *.finstack.aviinjobs.com/*     → Cache: Standard
```

---

## OPTION B — DOCKER SELF-HOSTED (VPS/Dedicated)

### Prerequisites
- Ubuntu 24.04 VPS (minimum 2 vCPU / 4GB RAM)
- Domain name with DNS access
- Docker + Docker Compose installed

### Step-by-Step

```bash
# 1. Clone repository
git clone https://github.com/your-org/finstack.git /opt/finstack
cd /opt/finstack

# 2. Generate secrets
JWT_SECRET=$(openssl rand -hex 32)
JWT_REFRESH_SECRET=$(openssl rand -hex 32)
COOKIE_SECRET=$(openssl rand -hex 32)
DB_PASSWORD=$(openssl rand -base64 24 | tr -d '=+/' | cut -c1-20)
REDIS_PASSWORD=$(openssl rand -base64 24 | tr -d '=+/' | cut -c1-20)

# 3. Create production .env
cat > .env << EOF
DB_NAME=finstack
DB_USER=finstack
DB_PASSWORD=$DB_PASSWORD
REDIS_PASSWORD=$REDIS_PASSWORD
EOF

cat > backend/.env << EOF
NODE_ENV=production
PORT=3001
FRONTEND_URL=https://finstack.aviinjobs.com

DB_HOST=postgres
DB_PORT=5432
DB_NAME=finstack
DB_USER=finstack
DB_PASSWORD=$DB_PASSWORD
DB_SSL=false
DB_POOL_MAX=15

REDIS_HOST=redis
REDIS_PORT=6379
REDIS_PASSWORD=$REDIS_PASSWORD

JWT_SECRET=$JWT_SECRET
JWT_REFRESH_SECRET=$JWT_REFRESH_SECRET
COOKIE_SECRET=$COOKIE_SECRET
JWT_EXPIRES_IN=8h

LOG_LEVEL=info
EOF

# 4. Get SSL certificate (Let's Encrypt)
apt-get install -y certbot
certbot certonly --standalone -d finstack.aviinjobs.com
cp /etc/letsencrypt/live/finstack.aviinjobs.com/fullchain.pem nginx/ssl/
cp /etc/letsencrypt/live/finstack.aviinjobs.com/privkey.pem nginx/ssl/

# Auto-renew:
echo "0 12 * * * certbot renew --quiet && docker compose restart nginx" | crontab -

# 5. Build frontend
cd frontend
npm ci
NEXT_PUBLIC_API_URL=https://api.finstack.aviinjobs.com/api/v1 npm run build
cd ..

# 6. Start services
docker compose -f docker-compose.yml up -d --build

# 7. Run migrations (first time only)
docker compose exec api node src/utils/migrate.js
docker compose exec api node src/utils/seed.js

# 8. Verify all services
docker compose ps
curl https://finstack.aviinjobs.com/health
```

---

## DATABASE BACKUP STRATEGY

```bash
# Add to crontab on host machine:
# Daily backup at 2 AM, keep 30 days
cat > /opt/finstack/scripts/backup.sh << 'EOF'
#!/bin/bash
set -e
BACKUP_DIR="/opt/backups/finstack"
DATE=$(date +%Y%m%d_%H%M%S)
mkdir -p "$BACKUP_DIR"

docker compose exec -T postgres pg_dump \
  -U finstack finstack | gzip > "$BACKUP_DIR/finstack_$DATE.sql.gz"

# Delete backups older than 30 days
find "$BACKUP_DIR" -name "*.sql.gz" -mtime +30 -delete

# Optional: upload to S3
# aws s3 cp "$BACKUP_DIR/finstack_$DATE.sql.gz" s3://your-bucket/backups/

echo "✓ Backup complete: finstack_$DATE.sql.gz"
EOF

chmod +x /opt/finstack/scripts/backup.sh
echo "0 2 * * * /opt/finstack/scripts/backup.sh >> /var/log/finstack-backup.log 2>&1" | crontab -
```

---

## HEALTH CHECKS & MONITORING

```bash
# Quick health check script
cat > /opt/finstack/scripts/healthcheck.sh << 'EOF'
#!/bin/bash
API_URL="https://api.finstack.aviinjobs.com"
FRONTEND_URL="https://finstack.aviinjobs.com"

check() {
  STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$1")
  if [ "$STATUS" = "$2" ]; then
    echo "✓ $1 → $STATUS"
  else
    echo "✗ $1 → $STATUS (expected $2)"
    exit 1
  fi
}

check "$API_URL/health" "200"
check "$FRONTEND_URL" "200"
check "$API_URL/api/v1/auth/login" "400"  # 400 = server up, bad request expected
echo "All health checks passed"
EOF
chmod +x /opt/finstack/scripts/healthcheck.sh

# Run every 5 minutes via cron
echo "*/5 * * * * /opt/finstack/scripts/healthcheck.sh >> /var/log/finstack-health.log 2>&1" | crontab -
```

---

## DOCKER COMPOSE RESOURCE LIMITS (Add to docker-compose.yml)

```yaml
# Add 'deploy:' section to each service:
services:
  api:
    deploy:
      resources:
        limits:
          cpus: '1.0'
          memory: 512M
        reservations:
          cpus: '0.25'
          memory: 256M

  worker:
    deploy:
      resources:
        limits:
          cpus: '0.5'
          memory: 256M

  postgres:
    deploy:
      resources:
        limits:
          cpus: '1.0'
          memory: 1G

  redis:
    deploy:
      resources:
        limits:
          cpus: '0.25'
          memory: 256M
```

---

## ENVIRONMENT VARIABLES REFERENCE

| Variable | Required | Example | Description |
|----------|---------|---------|-------------|
| NODE_ENV | Yes | production | Application environment |
| PORT | No | 3001 | API server port |
| FRONTEND_URL | Yes | https://app.example.com | Allowed CORS origin |
| DB_HOST | Yes | db.supabase.co | PostgreSQL host |
| DB_PASSWORD | Yes | — | PostgreSQL password (min 20 chars) |
| DB_SSL | Yes (prod) | true | Enable SSL for DB connection |
| DB_POOL_MAX | No | 8 | Max DB pool connections per service |
| REDIS_HOST | Yes | redis.upstash.io | Redis host |
| REDIS_PASSWORD | Yes | — | Redis auth password |
| JWT_SECRET | Yes | — | JWT signing key (min 32 chars) |
| JWT_REFRESH_SECRET | Yes | — | JWT refresh key (min 32 chars, different) |
| COOKIE_SECRET | Yes | — | Cookie signing key (min 32 chars) |
| SMTP_USER | No | noreply@co.com | Email sender (disables email if missing) |
| SMTP_PASS | No | — | Gmail App Password |
| LOG_LEVEL | No | info | winston log level |
| ENCRYPT_KEY | Recommended | — | 32-byte hex for field encryption |
| SENTRY_DSN | Recommended | — | Sentry error tracking DSN |
