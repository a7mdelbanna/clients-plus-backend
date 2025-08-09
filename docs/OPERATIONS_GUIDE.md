# Clients+ Operations Guide

## Table of Contents
1. [Deployment Procedures](#deployment-procedures)
2. [Monitoring Setup](#monitoring-setup)
3. [Backup Strategies](#backup-strategies)
4. [Scaling Guidelines](#scaling-guidelines)
5. [Troubleshooting Guide](#troubleshooting-guide)
6. [Emergency Procedures](#emergency-procedures)
7. [Performance Optimization](#performance-optimization)
8. [Security Operations](#security-operations)

## Deployment Procedures

### Production Deployment

#### Prerequisites
- [ ] All tests passing (unit, integration, e2e)
- [ ] Security audit complete
- [ ] Performance benchmarks met
- [ ] Database migrations ready
- [ ] Environment variables configured
- [ ] SSL certificates valid
- [ ] Monitoring systems ready

#### Standard Deployment Process

1. **Pre-deployment Checks**
```bash
# Run full test suite
npm run test:all

# Check code quality
npm run lint
npm run type-check

# Validate environment
npm run env:validate

# Test database connection
npm run db:test-connection
```

2. **Database Migrations**
```bash
# Backup current database
npm run db:backup

# Run migrations
npm run db:migrate:prod

# Validate migrations
npm run db:validate
```

3. **Application Deployment**
```bash
# Build production assets
npm run build

# Deploy to production
npm run deploy:prod

# Health check
curl https://api.clients-plus.com/api/v1/health
```

#### Zero-Downtime Deployment

1. **Blue-Green Deployment**
```bash
# Deploy to staging environment (green)
npm run deploy:staging

# Run smoke tests
npm run test:smoke:staging

# Switch traffic to green environment
npm run switch:traffic:green

# Monitor for 10 minutes
npm run monitor:deployment

# Decommission blue environment
npm run cleanup:blue
```

2. **Rolling Deployment**
```bash
# Deploy to 25% of instances
npm run deploy:rolling:25

# Monitor health metrics
npm run monitor:health

# Deploy to 50% of instances
npm run deploy:rolling:50

# Deploy to 100% of instances
npm run deploy:rolling:100
```

### Environment Management

#### Development Environment
```bash
# Setup development environment
npm install
cp .env.example .env.development
npm run db:setup:dev
npm run seed:dev
npm start
```

#### Staging Environment
```bash
# Deploy to staging
npm run deploy:staging

# Run integration tests
npm run test:integration:staging

# Load test data
npm run seed:staging
```

#### Production Environment
```bash
# Production deployment
npm run deploy:prod

# Verify deployment
npm run verify:prod

# Update monitoring dashboards
npm run monitoring:update
```

## Monitoring Setup

### Application Performance Monitoring (APM)

#### Key Metrics to Monitor

**System Metrics**
- CPU Usage (Target: <60%)
- Memory Usage (Target: <70%)
- Disk Usage (Target: <80%)
- Network I/O
- Load Average

**Application Metrics**
- Response Time (Target: <500ms p95)
- Throughput (Requests/second)
- Error Rate (Target: <0.5%)
- Active Connections
- Queue Length

**Business Metrics**
- Appointment Creation Rate
- Booking Success Rate
- Payment Processing Rate
- User Session Duration
- Feature Usage Statistics

#### Monitoring Tools Configuration

**1. Prometheus + Grafana Setup**
```yaml
# docker-compose.monitoring.yml
version: '3.8'
services:
  prometheus:
    image: prom/prometheus
    ports:
      - "9090:9090"
    volumes:
      - ./monitoring/prometheus.yml:/etc/prometheus/prometheus.yml

  grafana:
    image: grafana/grafana
    ports:
      - "3001:3000"
    environment:
      - GF_SECURITY_ADMIN_PASSWORD=secure_password
    volumes:
      - grafana-storage:/var/lib/grafana
```

**2. Custom Metrics Implementation**
```typescript
// src/middleware/metrics.middleware.ts
import { Request, Response, NextFunction } from 'express';
import { register, Counter, Histogram } from 'prom-client';

const httpRequestsTotal = new Counter({
  name: 'http_requests_total',
  help: 'Total HTTP requests',
  labelNames: ['method', 'route', 'status_code']
});

const httpRequestDuration = new Histogram({
  name: 'http_request_duration_seconds',
  help: 'HTTP request duration in seconds',
  labelNames: ['method', 'route']
});

export const metricsMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const startTime = Date.now();
  
  res.on('finish', () => {
    const duration = (Date.now() - startTime) / 1000;
    httpRequestsTotal.inc({
      method: req.method,
      route: req.route?.path || req.path,
      status_code: res.statusCode
    });
    
    httpRequestDuration.observe({
      method: req.method,
      route: req.route?.path || req.path
    }, duration);
  });
  
  next();
};
```

**3. Health Check Endpoint**
```typescript
// src/routes/health.routes.ts
import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { RedisService } from '../services/redis.service';

const router = Router();
const prisma = new PrismaClient();
const redis = new RedisService();

router.get('/health', async (req, res) => {
  const health = {
    status: 'ok',
    timestamp: new Date().toISOString(),
    services: {
      database: 'checking',
      redis: 'checking',
      memory: process.memoryUsage(),
      uptime: process.uptime()
    }
  };

  try {
    // Check database
    await prisma.$queryRaw`SELECT 1`;
    health.services.database = 'connected';
  } catch (error) {
    health.services.database = 'error';
    health.status = 'error';
  }

  try {
    // Check Redis
    await redis.ping();
    health.services.redis = 'connected';
  } catch (error) {
    health.services.redis = 'error';
    health.status = 'error';
  }

  const statusCode = health.status === 'ok' ? 200 : 503;
  res.status(statusCode).json(health);
});
```

### Log Management

#### Centralized Logging Setup
```typescript
// src/config/logger.ts
import winston from 'winston';
import { ElasticsearchTransport } from 'winston-elasticsearch';

const esTransport = new ElasticsearchTransport({
  level: 'info',
  clientOpts: { node: process.env.ELASTICSEARCH_URL },
  index: 'clients-plus-logs'
});

export const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
    new winston.transports.File({ filename: 'logs/combined.log' }),
    esTransport
  ]
});
```

#### Structured Logging
```typescript
// Example usage throughout application
logger.info('Appointment created', {
  appointmentId,
  clientId,
  staffId,
  companyId,
  timestamp: new Date().toISOString(),
  action: 'appointment_created'
});

logger.error('Database connection failed', {
  error: error.message,
  stack: error.stack,
  timestamp: new Date().toISOString(),
  action: 'database_error'
});
```

### Alert Configuration

#### Critical Alerts
```yaml
# alerts.yml
groups:
- name: clients-plus-critical
  rules:
  - alert: HighErrorRate
    expr: rate(http_requests_total{status_code=~"5.."}[5m]) > 0.05
    for: 2m
    annotations:
      summary: "High error rate detected"
      
  - alert: DatabaseConnectionFailure
    expr: up{job="postgres"} == 0
    for: 1m
    annotations:
      summary: "Database connection lost"
      
  - alert: HighResponseTime
    expr: histogram_quantile(0.95, http_request_duration_seconds) > 1.0
    for: 3m
    annotations:
      summary: "High response time detected"
```

## Backup Strategies

### Database Backup

#### Automated Daily Backups
```bash
#!/bin/bash
# scripts/backup-database.sh

DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/backups/database"
DB_NAME="clients_plus_prod"

# Create backup directory
mkdir -p $BACKUP_DIR

# Create database backup
pg_dump -h $DB_HOST -U $DB_USER -d $DB_NAME | gzip > $BACKUP_DIR/backup_$DATE.sql.gz

# Upload to S3
aws s3 cp $BACKUP_DIR/backup_$DATE.sql.gz s3://clients-plus-backups/database/

# Keep only last 30 days locally
find $BACKUP_DIR -name "backup_*.sql.gz" -mtime +30 -delete

# Verify backup integrity
gunzip -t $BACKUP_DIR/backup_$DATE.sql.gz
```

#### Point-in-Time Recovery Setup
```sql
-- Enable WAL archiving in PostgreSQL
ALTER SYSTEM SET wal_level = 'replica';
ALTER SYSTEM SET archive_mode = 'on';
ALTER SYSTEM SET archive_command = 'test ! -f /archive/%f && cp %p /archive/%f';
```

#### Backup Restoration Process
```bash
# Restore from specific backup
gunzip -c /backups/database/backup_20240809_120000.sql.gz | psql -h $DB_HOST -U $DB_USER -d $DB_NAME

# Point-in-time recovery
pg_basebackup -D /var/lib/postgresql/backup -Ft -z -P
```

### Application Backup

#### Code Repository Backup
```bash
# Automated Git repository backup
git clone --mirror https://github.com/company/clients-plus-backend.git
tar -czf clients-plus-backup-$(date +%Y%m%d).tar.gz clients-plus-backend.git/
```

#### Configuration Backup
```bash
# Backup environment configurations
kubectl get configmaps -o yaml > configmaps-backup-$(date +%Y%m%d).yaml
kubectl get secrets -o yaml > secrets-backup-$(date +%Y%m%d).yaml
```

### Disaster Recovery Plan

#### RTO/RPO Targets
- **RTO (Recovery Time Objective)**: 4 hours
- **RPO (Recovery Point Objective)**: 15 minutes

#### Recovery Steps
1. **Assess Damage** (15 minutes)
2. **Restore Database** (2 hours)
3. **Deploy Application** (30 minutes)
4. **Verify System Health** (1 hour)
5. **Update DNS/Load Balancer** (15 minutes)

## Scaling Guidelines

### Horizontal Scaling

#### Application Scaling
```bash
# Scale application instances
docker-compose up --scale app=3

# Kubernetes scaling
kubectl scale deployment clients-plus-api --replicas=5

# Auto-scaling configuration
kubectl autoscale deployment clients-plus-api --cpu-percent=70 --min=2 --max=10
```

#### Database Scaling
```sql
-- Read replicas for scaling read operations
-- Primary database handles writes
-- Replica databases handle read queries

-- Connection routing in application
const readConnection = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_READ_URL
    }
  }
});

const writeConnection = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_WRITE_URL
    }
  }
});
```

### Vertical Scaling

#### Resource Optimization
```yaml
# docker-compose.yml resource limits
services:
  app:
    image: clients-plus-api
    deploy:
      resources:
        limits:
          memory: 1G
          cpus: '0.5'
        reservations:
          memory: 512M
          cpus: '0.25'
```

#### Performance Tuning
```typescript
// Database connection pooling
const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL
    }
  },
  log: ['query', 'info', 'warn', 'error'],
  __internal: {
    engine: {
      endpoint: process.env.DATABASE_URL,
      datamodel: datamodel,
      logQueries: true,
      allowTriggerPanic: false,
    }
  }
});
```

### Load Balancing

#### Nginx Configuration
```nginx
upstream clients_plus_api {
    least_conn;
    server app1:3000 weight=3;
    server app2:3000 weight=2;
    server app3:3000 weight=1;
}

server {
    listen 443 ssl http2;
    server_name api.clients-plus.com;

    location /api/ {
        proxy_pass http://clients_plus_api;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # WebSocket support
    location /socket.io/ {
        proxy_pass http://clients_plus_api;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}
```

## Troubleshooting Guide

### Common Issues and Solutions

#### 1. High Response Times

**Symptoms:**
- API responses taking >1 second
- Client timeouts
- Poor user experience

**Investigation Steps:**
```bash
# Check system resources
htop
iostat -x 1

# Monitor database queries
tail -f logs/slow-query.log

# Check application metrics
curl http://localhost:3000/metrics
```

**Solutions:**
```sql
-- Optimize database queries
EXPLAIN ANALYZE SELECT * FROM appointments WHERE date = '2024-08-09';

-- Add missing indexes
CREATE INDEX idx_appointments_date ON appointments(date);
CREATE INDEX idx_appointments_staff_date ON appointments(staff_id, date);
```

#### 2. Database Connection Issues

**Symptoms:**
- Connection timeout errors
- "Too many connections" errors
- Intermittent database failures

**Investigation:**
```sql
-- Check active connections
SELECT * FROM pg_stat_activity;

-- Check connection limits
SHOW max_connections;
```

**Solutions:**
```typescript
// Implement connection pooling
const prisma = new PrismaClient({
  datasources: {
    db: {
      url: `${process.env.DATABASE_URL}?connection_limit=10&pool_timeout=20`
    }
  }
});
```

#### 3. WebSocket Connection Problems

**Symptoms:**
- Real-time updates not working
- WebSocket connections dropping
- Client reconnection loops

**Investigation:**
```bash
# Check WebSocket metrics
curl http://localhost:3000/socket.io/socket.io.js

# Monitor connection count
netstat -an | grep :3000 | wc -l
```

**Solutions:**
```typescript
// Implement connection management
io.engine.on("connection_error", (err) => {
  console.log(err.req);
  console.log(err.code);
  console.log(err.message);
  console.log(err.context);
});
```

#### 4. Memory Leaks

**Symptoms:**
- Increasing memory usage over time
- Application crashes with OOM errors
- Slow performance degradation

**Investigation:**
```bash
# Monitor memory usage
ps aux | grep node
pmap -d <process_id>

# Generate heap dump
kill -USR2 <process_id>
```

**Solutions:**
```typescript
// Implement proper cleanup
process.on('SIGTERM', async () => {
  await prisma.$disconnect();
  await redis.quit();
  server.close(() => {
    process.exit(0);
  });
});
```

### Performance Debugging

#### Query Performance Analysis
```sql
-- Enable query logging
ALTER SYSTEM SET log_statement = 'all';
ALTER SYSTEM SET log_min_duration_statement = 1000; -- Log queries > 1s

-- Analyze slow queries
SELECT query, mean_time, calls, total_time 
FROM pg_stat_statements 
ORDER BY mean_time DESC 
LIMIT 10;
```

#### Application Performance Profiling
```typescript
// Add performance tracking
const startTime = Date.now();

// Your code here

const endTime = Date.now();
logger.info('Operation completed', {
  operation: 'appointment_creation',
  duration: endTime - startTime,
  timestamp: new Date().toISOString()
});
```

## Emergency Procedures

### Incident Response Plan

#### Severity Levels

**P0 - Critical (Response: Immediate)**
- Complete system outage
- Data corruption
- Security breach
- Payment processing failure

**P1 - High (Response: 30 minutes)**
- Partial system unavailability
- Significant performance degradation
- API endpoint failures

**P2 - Medium (Response: 2 hours)**
- Minor feature issues
- Non-critical bugs
- Performance concerns

**P3 - Low (Response: Next business day)**
- Enhancement requests
- Documentation updates
- Minor improvements

#### Emergency Response Steps

1. **Immediate Assessment (5 minutes)**
```bash
# Quick health check
curl -f https://api.clients-plus.com/api/v1/health || echo "SYSTEM DOWN"

# Check system metrics
kubectl get pods
docker ps
```

2. **Incident Communication (10 minutes)**
```markdown
## Incident Alert
**Time**: YYYY-MM-DD HH:MM UTC
**Severity**: P0/P1/P2/P3
**Status**: Investigating/Identified/Monitoring/Resolved
**Impact**: Description of user impact
**ETA**: Estimated resolution time
```

3. **Immediate Mitigation (15 minutes)**
```bash
# Rollback to previous version if needed
kubectl rollout undo deployment/clients-plus-api

# Scale up resources if capacity issue
kubectl scale deployment clients-plus-api --replicas=10

# Enable maintenance mode if necessary
kubectl apply -f maintenance-mode.yaml
```

### Rollback Procedures

#### Application Rollback
```bash
# Docker deployment rollback
docker-compose down
docker-compose -f docker-compose.backup.yml up -d

# Kubernetes rollback
kubectl rollout undo deployment/clients-plus-api
kubectl rollout status deployment/clients-plus-api
```

#### Database Rollback
```bash
# Restore from backup
pg_restore -d clients_plus_prod /backups/pre-deployment-backup.sql

# Apply rollback migrations
npm run db:rollback
```

### Security Incident Response

#### Security Breach Protocol
1. **Immediate Actions**
   - Isolate affected systems
   - Preserve evidence
   - Change all credentials
   - Enable additional logging

2. **Assessment**
   - Determine scope of breach
   - Identify compromised data
   - Document timeline

3. **Containment**
   - Patch vulnerabilities
   - Update security rules
   - Monitor for continued threats

4. **Recovery**
   - Restore from clean backups
   - Implement additional security measures
   - Update incident response procedures

## Performance Optimization

### Database Optimization

#### Query Optimization
```sql
-- Optimize appointment queries
CREATE INDEX CONCURRENTLY idx_appointments_compound 
ON appointments(company_id, branch_id, date, status);

-- Optimize client searches
CREATE INDEX CONCURRENTLY idx_clients_search 
ON clients USING gin(to_tsvector('english', name || ' ' || email || ' ' || phone));
```

#### Connection Pool Tuning
```typescript
// Prisma connection pool optimization
const prisma = new PrismaClient({
  datasources: {
    db: {
      url: `${process.env.DATABASE_URL}?connection_limit=20&pool_timeout=60`
    }
  }
});
```

### Caching Strategy

#### Redis Caching Implementation
```typescript
// Cache frequently accessed data
const cacheKey = `availability:${branchId}:${date}`;
const cached = await redis.get(cacheKey);

if (cached) {
  return JSON.parse(cached);
}

const availability = await calculateAvailability(branchId, date);
await redis.setex(cacheKey, 300, JSON.stringify(availability)); // 5 minutes
```

#### CDN Configuration
```nginx
# Nginx CDN-style caching
location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg)$ {
    expires 1y;
    add_header Cache-Control "public, immutable";
    add_header Vary Accept-Encoding;
    access_log off;
}
```

This operations guide provides comprehensive procedures for managing the Clients+ system in production. Regular review and updates of these procedures ensure optimal system performance and reliability.