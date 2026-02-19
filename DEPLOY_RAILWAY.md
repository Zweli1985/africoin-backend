# AfriCoin Backend - Railway.app Deployment Guide

## Why Railway.app?

- **Free tier**: Start for free (then $5/month onwards)
- **Simplest setup**: Connect GitHub, auto-deploys on every push
- **Cheaper than Heroku**: 20-50% less expensive
- **Same simplicity**: No complex AWS/Azure setup
- **Managed databases**: PostgreSQL + Redis included
- **Global deployments**: Automatic CDN

---

## Quick Start (5 minutes)

### Step 1: Create Railway Account
1. Go to https://railway.app
2. Sign up with GitHub (recommended)
3. Authorize Railway to access your repositories

### Step 2: Create New Project
1. Click **"New Project"**
2. Select **"Deploy from GitHub"**
3. Find your `africoin-backend` repository
4. Click **"Deploy"**

Railway will:
- Detect Node.js automatically
- Install dependencies
- Start your server
- Give you a live URL

**That's it! Your app is deployed.** 🎉

---

## Full Setup Guide

### Step 1: Prepare Your Repository

Ensure your `package.json` has:
```json
{
  "scripts": {
    "start": "node dist/index.js",
    "dev": "ts-node src/index.ts",
    "build": "tsc"
  },
  "engines": {
    "node": "18.x"
  }
}
```

Railway automatically runs:
1. `npm install`
2. `npm run build` (if exists)
3. `npm start`

### Step 2: Create Railway Project

**Option A: Via Web Interface (Easiest)**
1. Go to https://railway.app/dashboard
2. Click **"New Project"** button
3. Select **"Deploy from GitHub Repo"**
4. Select your `africoin-backend` repository
5. Click **"Deploy"**

**Option B: Via Railway CLI**
```bash
# Install Railway CLI
npm install -g @railway/cli

# Login to Railway
railway login

# Link to your project
railway link

# Deploy
railway up
```

### Step 3: Add Services (Database & Cache)

#### Add PostgreSQL Database
1. In Railway dashboard, click **"Add Service"**
2. Select **"PostgreSQL"**
3. Click **"Create"**
4. Wait for it to initialize (~30 seconds)

Railway automatically sets the `DATABASE_URL` environment variable.

#### Add Redis Cache
1. Click **"Add Service"** again
2. Select **"Redis"**
3. Click **"Create"**

Railway automatically sets the `REDIS_URL` environment variable.

---

## Environment Variables

### View Current Variables
1. Go to your project dashboard
2. Click the **API** service
3. Click **"Variables"** tab
4. See all environment variables

### Add Environment Variables
1. Click **"+ Add Variable"**
2. Enter variable name and value
3. Click **"Add"**

**Required Variables**:
```ini
# App
NODE_ENV=production
PORT=3001

# JWT
JWT_SECRET=your-secret-key-here

# Stripe
STRIPE_PUBLIC_KEY=pk_live_xxx
STRIPE_SECRET_KEY=sk_live_xxx
STRIPE_IDENTITY_WEBHOOK_SECRET=whsec_xxx

# PayFast
PAYFAST_MERCHANT_ID=10000100
PAYFAST_MERCHANT_KEY=merchant-key
PAYFAST_PASSPHRASE=passphrase

# Solana
SOLANA_RPC_URL=https://api.mainnet-beta.solana.com
SOLANA_NETWORK=mainnet-beta

# Twilio
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=your-auth-token
TWILIO_PHONE_NUMBER=+1234567890

# Email
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your-email@gmail.com
EMAIL_PASSWORD=your-app-password
EMAIL_FROM=noreply@africoin.com

# Encryption & Webhooks
ENCRYPTION_KEY=your-32-character-key
WEBHOOK_SECRET=webhook-secret
METRICS_ENABLED=true
```

**Note**: `DATABASE_URL` and `REDIS_URL` are automatically set by Railway. Don't add them manually.

---

## Deployment Workflow

### Automatic Deployment (Recommended)
```bash
# 1. Make code changes
git add .
git commit -m "Feature: Add new endpoint"

# 2. Push to GitHub
git push origin main

# 3. Railway automatically:
#    - Detects changes
#    - Rebuilds your app
#    - Redeploys within 2-3 minutes
#    - Updates live URL
```

Watch deployment progress in Railway dashboard:
- **"Deployments"** tab shows deployment history
- **"Logs"** tab shows real-time build/runtime logs

### Manual Deployment
```bash
# Using Railway CLI
railway up

# Or use GitHub web interface to trigger rebuild
```

---

## Monitoring & Logs

