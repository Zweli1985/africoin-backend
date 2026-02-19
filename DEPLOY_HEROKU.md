# AfriCoin Backend - Heroku Deployment Guide

## Prerequisites

- Heroku account (free or paid)
- Heroku CLI installed
- Git installed
- GitHub repository

---

## Quick Start (5 minutes)

### Step 1: Login to Heroku
```bash
heroku login
```

### Step 2: Create Heroku App
```bash
heroku create africoin-api
```

### Step 3: Add PostgreSQL Add-on
```bash
heroku addons:create heroku-postgresql:standard-0 -a africoin-api
```

### Step 4: Set Environment Variables
```bash
heroku config:set NODE_ENV=production -a africoin-api
heroku config:set JWT_SECRET=your-secret-key -a africoin-api
heroku config:set STRIPE_PUBLIC_KEY=pk_live_xxx -a africoin-api
heroku config:set STRIPE_SECRET_KEY=sk_live_xxx -a africoin-api
heroku config:set PAYFAST_MERCHANT_ID=xxx -a africoin-api
heroku config:set STRIPE_IDENTITY_WEBHOOK_SECRET=whsec_xxx -a africoin-api
heroku config:set SOLANA_RPC_URL=https://api.mainnet-beta.solana.com -a africoin-api
heroku config:set REDIS_URL=redis://... -a africoin-api
heroku config:set ENCRYPTION_KEY=your-encryption-key -a africoin-api
heroku config:set TWILIO_ACCOUNT_SID=xxx -a africoin-api
heroku config:set TWILIO_AUTH_TOKEN=xxx -a africoin-api
heroku config:set TWILIO_PHONE_NUMBER=+1234567890 -a africoin-api
heroku config:set METRICS_ENABLED=true -a africoin-api
heroku config:set WEBHOOK_SECRET=your-webhook-secret -a africoin-api
heroku config:set EMAIL_HOST=smtp.gmail.com -a africoin-api
heroku config:set EMAIL_PORT=587 -a africoin-api
heroku config:set EMAIL_USER=your-email@gmail.com -a africoin-api
heroku config:set EMAIL_PASSWORD=your-app-password -a africoin-api
heroku config:set EMAIL_FROM=noreply@africoin.com -a africoin-api
```

### Step 5: Deploy
```bash
git push heroku main
```

### Step 6: Run Migrations
```bash
heroku run npm run db:migrate -a africoin-api
```

### Step 7: View Application
```bash
heroku open -a africoin-api
```

---

## Detailed Setup Guide

### Database Configuration

#### Option 1: Heroku PostgreSQL (Recommended)
```bash
# Create database
heroku addons:create heroku-postgresql:standard-4 -a africoin-api

# Get connection info
heroku pg:info -a africoin-api

# Backup database
heroku pg:backups:capture -a africoin-api

# Download backup
heroku pg:backups:download -a africoin-api
```

#### Option 2: External PostgreSQL (AWS RDS, etc.)
```bash
# Set database URL from external provider
heroku config:set DATABASE_URL=postgresql://user:pass@host:5432/db -a africoin-api
```

### Redis Setup

#### Option 1: Heroku Redis (Recommended)
```bash
heroku addons:create heroku-redis:premium-0 -a africoin-api
```

The `REDIS_URL` will be automatically set.

#### Option 2: External Redis
```bash
heroku config:set REDIS_URL=redis://user:pass@host:port -a africoin-api
```

---

## Procfile Configuration

Create `Procfile` at project root:
```
web: npm start
worker: npm run worker
scheduler: npm run scheduler
```

The web process will be used by default.

---

## Environment Variables Management

### View All Variables
```bash
heroku config -a africoin-api
```

### Add/Update Variable
```bash
heroku config:set VARIABLE_NAME=value -a africoin-api
```

### Remove Variable
```bash
heroku config:unset VARIABLE_NAME -a africoin-api
```

### Use Environment File
Create `.env.production`:
```bash
NODE_ENV=production
PORT=8080
DATABASE_URL=...
JWT_SECRET=...
```

### Staging vs Production
```bash
# Create staging app
heroku create africoin-api-staging

# Deploy to staging
git push heroku-staging main

# Promote staging to production
heroku pipelines:promote -a africoin-api-staging
```

---

## Scaling

