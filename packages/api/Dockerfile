FROM node:20-alpine AS builder

WORKDIR /app

# Copy workspace files
COPY package*.json ./
COPY tsconfig.json ./
COPY packages/core/package*.json ./packages/core/
COPY packages/database/package*.json ./packages/database/
COPY packages/api/package*.json ./packages/api/

# Install dependencies
RUN npm ci --workspace=@multiplex/api

# Copy source
COPY packages/core/ ./packages/core/
COPY packages/database/ ./packages/database/
COPY packages/api/ ./packages/api/

# Build
RUN npm run build --workspace=@multiplex/core
RUN npm run build --workspace=@multiplex/database
RUN npm run build --workspace=@multiplex/api

# Production image
FROM node:20-alpine

WORKDIR /app

# Copy built artifacts
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/packages/core/dist ./packages/core/dist
COPY --from=builder /app/packages/core/package.json ./packages/core/
COPY --from=builder /app/packages/database/dist ./packages/database/dist
COPY --from=builder /app/packages/database/package.json ./packages/database/
COPY --from=builder /app/packages/api/dist ./packages/api/dist
COPY --from=builder /app/packages/api/package.json ./packages/api/

# Create non-root user
RUN addgroup -g 1001 -S nodejs && adduser -S nodejs -u 1001
USER nodejs

EXPOSE 3001

HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:3001/health || exit 1

CMD ["node", "packages/api/dist/index.js"]
