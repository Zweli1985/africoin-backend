# AfriCoin Backend - Quick Start Guide

## 5 Minute Setup

### 1. Install Dependencies
```bash
cd backend
npm install
```

### 2. Configure Environment
```bash
cp .env.example .env
```

Edit `.env` and add your credentials:
- Stripe keys (get from https://dashboard.stripe.com)
- PayFast credentials (if using SA payments)
- Solana RPC URL (default devnet is fine for testing)

### 3. Start Development Server
```bash
npm run dev
```

Server runs on `http://localhost:3001`

---

## Using Docker (Recommended)

```bash
# Start PostgreSQL + Backend + Adminer
docker-compose up -d

# View logs
docker-compose logs -f backend

# Stop services
docker-compose down
```

**Adminer** (Database UI): http://localhost:8080
- Server: postgres
- User: africoin_user
- Password: africoin_password
- Database: africoin_db

---

## Testing the APIs

### 1. Register a User
```bash
curl -X POST http://localhost:3001/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "SecurePass123!",
    "firstName": "John",
    "lastName": "Doe"
  }'
```

Response:
```json
{
  "success": true,
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "firstName": "John"
  },
  "token": "eyJhbGciOiJIUzI1NiIs..."
}
```

### 2. Login
```bash
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "SecurePass123!"
  }'
```

### 3. Get User Profile (requires token)
```bash
curl -X GET http://localhost:3001/api/user/profile \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

### 4. Initiate KYC Verification
```bash
curl -X POST http://localhost:3001/api/kyc/initiate \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

### 5. Create Stripe Payment Intent
```bash
curl -X POST http://localhost:3001/api/payment/stripe/intent \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -H "Content-Type: application/json" \
  -d '{
    "amount": 100.00,
    "currency": "ZAR"
  }'
```

### 6. Create Solana Wallet
```bash
curl -X POST http://localhost:3001/api/solana/wallet/create \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

### 7. Get Wallet Balance
```bash
curl -X GET http://localhost:3001/api/solana/wallet/balance \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

---

## Health Check

```bash
curl http://localhost:3001/health
```

Expected response:
```json
{
  "status": "ok",
  "timestamp": "2026-02-19T10:30:45.123Z",
  "uptime": 123.456
}
```

---

## Environment Variables Guide

| Variable | Purpose | Example |
|----------|---------|---------|
| `DATABASE_URL` | Database connection | `postgresql://user:pass@localhost/db` |
| `JWT_SECRET` | JWT signing key | `super-secret-key-min-32-chars` |
| `STRIPE_SECRET_KEY` | Stripe API key | `sk_test_xxxxx` |
| `PAYFAST_MERCHANT_ID` | PayFast merchant | `10004003` |
| `SOLANA_RPC_URL` | Solana endpoint | `https://api.devnet.solana.com` |
| `FRONTEND_URL` | CORS origin | `http://localhost:5173` |
| `NODE_ENV` | Environment | `development` or `production` |

---

## Build for Production

```bash
# Build TypeScript
npm run build

# Test the build
npm start

# Or use Docker
docker build -t africoin-backend .
docker run -p 3001:3001 --env-file .env africoin-backend
```

---

## Common Issues

### "Cannot find module"
```bash
npm install
npm run build
```

### Port 3001 already in use
```bash
# Change PORT in .env
PORT=3002
```

### Database connection failed
Check `DATABASE_URL` format:
- SQLite: `file:./dev.db`
- PostgreSQL: `postgresql://user:password@host:5432/dbname`

### Docker compose fails
```bash
docker-compose down -v  # Remove volumes
docker-compose up --build  # Rebuild
```

---

## Next Steps

1. ✅ Install and run backend
2. 📱 Connect with mobile app (Expo)
3. 🌐 Connect with frontend (React/Vite)
4. 💳 Test payment flows (Stripe/PayFast)
5. 🪙 Test Solana integration
6. 📊 Monitor logs and database

---

## Support & Documentation

- **API Docs**: Check route files in `src/routes/`
- **Database Models**: See `src/database/models.ts`
- **Services**: Business logic in `src/services/`

---

Happy coding! 🚀