### Dyno Types
```bash
# Free dynos (sleep after 30 mins of inactivity)
heroku ps:type free -a africoin-api

# Eco dynos ($5/month, shared)
heroku ps:type eco -a africoin-api

# Standard dynos ($50/month, dedicated)
heroku ps:type standard-1x -a africoin-api

# Performance dynos ($250/month, optimized)
heroku ps:type performance-m -a africoin-api
```

### Scaling Dynos
```bash
# Scale web dynos to 3 instances
heroku ps:scale web=3 -a africoin-api

# Scale worker dynos
heroku ps:scale worker=2 -a africoin-api

# Auto-scaling
heroku autoscaling:enable -a africoin-api
heroku autoscaling:config:set --min-quantity=2 --max-quantity=10 -a africoin-api
```

### Check Dyno Status
```bash
heroku ps -a africoin-api
```

---

## Monitoring and Logging

### View Logs
```bash
# Real-time logs
heroku logs --tail -a africoin-api

# Last 50 lines
heroku logs --num=50 -a africoin-api

# Filter by process
heroku logs -p web -a africoin-api

# Export logs
heroku logs --num=10000 -a africoin-api > logs.txt
```

### Add-ons for Monitoring

#### Papertrail (Log Aggregation)
```bash
heroku addons:create papertrail -a africoin-api
heroku addons:open papertrail -a africoin-api
```

#### New Relic (APM)
```bash
heroku addons:create newrelic:wayne -a africoin-api
```

#### Datadog (Monitoring)
```bash
heroku addons:create datadog -a africoin-api
```

---

## CI/CD with GitHub Actions

Create `.github/workflows/heroku-deploy.yml`:

```yaml
name: Deploy to Heroku

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest

    steps:
    - uses: actions/checkout@v2
      with:
        fetch-depth: 0

    - name: Heroku Login
      env:
        HEROKU_API_KEY: ${{ secrets.HEROKU_API_KEY }}
      run: |
        cat > ~/.netrc <<EOF
        machine api.heroku.com
        login ${{ secrets.HEROKU_EMAIL }}
        password ${{ secrets.HEROKU_API_KEY }}
        machine git.heroku.com
        login ${{ secrets.HEROKU_EMAIL }}
        password ${{ secrets.HEROKU_API_KEY }}
        EOF

    - name: Push to Heroku
      env:
        HEROKU_APP_NAME: ${{ secrets.HEROKU_APP_NAME }}
      run: |
        git remote add heroku https://git.heroku.com/$HEROKU_APP_NAME.git
        git push heroku main

    - name: Run Migrations
      env:
        HEROKU_APP_NAME: ${{ secrets.HEROKU_APP_NAME }}
        HEROKU_API_KEY: ${{ secrets.HEROKU_API_KEY }}
      run: |
        curl -n https://api.heroku.com/apps/$HEROKU_APP_NAME/dynos \
          -d "command=npm run db:migrate" \
          -d "size=standard-1x" \
          -X POST \
          -H "Content-Type: application/json" \
          -H "Authorization: Bearer $HEROKU_API_KEY"
```

Add secrets to your GitHub repository:
- `HEROKU_API_KEY`: Your Heroku API key
- `HEROKU_EMAIL`: Your Heroku email
- `HEROKU_APP_NAME`: Your Heroku app name

---

## Custom Domains

### Add Domain
```bash
# Add domain
heroku domains:add api.africoin.com -a africoin-api

# Get CNAME target
heroku domains -a africoin-api
```

### Update DNS Records
In your DNS provider settings:
```
CNAME: api.africoin.com → africoin-api.herokuapp.com
```

Wait for DNS propagation (5-48 hours).

### SSL Certificate
```bash
# Automatic SSL (included with paid dyno)
heroku certs:auto:enable -a africoin-api

# Custom SSL
heroku certs:add server.crt server.key -a africoin-api
```

---

## Backup and Restore

### Database Backups
```bash
# Create backup
heroku pg:backups:capture -a africoin-api

# List backups
heroku pg:backups -a africoin-api

# Download backup
heroku pg:backups:download b001 -a africoin-api

# Restore backup
heroku pg:backups:restore b001 DATABASE_URL -a africoin-api

# Cancel backup
heroku pg:backups:cancel -a africoin-api
```

### Automatic Backups
```bash
# Enable daily backups (for standard+ plans)
heroku pg:backups:schedule --at "02:00 UTC" DATABASE_URL -a africoin-api

# View schedule
heroku pg:backups:schedules -a africoin-api
```

