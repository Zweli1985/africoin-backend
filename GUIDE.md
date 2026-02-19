# AfriCoin Backend - Complete Setup & Integration Guide

## Overview

The AfriCoin backend is a production-ready Node.js/Express API with:
- **Payment Processing**: Stripe + PayFast (South Africa)
- **KYC Verification**: Document verification and identity checks
- **Blockchain**: Solana wallet integration and token transfers
- **Security**: JWT auth, rate limiting, input validation
- **Database**: PostgreSQL + Sequelize ORM

---

## Getting Started (5 Minutes)

### Option 1: Quick Start (SQLite)
```bash
cd backend
npm install
cp .env.example .env
npm run dev
```

Visit: `http://localhost:3001/health`

### Option 2: Docker (Full Stack)
```bash
docker-compose up -d
# PostgreSQL + Backend + Adminer
# Backend: http://localhost:3001
# Adminer: http://localhost:8080
```

---

## Architecture

### Core Components

```
Express Server (3001)
    ↓
[Middleware Layer]
  - CORS, Helmet, Rate Limiting
  - JWT Authentication
  - Request Validation (Joi)
  ↓
[Route Handlers]
  - Auth (/api/auth)
  - KYC (/api/kyc)
  - Payment (/api/payment)
  - Transactions (/api/transaction)
  - Solana (/api/solana)
  - User (/api/user)
  ↓
[Service Layer]
  - AuthService (JWT, passwords)
  - KycService (Stripe Identity)
  - PaymentService (Stripe, PayFast)
  - SolanaService (Web3.js, wallets)
  ↓
[Database]
  - User, Transaction, PaymentMethod
  - KycVerification, SolanaWallet
  - Sequelize ORM
  ↓
[External APIs]
  - Stripe API
  - PayFast API
  - Solana RPC
```

### Request Flow Example (Payment)

```
Client Request
  ↓
[Rate Limit Check] - max 100/15min
  ↓
[CORS Check] - origin validation
  ↓
[JWT Auth] - token verification
  ↓
[Input Validation] - Joi schemas
  ↓
[PaymentService.createStripePaymentIntent()]
  ├─ Verify user exists
  ├─ Create Stripe PaymentIntent
  ├─ Create Transaction record
  └─ Return clientSecret
  ↓
JSON Response + 200 OK
```

---

## Environment Configuration

### Required Variables (Minimum)

```env
NODE_ENV=development
PORT=3001
DATABASE_URL=file:./dev.db
JWT_SECRET=change-me-to-at-least-32-characters
```

### Full Configuration

See `.env.example` for complete list including:
- Stripe keys (test/live)
- PayFast credentials
- Solana RPC endpoint
- Email SMTP settings
- Logging level

### Get Your API Keys

**Stripe** (Global Payments):
1. Go to https://dashboard.stripe.com
2. Create test account
3. Copy `pk_test_*` and `sk_test_*`

**PayFast** (South African Payments):
1. Register at https://www.payfast.co.za
2. Get Merchant ID, Key, and Passphrase
3. Use these in `.env`

**Solana** (Blockchain):
1. Use public RPC: `https://api.devnet.solana.com`
2. For mainnet: `https://api.mainnet-beta.solana.com`
3. Optional: Run your own RPC node

---

## Database Schema

### Users Table
```
id (UUID, PK)
email (unique)
passwordHash (bcrypt)
firstName, lastName, phone
dateOfBirth, country, state, city, address
idType, idNumber, idExpiry
profileImageUrl
kycStatus (PENDING/VERIFIED/REJECTED/EXPIRED)
twoFactorEnabled, twoFactorSecret
lastLoginAt, createdAt, updatedAt
```

### Transactions Table
```
id (UUID, PK)
userId (FK)
type (DEPOSIT/WITHDRAWAL/TRANSFER/PAYMENT/REFUND)
amount, currency (ZAR, USD, etc)
cryptoAmount, cryptoSymbol (SOL, USDC)
status (PENDING/PROCESSING/COMPLETED/FAILED/CANCELLED/REFUNDED)
paymentMethodId (FK)
stripeTransactionId, payfastTransactionId, solanaSignature
description, failureReason
metadata (JSON)
createdAt, completedAt, updatedAt
```

### PaymentMethods Table
```
id (UUID, PK)
userId (FK)
type (CARD/BANK_ACCOUNT/MOBILE_MONEY/CRYPTO_WALLET)
provider (STRIPE/PAYFAST/LUNO/PAYPAL)
stripePaymentMethodId
cardLastFour, cardBrand, cardExpiryMonth, cardExpiryYear
bankAccountNumber, bankCode, bankName, accountHolderName
mobilePhoneNumber, mobileProvider
walletAddress
isDefault, isVerified
createdAt
```