### View Logs in Dashboard
1. Click your API service
2. Click **"Logs"** tab
3. See real-time application logs

### View Deployment History
1. Click **"Deployments"** tab
2. See all past deployments
3. Click a deployment to see detailed logs

### CLI Logs
```bash
# Stream logs
railway logs

# Tail specific lines
railway logs --tail 50

# Follow logs in real-time
railway logs -f
```

---

## Database Management

### Access PostgreSQL Database

**Option A: Via Railway Dashboard**
1. Click **PostgreSQL** service
2. Click **"Connect"** tab
3. Copy connection string
4. Use with any PostgreSQL client

**Option B: Via pgAdmin (Web Interface)**
1. Click **PostgreSQL** service
2. Click **"Data"** tab
3. See all tables and data visually

**Option C: Via CLI**
```bash
# Connect to database
railway db-shell

# In psql shell:
\dt              # List tables
\d users         # Describe users table
SELECT * FROM users;  # Query data
```

### Run Migrations

```bash
# Option 1: One-time command
railway run npm run db:migrate

# Option 2: SSH into container then run
railway shell
npm run db:migrate
exit
```

### Backup Database
```bash
# Automatic backups are created daily

# Manual backup
railway db-shell -c "pg_dump africoindb" > backup.sql

# View backups in dashboard:
# PostgreSQL service → "Monitoring" tab
```

---

## Custom Domain

### Add Custom Domain
1. Click your project
2. Click **API** service
3. Click **"Settings"** tab (gear icon)
4. Scroll to **"Domains"**
5. Click **"Add Domain"**
6. Enter your domain (e.g., `api.africoin.com`)

### Configure DNS

In your domain registrar (GoDaddy, Namecheap, etc.):

**Create CNAME record**:
```
Type: CNAME
Name: api
Value: (shown in Railway dashboard)
TTL: 3600
```

**Or with A record**:
```
Type: A
Name: api
Value: (shown in Railway dashboard)
TTL: 3600
```

Wait 5-30 minutes for DNS propagation.

### SSL Certificate
Railway automatically provisions **free SSL certificates** via Let's Encrypt.
- HTTPS is enabled by default
- Automatic renewal

---

## Environment-Specific Deployments

### Production Branch Auto-Deploy
```bash
# Deploy main to production
git push origin main

# Deploy develop to staging
git push origin develop
```

Create separate Railway projects for prod/staging:

**Production Project**:
- Connected to `main` branch
- Full environment variables
- Full database

**Staging Project**:
- Connected to `develop` branch
- Test environment variables
- Test database

---

## Scaling

### Vertical Scaling (More Power)
1. Click API service
2. Click **"Settings"**
3. Scroll to **"Instance"**
4. Select plan:
   - **Free** ($0): 512MB RAM
   - **Starter** ($5): 1GB RAM
   - **Growth** ($15): 2GB RAM
   - **Pro** ($25): 4GB RAM
   - **Enterprise** (custom): Unlimited

Changes take effect immediately.

### Horizontal Scaling (Multiple Instances)
1. Click **"Settings"**
2. Scroll to **"Replica Count"**
3. Set number of instances (2-10)

Each instance gets its own container.

---

## CI/CD: GitHub Actions Integration

### Trigger Deployment on GitHub
Railway auto-deploys when you push to your connected branch.

To see deployment status:
```yaml
# In your GitHub Actions workflow
- name: Deploy to Railway
  run: |
    curl -X POST \
      -H "Authorization: Bearer ${{ secrets.RAILWAY_TOKEN }}" \
      -H "Content-Type: application/json" \
      -d '{"service": "api"}' \
      https://api.railway.app/webhooks/deploy
```

Get `RAILWAY_TOKEN`:
1. Go to Railway dashboard
2. Click your profile → **"Tokens"**
3. Create new token
4. Add to GitHub Secrets

---

## Monitoring & Alerts

### View Metrics
1. Click API service
2. Click **"Monitoring"** tab
3. See real-time metrics:
   - CPU usage
   - Memory usage
   - Network I/O
   - Response times

### Set Up Alerts
```bash
# Via CLI
railway alert create --service api --type cpu --threshold 80
```

Or via dashboard:
1. Click **"Settings"**
2. Scroll to **"Alerts"**
3. Add email for notifications

---

## Environment Management

### .env.local for Local Development
```bash
# Create .env.local (not committed to git)
cp .env.example .env.local

# Add local values
NODE_ENV=development
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/africoindb-local
REDIS_URL=redis://localhost:6379
```

### .env for Production (Railway)
Don't commit `.env` file. Instead:
1. Add all variables in Railway dashboard
2. Railway injects them at runtime

---

## Troubleshooting

