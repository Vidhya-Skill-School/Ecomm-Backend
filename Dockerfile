# syntax=docker/dockerfile:1
FROM node:20-alpine AS base
WORKDIR /app
# Install corepack to enable pnpm
RUN corepack enable pnpm

# Dependencies stage
FROM base AS deps
COPY package.json pnpm-lock.yaml ./
# Use BuildKit cache for pnpm store to incredibly speed up repeated builds
RUN --mount=type=cache,id=pnpm,target=/root/.local/share/pnpm/store pnpm fetch --prod=false
RUN --mount=type=cache,id=pnpm,target=/root/.local/share/pnpm/store pnpm install --no-frozen-lockfile

# Development stage (used for hot-reloading)
FROM base AS development
COPY --from=deps /app/node_modules ./node_modules
# We don't copy src here; it will be mounted as a volume in docker-compose
COPY package.json ./
ENV NODE_ENV=development
ENV PORT=3001
ENV HOST=0.0.0.0
# The command for hot reload
CMD ["pnpm", "run", "dev"]

# Builder stage for PRD
FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# If there was a build step (like TS compilation), it would go here

# Production dependencies only
FROM base AS prod-deps
COPY package.json pnpm-lock.yaml ./
RUN --mount=type=cache,id=pnpm,target=/root/.local/share/pnpm/store pnpm install --prod --no-frozen-lockfile

# Final production stage
FROM base AS production
ENV NODE_ENV=production
ENV PORT=3001
ENV HOST=0.0.0.0
# Install curl for health checks
RUN apk add --no-cache curl
COPY --from=prod-deps /app/node_modules ./node_modules
COPY --from=builder /app/src ./src
COPY --from=builder /app/package.json ./package.json

EXPOSE 3001
# Start explicitly without nodemon for performance
CMD ["node", "src/index.js"]
