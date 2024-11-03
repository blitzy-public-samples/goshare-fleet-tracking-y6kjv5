# Live Fleet Tracking System - Backend Services

Comprehensive backend services for the Live Fleet Tracking System, providing real-time fleet monitoring, route optimization, and delivery management capabilities through a microservices architecture.

## Human Tasks

- [ ] Generate secure random values for all secrets and API keys in `.env`
- [ ] Configure SSL certificates for database and Redis connections
- [ ] Set up monitoring alerts and thresholds in APM system
- [ ] Configure backup retention policies for each environment
- [ ] Set up proper network security groups and firewall rules
- [ ] Configure proper CORS origins for production environment
- [ ] Set up proper rate limiting values based on load testing
- [ ] Configure proper connection pool sizes based on load testing

## Technology Stack

- **Runtime**: Node.js >= 18.0.0
- **Language**: TypeScript
- **Frameworks**: Express.js, Socket.io
- **Databases**:
  - PostgreSQL 14 (Primary data store)
  - MongoDB 6.0 (Location and event data)
  - Redis 7.0 (Caching and real-time processing)
- **Analytics**: Python 3.11 with NumPy/Pandas
- **Containerization**: Docker & Kubernetes
- **Monitoring**: Prometheus/Grafana

## System Architecture

The backend system consists of the following core microservices:

- API Services (Node.js/Express)
- Real-time Location Service (Socket.io)
- Route Optimization Service
- Analytics Service (Python)
- Notification Service
- Integration Service

## Prerequisites

- Node.js >= 18.0.0
- npm >= 8.0.0
- Python 3.11
- Docker and Docker Compose
- PostgreSQL 14
- MongoDB 6.0
- Redis 7.0

## Getting Started

1. Clone the repository:
```bash
git clone <repository_url>
cd src/backend
```

2. Install dependencies:
```bash
npm install
pip install -r requirements.txt
```

3. Configure environment:
```bash
cp .env.example .env
# Edit .env with your configuration
```

4. Start development services:
```bash
docker-compose up -d
npm run dev
```

## Development

### Available Scripts

```bash
# Start development server
npm run dev

# Build for production
npm run build

# Run tests
npm test
npm run test:watch
npm run test:coverage

# Linting and formatting
npm run lint
npm run format

# Database migrations
npm run migrate

# Docker operations
npm run docker:build
npm run docker:run
```

## Database Setup

### PostgreSQL

```bash
# Initialize database
npm run migrate

# Configure read replicas
# Update POSTGRES_READ_REPLICA_HOSTS in .env
```

### MongoDB

```bash
# Initialize replica set
docker-compose exec mongodb mongosh --eval "rs.initiate()"

# Create geospatial indexes
npm run mongo:init
```

### Redis

```bash
# Verify cluster mode
docker-compose exec redis redis-cli cluster info
```

## Service Configuration

### API Service

- Port: 3000 (configurable)
- API Version: v1
- Authentication: JWT
- Rate Limiting: Enabled
- CORS: Configurable origins

### WebSocket Service

- Port: 3001 (configurable)
- Path: /socket.io
- Transports: websocket, polling
- Ping Interval: 25s
- Ping Timeout: 30s

### Analytics Service

- Python-based data processing
- Real-time metrics calculation
- Historical data analysis
- Performance monitoring

## Deployment

### Development Environment

```bash
docker-compose up -d
```

### Production Environment

```bash
# Build production images
docker-compose -f docker-compose.prod.yml build

# Deploy with scaling
docker-compose -f docker-compose.prod.yml up -d --scale api=3
```

## Monitoring & Logging

### Prometheus Metrics

- Application metrics
- Database performance
- Cache hit rates
- API response times

### Grafana Dashboards

- Real-time fleet monitoring
- System performance metrics
- Error rate tracking
- Resource utilization

## Security

### Authentication

- JWT-based authentication
- Refresh token rotation
- Rate limiting per IP/user
- Request validation

### Data Protection

- TLS/SSL encryption
- Database encryption at rest
- Secure credential storage
- Input validation and sanitization

## Performance Optimization

### Database Optimization

```bash
# PostgreSQL settings
max_connections = 1000
shared_buffers = 256MB
work_mem = 16MB
maintenance_work_mem = 256MB

# MongoDB indexes
db.locations.createIndex({ "coordinates": "2dsphere" })
```

### Caching Strategy

- Redis caching layer
- Query result caching
- Session storage
- Real-time data caching

## Maintenance Procedures

### Backup Schedule

```bash
# Database backups
0 0 * * * /scripts/backup.sh

# Log rotation
0 0 * * 0 /scripts/rotate-logs.sh
```

### Health Checks

```bash
# Check service health
curl http://localhost:3000/health

# Monitor resource usage
docker stats
```

## Troubleshooting

### Common Issues

1. Database Connection
```bash
# Check PostgreSQL
pg_isready -h localhost -p 5432

# Verify MongoDB replica set
mongosh --eval "rs.status()"
```

2. Redis Connection
```bash
# Test connectivity
redis-cli ping

# Check cluster health
redis-cli cluster info
```

3. Service Health
```bash
# View logs
docker-compose logs -f api
docker-compose logs -f analytics
```

## API Documentation

API documentation is available at `/api/docs` when running in development mode.

### Key Endpoints

- `/api/v1/auth`: Authentication endpoints
- `/api/v1/fleet`: Fleet management
- `/api/v1/location`: Location tracking
- `/api/v1/routes`: Route optimization
- `/api/v1/analytics`: Analytics and reporting

## Contributing

1. Fork the repository
2. Create your feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## License

This project is licensed under the ISC License.