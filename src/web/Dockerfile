# Stage 1: Build environment
# Using Node.js 18 Alpine as specified in external dependencies
FROM node:18-alpine AS builder

# Human Tasks:
# 1. Ensure all build arguments are provided in CI/CD pipeline:
#    - API_URL: Backend API URL for production environment
#    - SOCKET_URL: WebSocket server URL for production environment
#    - GOOGLE_MAPS_KEY: Google Maps API key for production environment
# 2. Verify that the npm registry is accessible during build
# 3. Configure proper memory limits for Node.js build process
# 4. Ensure SSL certificates are available for Nginx configuration

# Set working directory
WORKDIR /app

# Copy package files for dependency installation
# Requirement: Web Dashboard (1.1 System Overview)
COPY package.json package-lock.json ./

# Install dependencies using clean install for reproducible builds
RUN npm ci --production=false

# Copy source code and configuration files
COPY . .

# Set build-time environment variables
ARG API_URL
ARG SOCKET_URL
ARG GOOGLE_MAPS_KEY

ENV REACT_APP_API_URL=${API_URL}
ENV REACT_APP_SOCKET_URL=${SOCKET_URL}
ENV REACT_APP_GOOGLE_MAPS_KEY=${GOOGLE_MAPS_KEY}
ENV NODE_ENV=production

# Build production bundle with optimization flags
# Requirement: Performance Requirements (1.2 Scope)
RUN npm run build

# Remove development dependencies to reduce image size
RUN npm prune --production

# Stage 2: Production environment
# Using Nginx 1.20 Alpine as specified in external dependencies
FROM nginx:1.20-alpine

# Add labels for container metadata
LABEL maintainer="Fleet Tracking System Team" \
      version="1.0.0" \
      description="Fleet Tracking System Web Dashboard" \
      environment="production"

# Create nginx user and group with restricted permissions
RUN addgroup -g 101 -S nginx \
    && adduser -S -D -H -u 101 -h /var/cache/nginx -s /sbin/nologin -G nginx -g nginx nginx

# Copy custom nginx configuration with security headers
# Requirement: Security Architecture (4.6)
COPY nginx/nginx.conf /etc/nginx/nginx.conf

# Create required nginx directories with proper permissions
RUN mkdir -p /var/log/nginx \
    && chown -R nginx:nginx /var/log/nginx \
    && mkdir -p /var/cache/nginx \
    && chown -R nginx:nginx /var/cache/nginx \
    && mkdir -p /var/run \
    && chown -R nginx:nginx /var/run

# Copy built assets from builder stage to nginx html directory
COPY --from=builder --chown=nginx:nginx /app/build /usr/share/nginx/html

# Configure correct permissions for nginx user
RUN chown -R nginx:nginx /usr/share/nginx/html \
    && chmod -R 755 /usr/share/nginx/html

# Create volume for nginx logs
VOLUME ["/var/log/nginx"]

# Expose port 80 for HTTP traffic
EXPOSE 80

# Configure health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD curl --fail http://localhost:80 || exit 1

# Use non-root user for security
USER nginx

# Start nginx with daemon off to run in foreground
CMD ["nginx", "-g", "daemon off;"]