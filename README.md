# AfriCoin Backend API

A comprehensive Node.js/Express backend for AfriCoin - a payment processing platform with support for Stripe, PayFast, KYC verification, and Solana blockchain integration.

## Features

✅ **Authentication & Authorization**
- JWT-based authentication
- User registration and login
- Token refresh and verification
- Password management

✅ **Payment Processing**
- Stripe integration for global payments
- PayFast integration for South African payments
- Multiple payment methods (cards, bank accounts, mobile money)
- Transaction history and management
- Refund processing

✅ **KYC Verification**
- Document verification using Stripe Identity
- Multi-level verification (Basic, Standard, Enhanced)
- ID document upload and validation
- Proof of address verification

✅ **Solana Integration**
- Wallet creation and management
- Token transfers
- Balance queries
- Transaction history
- USDC support

✅ **Security Features**
- CORS protection
- Rate limiting
- Helmet for HTTP headers
- JWT authentication
- Password hashing with bcrypt
- Request validation with Joi

## Tech Stack

- **Node.js** with Express.js
- **TypeScript** for type safety
- **PostgreSQL/SQLite** database with Sequelize ORM
- **Stripe API** for payments
- **PayFast API** for SA payments
- **Solana Web3.js** for blockchain
- **Winston** for logging
- **JWT** for authentication

## Prerequisites

- Node.js 18+ 
- npm or yarn
- PostgreSQL (optional, SQLite works for development)
- Stripe account
- PayFast merchant account (for SA payments)
- Solana RPC endpoint access

## Installation

### 1. Clone and Setup

```bash
cd backend
npm install
```

### 2. Environment Variables

Copy `.env.example` to `.env` and fill in your credentials:

```bash
cp .env.example .env
```

Key environment variables:
- `DATABASE_URL` - PostgreSQL or SQLite connection string
- `JWT_SECRET` - Secret key for JWT signing
- `STRIPE_SECRET_KEY` - Stripe API key
- `PAYFAST_MERCHANT_ID` - PayFast merchant ID
- `SOLANA_RPC_URL` - Solana RPC endpoint

### 3. Database Setup

```bash
# Initialize database
npm run migrate
```

### 4. Start Development Server

```bash
npm run dev
```

The server will start on `http://localhost:3001`

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user
- `POST /api/auth/verify` - Verify JWT token
- `POST /api/auth/refresh` - Refresh JWT token
- `POST /api/auth/change-password` - Change user password

### KYC Verification
- `POST /api/kyc/initiate` - Start KYC verification
- `GET /api/kyc/status` - Check KYC status
- `POST /api/kyc/submit` - Submit KYC documents

### Payments
- `POST /api/payment/stripe/intent` - Create Stripe payment intent
- `POST /api/payment/stripe/confirm` - Confirm Stripe payment
- `POST /api/payment/method` - Add payment method
- `POST /api/payment/payfast/initiate` - Initiate PayFast payment
- `POST /api/payment/:transactionId/refund` - Refund transaction

### Transactions
- `GET /api/transaction` - List user transactions
- `GET /api/transaction/:id` - Get transaction details
- `GET /api/transaction/summary/stats` - Transaction summary
- `POST /api/transaction/:id/cancel` - Cancel transaction

### Solana
- `POST /api/solana/wallet/create` - Create Solana wallet
- `GET /api/solana/wallet/balance` - Get wallet balance
- `POST /api/solana/transfer/initiate` - Initiate transfer
- `POST /api/solana/transfer/:id/confirm` - Confirm transfer
- `GET /api/solana/token/:mint/metadata` - Get token metadata

### User Management
- `GET /api/user/profile` - Get user profile
- `PUT /api/user/profile` - Update profile
- `GET /api/user/payment-methods` - List payment methods
- `DELETE /api/user/payment-methods/:id` - Delete payment method
- `POST /api/user/2fa/enable` - Enable 2FA
- `POST /api/user/2fa/disable` - Disable 2FA

## Project Structure

```
backend/
├── src/
│   ├── config/          # Configuration files
│   ├── database/        # Database models and initialization
│   ├── middleware/      # Express middleware
│   ├── routes/          # API route handlers
│   ├── services/        # Business logic services
│   ├── types/           # TypeScript type definitions
│   ├── utils/           # Utility functions and logger
│   └── index.ts         # Application entry point
├── dist/                # Compiled JavaScript (after build)
├── .env                 # Environment variables (not in git)
├── .env.example         # Example environment file
├── tsconfig.json        # TypeScript configuration
└── package.json         # Project dependencies
```

## Development

### Run in Development Mode
```bash
npm run dev
```

### Build for Production
```bash
npm run build
```

### Start Production Server
```bash
npm start
```

### Linting
```bash
npm run lint
```

### Format Code
```bash
npm run format
```

## Database Models

### User
- ID, email, phone
- Password hash
- Personal info (name, DOB, address)
- KYC status and documents
- 2FA settings

### Transaction
- User ID, transaction type
- Amount and currency
- Payment method
- Status tracking
- Provider-specific IDs (Stripe, PayFast, Solana)

### PaymentMethod
- Type (card, bank, mobile, crypto)
- Provider details
- Verification status

### KycVerification
- Document type and number
- Verification status
- Stripe Identity session ID

### SolanaWallet
- Public key address
- Network (mainnet, testnet, devnet)
- Balance tracking

## Security Best Practices

1. **Never commit `.env` files** - Use `.env.example` instead
2. **Validate all input** - Using Joi schemas
3. **Use HTTPS in production** - Configure SSL/TLS
4. **Rate limiting** - Enabled on all endpoints
5. **CORS protection** - Configured for frontend domain
6. **Password hashing** - Using bcrypt with salt rounds
7. **JWT tokens** - Secure signing with strong secret
8. **Database encryption** - Consider at-rest encryption for sensitive fields

## Error Handling

All endpoints return consistent error responses:

```json
{
  "success": false,
  "message": "Error description",
  "details": [
    {
      "field": "fieldName",
      "message": "Validation error message"
    }
  ]
}
```

## Logging

Logs are written to:
- Console (development)
- `logs/all.log` - All logs
- `logs/error.log` - Error logs only

## Testing

```bash
npm run test
```

## Deployment

### Docker Setup
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY dist ./dist
EXPOSE 3001
CMD ["npm", "start"]
```

### Environment for Production
- Use PostgreSQL for database
- Set `NODE_ENV=production`
- Use strong JWT secret
- Enable all payment provider credentials
- Configure proper CORS origin
- Use environment-specific API keys

## Troubleshooting

### Database Connection Issues
- Check `DATABASE_URL` format
- Ensure PostgreSQL is running
- Verify database exists and user has permissions

### Stripe/PayFast Integration
- Verify API keys are correct
- Check webhook URLs are accessible
- Use test credentials for development

### Solana Integration
- Verify RPC URL is accessible
- Use testnet for development
- Check account has sufficient SOL for fees

## Support

For issues, questions, or contributions, contact the development team.

## License

Proprietary - AfriCoin Platform
