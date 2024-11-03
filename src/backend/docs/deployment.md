# Live Fleet Tracking System - Backend Deployment Guide

## Table of Contents
1. [Overview](#overview)
2. [Prerequisites](#prerequisites)
3. [Infrastructure Setup](#infrastructure-setup)
4. [Container Configuration](#container-configuration)
5. [Kubernetes Deployment](#kubernetes-deployment)
6. [Database Setup](#database-setup)
7. [Monitoring Setup](#monitoring-setup)
8. [Security Configuration](#security-configuration)
9. [Deployment Procedures](#deployment-procedures)
10. [Scaling Guidelines](#scaling-guidelines)
11. [Backup and Recovery](#backup-and-recovery)
12. [Troubleshooting](#troubleshooting)

## 1. Overview

This document provides comprehensive deployment instructions for the Live Fleet Tracking System backend services. The system is designed to support high availability with 99.9% uptime and horizontal scaling for 10,000+ concurrent users.

### Human Tasks Checklist
- [ ] Configure environment-specific .env files
- [ ] Set up Docker registry access and credentials
- [ ] Configure SSL certificates for HTTPS
- [ ] Set up monitoring and logging agents
- [ ] Configure resource quotas for namespaces
- [ ] Set up network policies
- [ ] Review and adjust resource limits
- [ ] Configure backup schedules

## 2. Prerequisites

### Development Environment
- Docker v20.10+
- Docker Compose v2.10+
- Node.js v18.x
- Python 3.11+

### Staging/Production Environment
- AWS Account with administrative access
- kubectl v1.24+
- Helm v3.10+
- AWS CLI v2.x
- eksctl v0.120+

### Access Requirements
- AWS IAM credentials
- Kubernetes cluster access
- Container registry credentials
- Database access credentials
- Monitoring system access

## 3. Infrastructure Setup

### AWS Infrastructure Components

```bash
# Create EKS cluster
eksctl create cluster \
  --name fleet-tracking-prod \
  --region us-east-1 \
  --nodes-min 3 \
  --nodes-max 10 \
  --node-type t3.large

# Configure VPC
aws ec2 create-vpc \
  --cidr-block 10.0.0.0/16 \
  --tag-specifications 'ResourceType=vpc,Tags=[{Key=Name,Value=fleet-tracking-vpc}]'

# Set up RDS
aws rds create-db-instance \
  --db-instance-identifier fleet-tracking-db \
  --db-instance-class db.r6g.large \
  --engine postgres \
  --master-username admin \
  --master-user-password <password> \
  --allocated-storage 100
```

### Container Registry Setup

```bash
# Create ECR repositories
aws ecr create-repository \
  --repository-name fleet-tracking/backend-api \
  --image-scanning-configuration scanOnPush=true

aws ecr create-repository \
  --repository-name fleet-tracking/analytics \
  --image-scanning-configuration scanOnPush=true
```

## 4. Container Configuration

### Development Environment

```bash
# Start development environment
docker-compose up -d

# Initialize databases
docker-compose exec postgres psql -U fleet_user -d fleet_db -f /docker-entrypoint-initdb.d/init.sql
docker-compose exec mongodb mongosh --eval "rs.initiate()"
```

### Production Container Build

```bash
# Build API service
docker build -t fleet-tracking/backend-api:latest \
  --target production \
  --build-arg NODE_ENV=production .

# Build Analytics service
docker build -t fleet-tracking/analytics:latest \
  -f Dockerfile.analytics .
```

## 5. Kubernetes Deployment

### Namespace Setup

```bash
# Create namespaces
kubectl create namespace fleet-tracking-prod
kubectl create namespace fleet-tracking-staging

# Apply resource quotas
kubectl apply -f kubernetes/quotas.yaml
```

### Service Deployment

```bash
# Apply configurations
kubectl apply -f kubernetes/configmap.yaml
kubectl apply -f kubernetes/secret.yaml
kubectl apply -f kubernetes/deployment.yaml
kubectl apply -f kubernetes/service.yaml
kubectl apply -f kubernetes/ingress.yaml

# Verify deployment
kubectl get pods -n fleet-tracking-prod
kubectl get services -n fleet-tracking-prod
```

## 6. Database Setup

### PostgreSQL Configuration

```sql
-- Initialize database schema
CREATE DATABASE fleet_tracking;
\c fleet_tracking

-- Create extensions
CREATE EXTENSION postgis;
CREATE EXTENSION pg_stat_statements;

-- Set up replication
ALTER SYSTEM SET wal_level = logical;
ALTER SYSTEM SET max_replication_slots = 10;
```

### MongoDB Setup

```javascript
// Initialize replica set
rs.initiate({
  _id: "rs0",
  members: [
    { _id: 0, host: "mongodb-0.mongodb:27017" },
    { _id: 1, host: "mongodb-1.mongodb:27017" },
    { _id: 2, host: "mongodb-2.mongodb:27017" }
  ]
});

// Create indexes
db.locations.createIndex({ "timestamp": 1 });
db.locations.createIndex({ "vehicleId": 1 });
db.locations.createIndex({ 
  "location": "2dsphere"
});
```

## 7. Monitoring Setup

### Prometheus Configuration

```yaml
# prometheus.yml
global:
  scrape_interval: 15s
  evaluation_interval: 15s

scrape_configs:
  - job_name: 'fleet-tracking-backend'
    kubernetes_sd_configs:
      - role: pod
    relabel_configs:
      - source_labels: [__meta_kubernetes_pod_label_app]
        regex: fleet-tracking
        action: keep
```

### Grafana Dashboard Setup

```bash
# Install Grafana operator
helm repo add grafana https://grafana.github.io/helm-charts
helm install grafana grafana/grafana \
  --namespace monitoring \
  --set persistence.enabled=true

# Import dashboards
kubectl apply -f monitoring/dashboards/
```

## 8. Security Configuration

### TLS Configuration

```bash
# Install cert-manager
kubectl apply -f https://github.com/cert-manager/cert-manager/releases/download/v1.9.1/cert-manager.yaml

# Create certificate
kubectl apply -f - <<EOF
apiVersion: cert-manager.io/v1
kind: Certificate
metadata:
  name: fleet-tracking-tls
  namespace: fleet-tracking-prod
spec:
  secretName: fleet-tracking-tls
  issuerRef:
    name: letsencrypt-prod
    kind: ClusterIssuer
  dnsNames:
  - api.fleettracking.com
EOF
```

### Network Policies

```yaml
# network-policy.yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: backend-network-policy
  namespace: fleet-tracking-prod
spec:
  podSelector:
    matchLabels:
      app: fleet-tracking
  policyTypes:
  - Ingress
  - Egress
  ingress:
  - from:
    - namespaceSelector:
        matchLabels:
          name: fleet-tracking-prod
    ports:
    - protocol: TCP
      port: 3000
```

## 9. Deployment Procedures

### Pre-deployment Checklist
1. Verify infrastructure readiness
2. Check database backups
3. Update configuration values
4. Review security settings
5. Test monitoring setup

### Deployment Steps

```bash
# 1. Update container images
docker push fleet-tracking/backend-api:latest
docker push fleet-tracking/analytics:latest

# 2. Apply database migrations
kubectl apply -f kubernetes/jobs/migrations.yaml

# 3. Deploy services
kubectl apply -k overlays/production

# 4. Verify deployment
kubectl rollout status deployment/backend-services -n fleet-tracking-prod

# 5. Run smoke tests
./scripts/smoke-tests.sh production
```

## 10. Scaling Guidelines

### Horizontal Pod Autoscaling

```bash
# Configure HPA
kubectl apply -f - <<EOF
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: backend-hpa
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: backend-services
  minReplicas: 3
  maxReplicas: 10
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70
EOF
```

### Database Scaling

```bash
# Add read replicas
aws rds create-db-instance-read-replica \
  --db-instance-identifier fleet-tracking-reader \
  --source-db-instance-identifier fleet-tracking-db

# Scale MongoDB replica set
kubectl scale statefulset mongodb --replicas=5
```

## 11. Backup and Recovery

### Automated Backups

```bash
# Configure automated snapshots
aws rds modify-db-instance \
  --db-instance-identifier fleet-tracking-db \
  --backup-retention-period 7 \
  --preferred-backup-window "03:00-04:00"

# MongoDB backups
kubectl apply -f kubernetes/cronjobs/mongodb-backup.yaml
```

### Recovery Procedures

```bash
# Restore RDS snapshot
aws rds restore-db-instance-from-db-snapshot \
  --db-instance-identifier fleet-tracking-restore \
  --db-snapshot-identifier fleet-tracking-backup

# Restore MongoDB backup
kubectl exec -it mongodb-0 -- mongorestore \
  --uri="mongodb://user:pass@mongodb:27017" \
  --archive=/backup/mongodb-backup.gz
```

## 12. Troubleshooting

### Common Issues

1. Pod Startup Failures
```bash
# Check pod status
kubectl describe pod <pod-name>
kubectl logs <pod-name> --previous

# Check events
kubectl get events --sort-by=.metadata.creationTimestamp
```

2. Database Connection Issues
```bash
# Verify connectivity
kubectl exec -it <pod-name> -- nc -zv postgresql 5432
kubectl exec -it <pod-name> -- nc -zv mongodb 27017

# Check logs
kubectl logs -l app=fleet-tracking -c api-service
```

3. Performance Issues
```bash
# Monitor resource usage
kubectl top pods
kubectl top nodes

# Check metrics
curl -X GET http://localhost:9090/metrics
```

### Health Checks

```bash
# API health check
curl -X GET https://api.fleettracking.com/health

# Database health check
kubectl exec -it postgres-0 -- pg_isready
kubectl exec -it mongodb-0 -- mongosh --eval "db.adminCommand('ping')"
```