### App Won't Start
```bash
# Check logs
railway logs -f

# Common issues:
# - Missing environment variable
# - Database not ready
# - Port already in use

# Solution: Check logs tab in dashboard
```

### Database Connection Failed
```bash
# Verify DATABASE_URL is set
railway variables

# Test connection
railway db-shell
```

### Deployment Stuck
```bash
# Cancel deployment
railway deployment cancel

# Trigger new deployment
git push origin main
```

### High Memory Usage
```bash
# Check memory
railway run node --max-old-space-size=1024 dist/index.js

# Or upgrade plan
# Click API → Settings → Instance → Select larger plan
```

### Environment Variable Not Updating
```bash
# Wait for redeploy after changing variables
# Or manually trigger:
git commit --allow-empty -m "Trigger redeploy"
git push origin main
```

---

## Backups & Disaster Recovery

### Daily Automatic Backups
Railway automatically backs up PostgreSQL database:
1. Click **PostgreSQL** service
2. Click **"Settings"**
3. See backup retention policy (default: 7 days)

### Manual Backup
```bash
# Backup database
railway db-shell -c "pg_dump africoindb" > backup.sql

# Restore from backup
railway db-shell < backup.sql
```

### Restore Point-in-Time
1. Click **PostgreSQL** service
2. Click **"Settings"** → **"Backups"**
3. Select date/time to restore to
4. Click **"Restore"**

---

## Cost Breakdown

### Typical Pricing (Monthly)
```
API Service (Starter)          $5.00
PostgreSQL (Starter)           $15.00
Redis (Starter)                $5.00
─────────────────────────────────
TOTAL                          $25.00
```

### Free Tier
- $5 CPU-hours per month free
- Test for free, then scale up

### Cost Optimization
1. Start with **free tier**
2. Use **starter tier** for production ($5/service)
3. Scale up only if needed
4. Set resource limits to avoid surprise bills

---

## Advanced: Deploy from Docker

### Create Docker Image
```bash
docker build -t africoin-backend:latest .
```

### Push to Docker Registry
```bash
# Create account on hub.docker.com
# Tag image
docker tag africoin-backend:latest USERNAME/africoin-backend:latest

# Push
docker push USERNAME/africoin-backend:latest
```

### Deploy from Docker in Railway
1. Click **"Add Service"** → **"Docker Image"**
2. Enter image: `USERNAME/africoin-backend:latest`
3. Click **"Deploy"**

---

## Migration from Heroku to Railway

### Export Data from Heroku
```bash
# Get Heroku database backup
heroku pg:backups:capture -a africoin-api
heroku pg:backups:download -a africoin-api

# Connect to Railway database
railway db-shell

# Restore backup
# Inside psql: \i backup.sql
```

### Update DNS
1. Update A/CNAME records to point to Railway
2. Wait for DNS propagation

### Test New Infrastructure
1. Access Railway URL directly
2. Verify API works
3. Run smoke tests
4. Update DNS when ready

---

## Team Collaboration

### Add Team Members
1. Click **"Settings"** (gear icon)
2. Click **"Team"**
3. Click **"Invite"**
4. Enter email
5. Select role:
   - **Owner**: Full access
   - **Admin**: Manage deployments
   - **Member**: View only

### Manage Permissions
- Owners can delete projects
- Admins can deploy and manage variables
- Members can only view

---

## Production Checklist

- [ ] Upgrade to paid tier ($5+)
- [ ] Set all environment variables
- [ ] Enable automatic backups
- [ ] Add custom domain
- [ ] Configure SSL certificate
- [ ] Set up monitoring
- [ ] Enable error alerts
- [ ] Create GitHub webhook
- [ ] Test database backup/restore
- [ ] Load test application
- [ ] Document runbook

---

## Limits & Quotas

| Limit | Value |
|-------|-------|
| Max request size | 100MB |
| Max concurrent connections | 1000 |
| Request timeout | 120 seconds |
| Build time limit | 30 minutes |
| Storage per container | 100GB |
| Monthly requests (free) | Unlimited |

---

## Support & Resources

- **Railway Docs**: https://docs.railway.app
- **Status Page**: https://status.railway.app
- **Discord Community**: https://discord.gg/railway
- **Email Support**: support@railway.app
- **Priority Support**: Available for pro plans

---

## Next Steps

1. **Create Railway account** at https://railway.app
2. **Connect GitHub repository**
3. **Add PostgreSQL** service
4. **Add Redis** service
5. **Set environment variables**
6. **Deploy** (automatic on git push)
7. **Get live URL** from dashboard
8. **Add custom domain** (optional)

**Your app will be live in 5 minutes!** 🚀