### KycVerifications Table
```
id (UUID, PK)
userId (FK, unique)
status (PENDING/VERIFIED/REJECTED)
verificationLevel (BASIC/STANDARD/ENHANCED)
documentType, documentNumber, documentUrl
faceScanUrl
stripeVerificationSessionId
verificationScore (0.00-1.00)
rejectionReason, rejectionDetails (JSON)
verifiedAt, expiresAt
createdAt, updatedAt
```

### SolanaWallets Table
```
id (UUID, PK)
userId (FK)
publicKey (unique)
encryptedPrivateKey
network (mainnet-beta/testnet/devnet)
isVerified
balance, lastBalanceUpdate
createdAt, updatedAt
```

---

## API Endpoints Reference

### Authentication

| Method | Endpoint | Auth | Purpose |
|--------|----------|------|---------|
| POST | `/auth/register` | ❌ | Create account |
| POST | `/auth/login` | ❌ | Login & get token |
| POST | `/auth/verify` | ✅ | Verify token validity |
| POST | `/auth/refresh` | ✅ | Get new JWT token |
| POST | `/auth/change-password` | ✅ | Update password |

### KYC Verification

| Method | Endpoint | Auth | Response |
|--------|----------|------|----------|
| POST | `/kyc/initiate` | ✅ | Create verification session |
| GET | `/kyc/status` | ✅ | Check verification status |
| POST | `/kyc/submit` | ✅ | Submit documents |

### Payments

| Method | Endpoint | Auth | Purpose |
|--------|----------|------|---------|
| POST | `/payment/stripe/intent` | ✅ | Create payment intent |
| POST | `/payment/stripe/confirm` | ✅ | Confirm Stripe payment |
| POST | `/payment/method` | ✅ | Add payment method |
| POST | `/payment/payfast/initiate` | ✅ | Initiate PayFast |
| POST | `/payment/:id/refund` | ✅ | Refund transaction |

### Transactions

| Method | Endpoint | Auth | Purpose |
|--------|----------|------|---------|
| GET | `/transaction` | ✅ | List transactions |
| GET | `/transaction/:id` | ✅ | Get details |
| GET | `/transaction/summary/stats` | ✅ | Summary stats |
| POST | `/transaction/:id/cancel` | ✅ | Cancel pending |

### Solana

| Method | Endpoint | Auth | Purpose |
|--------|----------|------|---------|
| POST | `/solana/wallet/create` | ✅ | Create wallet |
| GET | `/solana/wallet/balance` | ✅ | Get balance |
| POST | `/solana/transfer/initiate` | ✅ | Start transfer |
| POST | `/solana/transfer/:id/confirm` | ✅ | Confirm transfer |

### User Management

| Method | Endpoint | Auth | Purpose |
|--------|----------|------|---------|
| GET | `/user/profile` | ✅ | Get profile |
| PUT | `/user/profile` | ✅ | Update profile |
| GET | `/user/payment-methods` | ✅ | List methods |
| DELETE | `/user/payment-methods/:id` | ✅ | Delete method |
| POST | `/user/2fa/enable` | ✅ | Enable 2FA |
| POST | `/user/2fa/disable` | ✅ | Disable 2FA |

---

## Testing with REST Client

VS Code Extension: **REST Client** (humao.rest-client)

Use `requests.http` file in backend root:
```bash
1. Install REST Client extension
2. Open requests.http
3. Click "Send Request" above each endpoint
4. View responses in side panel
```

Or use cURL:
```bash
curl -X GET http://localhost:3001/health

curl -X POST http://localhost:3001/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "SecurePass123!",
    "firstName": "John"
  }'
```

---

## Error Handling

### Standard Error Response
```json
{
  "success": false,
  "message": "Error description",
  "statusCode": 400,
  "details": [
    {
      "field": "email",
      "message": "Invalid email format"
    }
  ]
}
```

### Common Status Codes
- `200` - Success
- `201` - Created
- `400` - Bad request / validation failed
- `401` - Unauthorized / invalid token
- `403` - Forbidden / token expired
- `404` - Not found
- `429` - Too many requests (rate limited)
- `500` - Server error

---

## Security Best Practices

### Implemented
✅ HTTPS in production (use Nginx/HAProxy)
✅ CORS - restricted to frontend domain
✅ Rate limiting - 100/15min per IP
✅ JWT tokens - 7 day expiry
✅ Password hashing - bcrypt 10 rounds
✅ Input validation - Joi schemas
✅ SQL injection - Sequelize parameterized queries
✅ CSRF - Stateless JWT auth
✅ Helmet - HTTP security headers

