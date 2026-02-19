# AfriCoin Backend - Local Development & Docker Guide

## Table of Contents
1. [Local Development Setup](#local-development-setup)
2. [Docker Development](#docker-development)
3. [Docker Compose](#docker-compose)
4. [Production Docker Deployment](#production-docker-deployment)
5. [Kubernetes Deployment](#kubernetes-deployment)

---

## Local Development Setup

### Prerequisites
- Node.js 18+ (download from https://nodejs.org/)
- PostgreSQL 12+ installed and running
- Redis installed and running
- Git

### Step 1: Clone Repository
```bash
git clone https://github.com/your-repo/africoin-backend.git
cd africoin-backend
```

### Step 2: Install Dependencies
```bash
npm install
```

### Step 3: Setup Database

#### Option A: PostgreSQL Local
```bash
# Create database
createdb africoindb

# In your terminal/client:
psql africoindb

# Create schema (run in psql):
CREATE TABLE public.users (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  -- Add other columns as per models
);

# Or use the initialization script:
npm run db:init
```

#### Option B: Docker PostgreSQL (Recommended)
```bash
# Skip to Docker Compose section below
```

### Step 4: Environment Configuration

Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```

Update `.env` with local values:
```env
# App
NODE_ENV=development
PORT=3001
BASE_URL=http://localhost:3001

# Database
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/africoindb

# JWT
JWT_SECRET=your-development-secret-key
JWT_EXPIRY=7d

# Redis
REDIS_URL=redis://localhost:6379

# Stripe (get from Stripe Dashboard)
STRIPE_PUBLIC_KEY=pk_test_xxx
STRIPE_SECRET_KEY=sk_test_xxx
STRIPE_IDENTITY_WEBHOOK_SECRET=whsec_test_xxx

# PayFast (South African payments)
PAYFAST_MERCHANT_ID=10000100
PAYFAST_MERCHANT_KEY=test-merchant-key
PAYFAST_PASSPHRASE=test-passphrase

# Solana (use Devnet for testing)
SOLANA_RPC_URL=https://api.devnet.solana.com
SOLANA_NETWORK=devnet

# Twilio (SMS)
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=your-auth-token
TWILIO_PHONE_NUMBER=+1234567890

# Email (Gmail with App Password)
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your-email@gmail.com
EMAIL_PASSWORD=your-app-password
EMAIL_FROM=noreply@africoin.com

# Encryption
ENCRYPTION_KEY=your-32-character-encryption-key-here

# Metrics
METRICS_ENABLED=true
HEALTH_CHECK_INTERVAL=30000

# Webhooks
WEBHOOK_SECRET=test-webhook-secret
```

### Step 5: Initialize Database

```bash
# Run migrations
npm run db:migrate

# Seed test data (optional)
npm run db:seed
```

### Step 6: Start Development Server

```bash
# Start with auto-reload
npm run dev

# Or directly start
npm start

# Watch TypeScript compilation
npm run build:watch
```

App will be running at `http://localhost:3001`

---

## Development Server Features

### Hot Reload
Files are automatically recompiled when you make changes (using `ts-node` with watch mode).

### API Documentation
- Swagger UI: http://localhost:3001/api-docs
- Metrics: http://localhost:3001/metrics

### Test Requests
Use `requests.http` file with REST Client extension:
```ini
@baseUrl = http://localhost:3001

### Register User
POST {{baseUrl}}/api/auth/register
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "SecurePass123!",
  "firstName": "John",
  "lastName": "Doe",
  "phoneNumber": "+1234567890"
}

### Login
POST {{baseUrl}}/api/auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "SecurePass123!"
}
```

### Debug Mode
```bash
# Enable verbose logging
DEBUG=* npm start

# Node inspector
node --inspect-brk dist/index.js

# Chrome DevTools: chrome://inspect
```

---

## Local Database Management

### PostgreSQL Commands
```bash
# Connect to database
psql africoindb

# Show tables
\dt

# Show table structure
\d users

# List databases
\l

# Backup database
pg_dump africoindb > backup.sql

# Restore database
psql africoindb < backup.sql

# Drop and recreate
dropdb africoindb
createdb africoindb
npm run db:init
```

### Redis Commands
```bash
# Start Redis (if not running)
redis-server

# Connect to Redis CLI
redis-cli

# View all keys
KEYS *

# Get key value
GET key-name

# Delete key
DEL key-name

# Flush database
FLUSHDB

# Monitor commands in real-time
MONITOR
```

---

## Docker Development

### Build Docker Image Locally
```bash
# Build image
docker build -t africoin-backend:latest .

# Build with build args
docker build \
  --build-arg NODE_ENV=development \
  -t africoin-backend:dev .

# List images
docker images

# Remove image
docker rmi africoin-backend:latest
```

### Run Single Container with PostgreSQL
```bash
# Start PostgreSQL container
docker run -d \
  --name africoin-postgres \
  -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_DB=africoindb \
  -p 5432:5432 \
  postgres:15

# Start Redis container
docker run -d \
  --name africoin-redis \
  -p 6379:6379 \
  redis:7

# Start backend container
docker run -d \
  --name africoin-api \
  --link africoin-postgres:postgres \
  --link africoin-redis:redis \
  -p 3001:3001 \
  -e DATABASE_URL=postgresql://postgres:postgres@postgres:5432/africoindb \
  -e REDIS_URL=redis://redis:6379 \
  africoin-backend:latest

# View logs
docker logs -f africoin-api

# Stop containers
docker stop africoin-api africoin-redis africoin-postgres

# Remove containers
docker rm africoin-api africoin-redis africoin-postgres
```

### Container Networking
```bash
# Create custom network
docker network create africoin-network

# Run containers on network
docker run -d \
  --name africoin-postgres \
  --network africoin-network \
  postgres:15

docker run -d \
  --name africoin-api \
  --network africoin-network \
  -p 3001:3001 \
  africoin-backend:latest

# View network
docker network inspect africoin-network

# Remove network
docker network rm africoin-network
```

---

## Docker Compose

### Development Setup (docker-compose.yml)

The project includes `docker-compose.yml` with all services pre-configured:

```bash
# Start all services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop all services
docker-compose down

# Stop and remove volumes
docker-compose down -v

# Rebuild images
docker-compose up -d --build
```

### Services Include
- **API**: Express backend (port 3001)
- **PostgreSQL**: Database (port 5432)
- **Redis**: Cache (port 6379)
- **pgAdmin**: Database UI (port 5050)

### Access Services Locally
```bash
# API
curl http://localhost:3001/health

# PostgreSQL
psql -h localhost -U postgres -d africoindb

# Redis
redis-cli -h localhost -p 6379

# pgAdmin
http://localhost:5050 (admin@admin.com / admin)
```

### Environment Variables in Docker Compose
The `docker-compose.yml` sets environment variables via `.env` file:
```bash
# Copy environment template
cp .env.docker .env

# Edit as needed
nano .env

# Start services (reads from .env)
docker-compose up -d
```

### Docker Compose Development Workflow
```bash
# 1. Start services
docker-compose up -d

# 2. Run migrations
docker-compose exec api npm run db:migrate

# 3. Seed test data
docker-compose exec api npm run db:seed

# 4. View logs
docker-compose logs -f api

# 5. Execute command in container
docker-compose exec api npm test

# 6. Stop services
docker-compose down
```

---

## Production Docker Deployment

### Dockerfile Best Practices

The project includes optimized `Dockerfile`:

```dockerfile
# Multi-stage build
FROM node:18-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

FROM node:18-alpine
WORKDIR /app
COPY --from=builder /app/node_modules ./node_modules
COPY dist ./dist
COPY package*.json ./

EXPOSE 3001
CMD ["npm", "start"]
```

### Build for Production
```bash
# Build with production tag
docker build -t africoin-backend:1.0.0 .

# Tag for registry
docker tag africoin-backend:1.0.0 registry.example.com/africoin-backend:1.0.0

# Push to registry
docker push registry.example.com/africoin-backend:1.0.0
```

### Production Docker Compose
Create `docker-compose.prod.yml`:

```yaml
version: '3.8'

services:
  api:
    image: registry.example.com/africoin-backend:1.0.0
    restart: always
    ports:
      - "3001:3001"
    environment:
      NODE_ENV: production
      DATABASE_URL: postgresql://${DB_USER}:${DB_PASSWORD}@db:5432/${DB_NAME}
      REDIS_URL: redis://redis:6379
      JWT_SECRET: ${JWT_SECRET}
      STRIPE_SECRET_KEY: ${STRIPE_SECRET_KEY}
    depends_on:
      - db
      - redis
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3001/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s

  db:
    image: postgres:15-alpine
    restart: always
    environment:
      POSTGRES_USER: ${DB_USER}
      POSTGRES_PASSWORD: ${DB_PASSWORD}
      POSTGRES_DB: ${DB_NAME}
    volumes:
      - db-data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ${DB_USER}"]
      interval: 10s
      timeout: 5s
      retries: 5

  redis:
    image: redis:7-alpine
    restart: always
    volumes:
      - redis-data:/data
    command: redis-server --appendonly yes

volumes:
  db-data:
  redis-data:
```

Deploy with:
```bash
docker-compose -f docker-compose.prod.yml up -d
```

---

## Kubernetes Deployment

### Prerequisites
- Docker image pushed to registry
- kubectl configured
- Kubernetes cluster running

### Kubernetes Manifests

Create `k8s/namespace.yaml`:
```yaml
apiVersion: v1
kind: Namespace
metadata:
  name: africoin
```

Create `k8s/configmap.yaml`:
```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  namespace: africoin
  name: africoin-config
data:
  NODE_ENV: production
  PORT: "3001"
```

Create `k8s/secret.yaml`:
```yaml
apiVersion: v1
kind: Secret
metadata:
  namespace: africoin
  name: africoin-secrets
type: Opaque
stringData:
  DATABASE_URL: postgresql://user:pass@db:5432/africoindb
  JWT_SECRET: your-jwt-secret
  STRIPE_SECRET_KEY: sk_live_xxx
  REDIS_URL: redis://redis:6379
```

Create `k8s/deployment.yaml`:
```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  namespace: africoin
  name: africoin-api
  labels:
    app: africoin-api
spec:
  replicas: 3
  selector:
    matchLabels:
      app: africoin-api
  template:
    metadata:
      labels:
        app: africoin-api
    spec:
      containers:
      - name: api
        image: registry.example.com/africoin-backend:1.0.0
        imagePullPolicy: Always
        ports:
        - containerPort: 3001
        envFrom:
        - configMapRef:
            name: africoin-config
        - secretRef:
            name: africoin-secrets
        resources:
          requests:
            memory: "512Mi"
            cpu: "250m"
          limits:
            memory: "1Gi"
            cpu: "500m"
        livenessProbe:
          httpGet:
            path: /health
            port: 3001
          initialDelaySeconds: 30
          periodSeconds: 10
          timeoutSeconds: 5
          failureThreshold: 3
        readinessProbe:
          httpGet:
            path: /health
            port: 3001
          initialDelaySeconds: 10
          periodSeconds: 5
          timeoutSeconds: 3
          failureThreshold: 2
```

Create `k8s/service.yaml`:
```yaml
apiVersion: v1
kind: Service
metadata:
  namespace: africoin
  name: africoin-api-service
spec:
  selector:
    app: africoin-api
  ports:
  - protocol: TCP
    port: 3001
    targetPort: 3001
  type: LoadBalancer
```

### Deploy to Kubernetes
```bash
# Create namespace
kubectl apply -f k8s/namespace.yaml

# Create secrets and configmaps
kubectl apply -f k8s/secret.yaml
kubectl apply -f k8s/configmap.yaml

# Deploy application
kubectl apply -f k8s/deployment.yaml
kubectl apply -f k8s/service.yaml

# View deployment status
kubectl get deployments -n africoin
kubectl get pods -n africoin
kubectl get svc -n africoin

# View logs
kubectl logs -n africoin -l app=africoin-api -f

# Scale deployment
kubectl scale deployment africoin-api --replicas=5 -n africoin

# Update image
kubectl set image deployment/africoin-api api=registry.example.com/africoin-backend:2.0.0 -n africoin

# Rollback
kubectl rollout undo deployment/africoin-api -n africoin
```

### Kubernetes Monitoring
```bash
# View resource usage
kubectl top nodes -n africoin
kubectl top pods -n africoin

# View events
kubectl get events -n africoin

# Describe pod
kubectl describe pod POD_NAME -n africoin

# Get logs from previous pod
kubectl logs POD_NAME --previous -n africoin
```

---

## Common Development Tasks

### Database Seeding
```bash
npm run db:seed
```

### Running Tests
```bash
# Run all tests
npm test

# Run specific test file
npm test -- auth.test.ts

# Run with coverage
npm test -- --coverage

# Watch mode
npm test -- --watch
```

### Linting
```bash
# Check code style
npm run lint

# Fix linting issues
npm run lint:fix
```

### Build for Production
```bash
# Compile TypeScript
npm run build

# View compiled files
ls -la dist/
```

### View API Documentation
```
http://localhost:3001/api-docs
```

### Generate API Metrics
```
http://localhost:3001/metrics
```

---

## Performance Optimization

### Local Development
```bash
# Use fast refresh during development
npm run dev

# Build with source maps
npm run build:dev

# Profile application
node --prof dist/index.js
node --prof-process isolate-*.log > profile.txt
```

### Docker Optimization
```bash
# Multi-stage build reduces image size
docker build -t africoin-backend:optimized .

# Compare image sizes
docker images africoin-backend
```

### Database Optimization
```bash
# Create indexes
psql africoindb
CREATE INDEX idx_user_email ON users(email);
CREATE INDEX idx_transaction_user_id ON transactions(user_id);

# Analyze query performance
EXPLAIN ANALYZE SELECT * FROM users WHERE email = 'test@example.com';
```

---

## Troubleshooting

### Port Already in Use
```bash
# Find process using port 3001
lsof -i :3001

# Kill process
kill -9 PID

# Or use different port
PORT=3002 npm start
```

### Database Connection Failed
```bash
# Check if PostgreSQL is running
ps aux | grep postgres

# Test connection
psql -h localhost -U postgres -d africoindb

# Check connection string
echo $DATABASE_URL
```

### Redis Connection Failed
```bash
# Check if Redis is running
ps aux | grep redis

# Test connection
redis-cli ping

# Start Redis
redis-server
```

### Docker Container Exit
```bash
# View exit code
docker ps -l

# Check logs
docker logs CONTAINER_ID

# Keep container running
docker run -it CONTAINER_ID /bin/sh
```

### Rebuild Everything Fresh
```bash
# Remove all containers and volumes
docker-compose down -v

# Rebuild images
docker-compose build --no-cache

# Start fresh
docker-compose up -d

# Reinitialize database
docker-compose exec api npm run db:init
```

---

## Environment-Specific Configurations

### Development
```bash
NODE_ENV=development
DEBUG=*
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/africoindb-dev
LOG_LEVEL=debug
```

### Testing
```bash
NODE_ENV=test
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/africoindb-test
REDIS_URL=redis://localhost:6380
LOG_LEVEL=error
```

### Production
```bash
NODE_ENV=production
DATABASE_URL=postgresql://user:pass@prod-db:5432/africoindb
REDIS_URL=redis://prod-cache:6379
LOG_LEVEL=warn
```

---

## Support

For issues with local development, check:
- GitHub Issues
- Documentation: GUIDE.md
- API Documentation: http://localhost:3001/api-docs
