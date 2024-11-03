# Live Fleet Tracking System - Backend Setup Guide

## Prerequisites

Before setting up the Live Fleet Tracking System backend services, ensure you have the following prerequisites installed:

- Node.js >= 18.0.0
- npm >= 8.0.0
- Docker and Docker Compose
- PostgreSQL 14
- MongoDB 6.0
- Redis 7.0
- Python 3.11 (for analytics service)

## 1. Environment Setup

### 1.1 Clone Repository and Install Dependencies

```bash
# Clone the repository
git clone https://github.com/organization/fleet-tracking-backend.git
cd fleet-tracking-backend

# Install Node.js dependencies
npm install

# Install Python dependencies for analytics service
pip install -r requirements.txt
```

### 1.2 Environment Configuration

```bash
# Copy environment template
cp .env.example .env

# Edit environment variables with your configuration
nano .env
```

Key environment variables to configure:

- Database credentials and connection settings
- Redis connection and cluster configuration
- JWT secrets and token expiry times
- API keys for external services
- Monitoring and logging settings

### 1.3 SSL Certificate Setup

1. Place SSL certificates in `./config/certs/`
2. Update database and Redis SSL configurations in `.env`
3. Configure HTTPS for production environments

## 2. Database Setup

### 2.1 PostgreSQL Configuration

```bash
# Start PostgreSQL service
docker-compose up -d postgres

# Initialize database with schema
npm run migrate

# Configure read replicas (Production)
# Update POSTGRES_READ_REPLICA_HOSTS in .env
```

### 2.2 MongoDB Setup

```bash
# Start MongoDB service
docker-compose up -d mongodb

# Initialize replica set
docker-compose exec mongodb mongosh --eval "rs.initiate()"

# Create indexes for geospatial queries
npm run mongo:init
```

### 2.3 Redis Configuration

```bash
# Start Redis service
docker-compose up -d redis

# Verify Redis cluster mode (if enabled)
docker-compose exec redis redis-cli cluster info
```

## 3. Service Configuration

### 3.1 API Service Setup

```bash
# Build the API service
npm run build

# Start the service in development mode
npm run dev

# Start with production configuration
NODE_ENV=production npm start
```

### 3.2 Analytics Service Setup

```bash
# Build analytics service
docker build -f Dockerfile.analytics -t fleet-analytics .

# Start the service
docker-compose up -d analytics
```

### 3.3 WebSocket Configuration

```bash
# Configure WebSocket settings in .env
SOCKET_PORT=3001
SOCKET_PATH=/socket.io

# Start WebSocket server
npm run socket
```

## 4. Docker Deployment

### 4.1 Development Environment

```bash
# Build and start all services
docker-compose up -d

# View service logs
docker-compose logs -f

# Check service health
docker-compose ps
```

### 4.2 Production Configuration

```bash
# Build production images
docker-compose -f docker-compose.prod.yml build

# Deploy services
docker-compose -f docker-compose.prod.yml up -d

# Scale services
docker-compose -f docker-compose.prod.yml up -d --scale api=3
```

## 5. Testing Setup

### 5.1 Unit Tests

```bash
# Run all tests
npm test

# Run with coverage
npm run test:coverage

# Watch mode for development
npm run test:watch
```

### 5.2 Integration Tests

```bash
# Start test database
docker-compose -f docker-compose.test.yml up -d

# Run integration tests
npm run test:integration
```

## 6. Monitoring Setup

### 6.1 Prometheus Configuration

1. Configure metrics endpoint in `prometheus.yml`
2. Start Prometheus container
3. Set up alerting rules

### 6.2 Grafana Setup

1. Import dashboard templates from `./monitoring/dashboards/`
2. Configure data sources
3. Set up alert notifications

## 7. Backup Configuration

### 7.1 Database Backups

```bash
# Configure backup schedule
crontab -e

# Add backup jobs
0 0 * * * /path/to/scripts/backup.sh
```

### 7.2 Backup Verification

```bash
# Test backup restoration
./scripts/test-restore.sh

# Verify backup integrity
./scripts/verify-backup.sh
```

## 8. Security Configuration

### 8.1 API Security

1. Configure rate limiting in `.env`
2. Set up CORS policies
3. Enable security headers

### 8.2 Database Security

1. Configure database user permissions
2. Enable SSL connections
3. Set up network security groups

## 9. Troubleshooting

### Common Issues

#### Database Connection

```bash
# Check PostgreSQL connection
pg_isready -h localhost -p 5432

# Verify MongoDB replica set
mongosh --eval "rs.status()"
```

#### Redis Connection

```bash
# Test Redis connectivity
redis-cli ping

# Check cluster health
redis-cli cluster info
```

#### Service Health

```bash
# Check service logs
docker-compose logs api
docker-compose logs analytics

# Verify container health
docker ps --format "table {{.Names}}\t{{.Status}}"
```

## 10. Maintenance Procedures

### 10.1 Log Rotation

```bash
# Configure logrotate
sudo nano /etc/logrotate.d/fleet-tracker

# Test configuration
sudo logrotate -d /etc/logrotate.d/fleet-tracker
```

### 10.2 Database Maintenance

```bash
# PostgreSQL vacuum
psql -U postgres -d fleet_db -c "VACUUM ANALYZE;"

# MongoDB compaction
mongosh --eval "db.runCommand({ compact: 'collection_name' })"
```

### 10.3 Cache Management

```bash
# Monitor Redis memory
redis-cli info memory

# Clear specific cache
redis-cli DEL "cache:key:pattern:*"
```

## 11. Performance Tuning

### 11.1 Node.js Configuration

```bash
# Set Node.js memory limits
NODE_OPTIONS="--max-old-space-size=4096"

# Enable worker threads
UV_THREADPOOL_SIZE=32
```

### 11.2 Database Optimization

```bash
# PostgreSQL configuration
max_connections = 1000
shared_buffers = 256MB
work_mem = 16MB
maintenance_work_mem = 256MB
effective_cache_size = 1GB

# MongoDB indexes
db.locations.createIndex({ "coordinates": "2dsphere" })
```

### 11.3 Redis Optimization

```bash
# Redis configuration
maxmemory 1gb
maxmemory-policy allkeys-lru
```

## 12. Deployment Checklist

- [ ] Environment variables configured
- [ ] SSL certificates installed
- [ ] Database migrations completed
- [ ] Security headers enabled
- [ ] Monitoring configured
- [ ] Backup jobs scheduled
- [ ] Rate limiting enabled
- [ ] CORS policies set
- [ ] Health checks configured
- [ ] Logging setup completed