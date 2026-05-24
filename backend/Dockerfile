# ─── Stage 1: Install production deps ───────────────────────────────────────
FROM node:20-alpine AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev && npm cache clean --force

# ─── Stage 2: Production image ───────────────────────────────────────────────
FROM node:20-alpine AS production
LABEL maintainer="FinStack ERP <tech@aviinjobs.com>"
LABEL version="21.0.0"

# Security: non-root user
RUN addgroup -g 1001 -S nodejs \
 && adduser  -u 1001 -S finstack -G nodejs \
 && apk update && apk upgrade \
 && apk add --no-cache dumb-init curl \
 && rm -rf /var/cache/apk/*

WORKDIR /app

# Copy deps from stage 1
COPY --from=deps --chown=finstack:nodejs /app/node_modules ./node_modules

# Copy application
COPY --chown=finstack:nodejs . .

# Create runtime dirs
RUN mkdir -p uploads logs \
 && chown -R finstack:nodejs uploads logs

USER finstack

EXPOSE 3001

HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
  CMD curl -f http://localhost:3001/health || exit 1

ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "app.js"]