---

## Database Management

### Access Database
```bash
heroku pg:psql -a africoin-api
```

### Database Info
```bash
heroku pg:info -a africoin-api
```

### Reset Database (CAUTION!)
```bash
heroku pg:reset -a africoin-api
```

---

## Performance Optimization

### Connection Pooling
```bash
# Use PgBouncer for connection pooling
heroku buildpacks:add heroku-community/pgbouncer -a africoin-api
```

Set environment variable:
```bash
heroku config:set PGBOUNCER_PREPARED_STATEMENTS=true -a africoin-api
```

### Enable HTTP/2
```bash
heroku config:set NODE_ENV=production -a africoin-api
```

### Add-ons for Performance
```bash
# Memcache for caching
heroku addons:create memcache:5.6 -a africoin-api
```

---

## Cost Management

### Estimate Costs
```bash
heroku ps:type -a africoin-api
heroku addons -a africoin-api
```

### Reduce Costs
1. **Use eco dynos** ($5/month instead of $50)
2. **One-off add-ons**: PostgreSQL Standard 0 is cheaper than Standard 4
3. **Scale down during off-hours** (manual or automated)
4. **Use Heroku Scheduler for background jobs**

### Free Tier Alternatives
```bash
# For development/staging
heroku ps:type free -a africoin-api-staging
heroku addons:create heroku-postgresql:hobby-dev -a africoin-api-staging
```

---

## Troubleshooting

### App Won't Start
```bash
# Check logs
heroku logs --tail -a africoin-api

# Check buildpack
heroku buildpacks -a africoin-api

# Clear buildpack cache
heroku builds:cancel -a africoin-api
```

### High Memory Usage
```bash
# Check memory usage
heroku ps -a africoin-api

# View memory stats
heroku metrics:ps -a africoin-api

# Upgrade dyno
heroku ps:type standard-2x -a africoin-api
```

### Database Connection Issues
```bash
# Check database status
heroku pg:info -a africoin-api

# Verify DATABASE_URL
heroku config:get DATABASE_URL -a africoin-api

# Test connection
heroku pg:psql -c "SELECT version();" -a africoin-api
```

### Slow Queries
```bash
# Enable query analysis
heroku pg:psql -a africoin-api
SELECT * FROM pg_stat_statements ORDER BY mean_time DESC LIMIT 10;
```

---

## Advanced Configuration

### Buildpacks
```bash
# View current buildpacks
heroku buildpacks -a africoin-api

# Add buildpack
heroku buildpacks:add --index 1 nodejs:18 -a africoin-api

# Remove buildpack
heroku buildpacks:remove nodejs:18 -a africoin-api
```

### Config Variables (12-factor app)
```bash
# See all vars
heroku config -a africoin-api

# Set multiple
heroku config:set \
  VAR1=value1 \
  VAR2=value2 \
  VAR3=value3 \
  -a africoin-api
```

### Release Phase
Create `Procfile`:
```
web: npm start
release: npm run db:migrate && npm run seed
```

Runs automatically before web process starts.

---

## Testing Locally Before Deploy

```bash
# Install Heroku CLI add-ons locally
heroku local:run npm test

# Run with Procfile
npm install -g foreman
foreman start

# Simulate production environment
heroku local:run npm start --env .env.production
```

---

## Production Checklist

- [ ] Use standard or performance dynos (not free)
- [ ] Enable automatic backups
- [ ] Set up monitoring (New Relic/Datadog)
- [ ] Configure email service
- [ ] Enable SSL/HTTPS
- [ ] Set custom domain
- [ ] Configure Papertrail for logs
- [ ] Set up CI/CD pipeline
- [ ] Test database restore procedure
- [ ] Monitor costs
- [ ] Set up uptime monitoring
- [ ] Plan for scaling strategy

---

## Migration from Other Platforms

### From AWS to Heroku
```bash
# Export database
aws rds modify-db-instance --db-instance-identifier mydb --publicly-accessible true
pg_dump -U admin -h mydb.aws.com > backup.sql

# Restore to Heroku
heroku pg:psql -a africoin-api < backup.sql
```

### From Azure to Heroku
```bash
# Export database
pg_dump -U admin -h mydb.postgres.database.azure.com > backup.sql

# Restore to Heroku
heroku pg:psql -a africoin-api < backup.sql
```

---

## Support

For issues, visit https://help.heroku.com or contact Heroku Support
