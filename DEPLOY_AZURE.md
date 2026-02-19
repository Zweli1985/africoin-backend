# AfriCoin Backend - Azure Deployment Guide

## Prerequisites

- Azure subscription
- Azure CLI installed
- Docker installed (for building images)
- GitHub account with repository

---

## Deployment Options

### Option 1: Azure App Service (Recommended for Startups)

#### Step 1: Create Resource Group
```bash
az group create --name africoin-rg --location eastus
```

#### Step 2: Create App Service Plan
```bash
az appservice plan create \
  --name africoin-plan \
  --resource-group africoin-rg \
  --sku B2 \
  --is-linux
```

#### Step 3: Create Web App
```bash
az webapp create \
  --resource-group africoin-rg \
  --plan africoin-plan \
  --name africoin-api \
  --runtime "node|18-lts"
```

#### Step 4: Configure Deployment
```bash
# Enable built-in auth
az webapp auth update \
  --resource-group africoin-rg \
  --name africoin-api \
  --enabled true

# Configure app settings
az webapp config appsettings set \
  --resource-group africoin-rg \
  --name africoin-api \
  --settings \
    NODE_ENV=production \
    PORT=8080 \
    DATABASE_URL=postgresql://user:pass@host/db \
    JWT_SECRET=your-secret \
    STRIPE_SECRET_KEY=sk_live_xxx \
    PAYFAST_MERCHANT_ID=xxx \
    SOLANA_RPC_URL=https://api.mainnet-beta.solana.com \
    REDIS_URL=redis://cache-host:6379
```

#### Step 5: Deploy Code
```bash
# Option A: From GitHub
az webapp deployment source config-zip \
  --resource-group africoin-rg \
  --name africoin-api \
  --src /path/to/backend.zip

# Option B: Using Git
cd backend
git remote add azure https://africoin-api.scm.azurewebsites.net/africoin-api.git
git push azure main
```

---

### Option 2: Azure Container Instances (Docker)

#### Step 1: Create Container Registry
```bash
az acr create \
  --resource-group africoin-rg \
  --name africoinacr \
  --sku Basic
```

#### Step 2: Build and Push Docker Image
```bash
# Login to registry
az acr login --name africoinacr

# Build image
az acr build \
  --registry africoinacr \
  --image africoin-backend:latest \
  --file Dockerfile .
```

#### Step 3: Create Container Instance
```bash
az container create \
  --resource-group africoin-rg \
  --name africoin-api-container \
  --image africoinacr.azurecr.io/africoin-backend:latest \
  --cpu 2 \
  --memory 4 \
  --environment-variables \
    NODE_ENV=production \
    DATABASE_URL=postgresql://user:pass@host/db \
    JWT_SECRET=your-secret \
  --ports 3001 \
  --dns-name-label africoin-api
```

---

### Option 3: Azure Kubernetes Service (AKS) - Enterprise

#### Step 1: Create AKS Cluster
```bash
az aks create \
  --resource-group africoin-rg \
  --name africoin-cluster \
  --node-count 3 \
  --vm-set-type VirtualMachineScaleSets \
  --load-balancer-sku standard
```

#### Step 2: Get Credentials
```bash
az aks get-credentials \
  --resource-group africoin-rg \
  --name africoin-cluster
```

#### Step 3: Create Kubernetes Deployment (deployment.yaml)
```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: africoin-backend
spec:
  replicas: 3
  selector:
    matchLabels:
      app: africoin-backend
  template:
    metadata:
      labels:
        app: africoin-backend
    spec:
      containers:
      - name: backend
        image: africoinacr.azurecr.io/africoin-backend:latest
        ports:
        - containerPort: 3001
        env:
        - name: NODE_ENV
          value: "production"
        - name: DATABASE_URL
          valueFrom:
            secretKeyRef:
              name: africoin-secrets
              key: database-url
        resources:
          requests:
            memory: "512Mi"
            cpu: "500m"
          limits:
            memory: "1Gi"
            cpu: "1000m"
        livenessProbe:
          httpGet:
            path: /health
            port: 3001
          initialDelaySeconds: 30
          periodSeconds: 10
---
apiVersion: v1
kind: Service
metadata:
  name: africoin-backend-service
spec:
  selector:
    app: africoin-backend
  ports:
  - protocol: TCP
    port: 80
    targetPort: 3001
  type: LoadBalancer
```

#### Step 4: Deploy to AKS
```bash
kubectl apply -f deployment.yaml

# Create secrets for sensitive data
kubectl create secret generic africoin-secrets \
  --from-literal=database-url=postgresql://user:pass@host/db \
  --from-literal=jwt-secret=your-secret
```

---

## Database Setup (Azure Database for PostgreSQL)

### Create PostgreSQL Server
```bash
az postgres server create \
  --resource-group africoin-rg \
  --name africoin-db \
  --location eastus \
  --admin-user dbadmin \
  --admin-password YourPassword123! \
  --sku-name B_Gen5_2 \
  --storage-size 51200 \
  --ssl-enforcement Enabled
```