### To Implement
- 🔒 Enable 2FA with proper TOTP
- 🔐 Encrypt sensitive fields in DB
- 📊 Add audit logging
- 🛡️ Implement Web Application Firewall (WAF)
- 🔑 Rotate JWT secret regularly
- 📧 Email verification on registration

---

## Deployment

### Development
```bash
npm run dev  # Watches for changes
```

### Production Build
```bash
npm run build  # Compiles TypeScript
npm start      # Runs compiled JS
```

### Docker Production
```bash
docker build -t africoin-backend:latest .
docker run \
  -p 3001:3001 \
  -e DATABASE_URL=postgresql://user:pass@host/db \
  -e JWT_SECRET=your-secret \
  africoin-backend:latest
```

### Environment Variables for Production
```env
NODE_ENV=production
DATABASE_URL=postgresql://user:pass@host:5432/africoin_prod
JWT_SECRET=very-long-random-secret-32+-chars
STRIPE_SECRET_KEY=sk_live_xxxxx (NOT test)
FRONT_END_URL=https://app.africoin.com
```

---

## Performance Optimization

### Database Queries
- Indexes on frequently queried fields (email, userId)
- Connection pooling (Sequelize default)
- Query optimization for large datasets

### Caching
- Redis integration available (see package.json)
- Cache payment methods (5 min TTL)
- Cache user KYC status (1 hour TTL)

### Rate Limiting
- Global: 100 requests/15 min
- Login: 5 attempts/15 min
- Prevents brute force & DDoS

### Logging
- Structured logging with Winston
- Separate error logs
- Debug mode for development

---

## Troubleshooting

### "Port 3001 already in use"
```bash
# Change PORT in .env
PORT=3002
npm run dev
```

### "Cannot find module 'stripe'"
```bash
npm install  # Reinstall dependencies
npm run build
```

### "Database connection failed"
```bash
# Check DATABASE_URL format
echo $DATABASE_URL

# For PostgreSQL: postgresql://user:password@host:5432/dbname
# For SQLite: file:./dev.db
```

### "Invalid JWT token"
- Token may have expired (7 days)
- Check JWT_SECRET matches between requests
- Try logging in again

### Stripe webhook issues
- Ensure ngrok is running: `ngrok http 3001`
- Add webhook endpoint in Stripe dashboard
- Check webhook signing secret

---

## File Structure

```
backend/
├── src/
│   ├── config/          # Config management
│   │   └── index.ts     # App configuration
│   ├── database/        # Database layer
│   │   ├── models.ts    # Sequelize models
│   │   └── init.ts      # DB initialization
│   ├── middleware/      # Express middleware
│   │   ├── auth.ts      # JWT verification
│   │   ├── errorHandler.ts
│   │   └── validation.ts
│   ├── routes/          # API route handlers
│   │   ├── auth.ts
│   │   ├── kyc.ts
│   │   ├── payment.ts
│   │   ├── transaction.ts
│   │   ├── solana.ts
│   │   └── user.ts
│   ├── services/        # Business logic
│   │   ├── authService.ts
│   │   ├── kycService.ts
│   │   ├── paymentService.ts
│   │   └── solanaService.ts
│   ├── types/           # TypeScript types
│   │   └── index.ts
│   ├── utils/           # Utility functions
│   │   ├── logger.ts
│   │   └── helpers.ts
│   └── index.ts         # App entry point
├── logs/                # Application logs
├── dist/                # Compiled JS (after build)
├── .env                 # Environment variables
├── .gitignore
├── Dockerfile           # Production container
├── docker-compose.yml   # Local dev stack
├── tsconfig.json        # TypeScript config
├── package.json         # Dependencies
├── README.md            # Full documentation
├── QUICKSTART.md        # Quick start guide
└── requests.http        # API test requests
```

---

## Next Integration Steps

1. ✅ **Backend Running** - You are here
2. 📱 **Mobile App** - Connect Expo app to backend
3. 🌐 **Frontend** - Connect React/Vite frontend
4. 💳 **Payment Testing** - Use Stripe test cards
5. 🪙 **Solana Testing** - Use devnet for testing
6. 🚀 **Deployment** - Deploy to production

---

## Support & Resources

- **Stripe Docs**: https://stripe.com/docs
- **PayFast Docs**: https://www.payfast.co.za/documentation
- **Solana Docs**: https://docs.solana.com
- **Express.js Docs**: https://expressjs.com
- **Sequelize Docs**: https://sequelize.org

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | 2026-02-19 | Initial release |

---

**Built with ❤️ for AfriCoin**
