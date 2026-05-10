# Multi-stage Dockerfile for a Next.js standalone production build.

# ---- deps ----
FROM node:20-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json* ./
# Use ci when a lockfile exists, fall back to install otherwise.
RUN if [ -f package-lock.json ]; then npm ci; else npm install; fi

# ---- builder ----
FROM node:20-alpine AS builder
WORKDIR /app

# NEXT_PUBLIC_* values are baked in at build time. Railway should pass it
# as a build-time arg; we forward it to the env so `next build` picks it up.
ARG NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL

COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

# ---- runner ----
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000

RUN addgroup --system --gid 1001 nodejs \
 && adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs
EXPOSE 3000

# Railway sets PORT; respect it.
CMD ["sh", "-c", "node server.js"]