### Create Database
```bash
az postgres db create \
  --resource-group africoin-rg \
  --server-name africoin-db \
  --name africoindb
```

### Configure Firewall
```bash
# Allow Azure services
az postgres server firewall-rule create \
  --resource-group africoin-rg \
  --server-name africoin-db \
  --name AllowAzureServices \
  --start-ip-address 0.0.0.0 \
  --end-ip-address 0.0.0.0

# Allow your IP
az postgres server firewall-rule create \
  --resource-group africoin-rg \
  --server-name africoin-db \
  --name AllowMyIP \
  --start-ip-address YOUR_IP \
  --end-ip-address YOUR_IP
```

---

## Redis Cache Setup (Azure Cache for Redis)

```bash
az redis create \
  --resource-group africoin-rg \
  --name africoin-cache \
  --location eastus \
  --sku Basic \
  --vm-size c0
```

---

## Domain and SSL Setup

### Create Application Gateway
```bash
# Create public IP
az network public-ip create \
  --resource-group africoin-rg \
  --name africoin-pip

# Create application gateway
az network application-gateway create \
  --name africoin-gateway \
  --location eastus \
  --resource-group africoin-rg \
  --vnet-name africoin-vnet \
  --subnet frontend \
  --capacity 2 \
  --sku Standard_Medium \
  --public-ip-address africoin-pip
```

### Custom Domain
```bash
# Create DNS Zone
az network dns zone create \
  --resource-group africoin-rg \
  --name api.africoin.com

# Add DNS records
az network dns record-set a add-record \
  --resource-group africoin-rg \
  --zone-name api.africoin.com \
  --record-set-name @ \
  --ipv4-address YOUR_PUBLIC_IP
```

---

## Monitoring and Alerts

### Application Insights Setup
```bash
az monitor app-insights component create \
  --app africoin-insights \
  --location eastus \
  --resource-group africoin-rg \
  --application-type web
```

### Create Alert Rule
```bash
az monitor metrics alert create \
  --name HighErrorRate \
  --resource-group africoin-rg \
  --scopes /subscriptions/{sub-id}/resourceGroups/africoin-rg/providers/microsoft.web/sites/africoin-api \
  --condition "avg http server errors 5xx > 10 count > 3 within 5m" \
  --window-size 5m \
  --evaluation-frequency 1m \
  --action /subscriptions/{sub-id}/resourceGroups/africoin-rg/providers/microsoft.insights/actionGroups/notify-team
```

---

## CI/CD Pipeline (GitHub Actions)

Create `.github/workflows/azure-deploy.yml`:

```yaml
name: Deploy to Azure

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest

    steps:
    - uses: actions/checkout@v2

    - name: Set up Node.js
      uses: actions/setup-node@v2
      with:
        node-version: '18'

    - name: Install dependencies
      run: npm ci

    - name: Build
      run: npm run build

    - name: Login to Azure
      uses: azure/login@v1
      with:
        creds: ${{ secrets.AZURE_CREDENTIALS }}

    - name: Deploy to Azure App Service
      uses: azure/webapps-deploy@v2
      with:
        app-name: africoin-api
        package: ${{ github.workspace }}/dist

    - name: Logout
      run: az logout
```

---

## Scaling Configuration

### Auto Scale Settings
```bash
az monitor autoscale create \
  --resource-group africoin-rg \
  --resource africoin-plan \
  --resource-type "Microsoft.Web/serverfarms" \
  --min-count 2 \
  --max-count 10 \
  --count 2
```

---

## Backup and Recovery

### Enable Backup
```bash
az backup protection enable-for-vm \
  --resource-group africoin-rg \
  --vault-name backup-vault \
  --vm africoin-api
```

---

## Cost Optimization

1. **Use B2 App Service Plan** for development/staging
2. **Enable Auto-scaling** to handle traffic spikes
3. **Database**: Start with Basic tier, scale up as needed
4. **Redis**: Use Basic tier for caching
5. **Monitor costs** with Azure Cost Management

---

## Troubleshooting

### Check Logs
```bash
# Stream logs
az webapp log tail --name africoin-api --resource-group africoin-rg

# Download logs
az webapp log download --name africoin-api --resource-group africoin-rg
```

### Common Issues

**502 Bad Gateway**
- Check backend service is running
- Verify environment variables
- Check database connectivity

**High Memory Usage**
- Review Node.js heap settings
- Check for memory leaks
- Scale up VM size

**Database Connection Failed**
- Verify firewall rules
- Check connection string
- Ensure database exists

---

## Production Checklist

- [ ] Enable HTTPS/SSL
- [ ] Set up domain name
- [ ] Configure monitoring & alerts
- [ ] Enable database backups
- [ ] Set up auto-scaling
- [ ] Configure CDN for static assets
- [ ] Enable DDoS protection
- [ ] Set up WAF (Web Application Firewall)
- [ ] Configure rate limiting
- [ ] Set up log aggregation
- [ ] Test disaster recovery
- [ ] Document runbooks

---

## Support

For issues, contact Azure Support or refer to Azure documentation at https://docs.microsoft.com/azure/
