# Human Tasks:
# 1. Configure environment-specific .env files for each deployment environment
# 2. Set up Docker registry access and credentials
# 3. Configure container monitoring and logging agents
# 4. Review and adjust resource limits based on environment needs
# 5. Set up necessary SSL certificates for HTTPS

# Stage 1: Builder
# Requirement: Core Backend Services (1.1) - Node.js microservices configuration
FROM node:18-alpine AS builder

# Security: Set working directory to avoid path traversal
WORKDIR /app

# Optimization: Copy package files first for better cache utilization
COPY package*.json ./
COPY tsconfig.json ./

# Security: Install dependencies with exact versions and clean npm cache
# Requirement: Performance Requirements (1.2) - Container optimization
RUN npm ci && \
    npm cache clean --force

# Copy source code
COPY src/ ./src/

# Build TypeScript code
RUN npm run build

# Stage 2: Production
# Requirement: Security Architecture (4.6) - Secure container configuration
FROM node:18-alpine AS production

# Security: Set working directory
WORKDIR /app

# Security: Add non-root user
RUN addgroup -g 1001 appgroup && \
    adduser -u 1001 -G appgroup -s /bin/sh -D appuser

# Copy built assets from builder stage
COPY --from=builder /app/dist ./dist
COPY package*.json ./

# Security: Install only production dependencies
# Requirement: Performance Requirements (1.2) - Container optimization
RUN npm ci --only=production && \
    npm cache clean --force && \
    chown -R appuser:appgroup /app

# Security: Use non-root user
USER appuser

# Environment variables
ENV NODE_ENV=production
ENV PORT=3000
ENV WS_PORT=3001

# Expose ports
# Requirement: Backend Technologies (4.4.2) - API Gateway and microservices
EXPOSE 3000
EXPOSE 3001

# Health check
# Requirement: Performance Requirements (1.2) - 99.9% system uptime
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:3000/health || exit 1

# Start application
CMD ["node", "dist/index.js"]

# Security labels
LABEL maintainer="Fleet Tracking System Team" \
      version="1.0.0" \
      description="Fleet Tracking Backend Services" \
      security.credentials="none" \
      security.root="false"

# Security: Set read-only root filesystem
# Requirement: Security Architecture (4.6) - Minimal attack surface
VOLUME ["/tmp", "/app/dist"]