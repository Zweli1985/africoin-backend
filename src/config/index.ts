import dotenv from 'dotenv';

dotenv.config();

export interface AppConfig {
  server: {
    port: number;
    env: string;
    apiUrl: string;
    frontendUrl: string;
  };
  database: {
    url: string;
  };
  jwt: {
    secret: string;
    expiresIn: string;
  };
  stripe: {
    publicKey: string;
    secretKey: string;
    webhookSecret: string;
  };
  payfast: {
    merchantId: string;
    merchantKey: string;
    passphrase: string;
    apiUrl: string;
  };
  solana: {
    rpcUrl: string;
    network: string;
    programId: string;
  };
  email: {
    host: string;
    port: number;
    user: string;
    password: string;
  };
  logging: {
    level: string;
  };
}

const config: AppConfig = {
  server: {
    port: parseInt(process.env.PORT || '3001', 10),
    env: process.env.NODE_ENV || 'development',
    apiUrl: process.env.API_URL || 'http://localhost:3001',
    frontendUrl: process.env.FRONTEND_URL || 'http://localhost:5173',
  },
  database: {
    url: process.env.DATABASE_URL || 'sqlite::memory:',
  },
  jwt: {
    secret: process.env.JWT_SECRET || 'your-super-secret-jwt-key',
    expiresIn: '7d',
  },
  stripe: {
    publicKey: process.env.STRIPE_PUBLIC_KEY || '',
    secretKey: process.env.STRIPE_SECRET_KEY || '',
    webhookSecret: process.env.STRIPE_WEBHOOK_SECRET || '',
  },
  payfast: {
    merchantId: process.env.PAYFAST_MERCHANT_ID || '',
    merchantKey: process.env.PAYFAST_MERCHANT_KEY || '',
    passphrase: process.env.PAYFAST_PASSPHRASE || '',
    apiUrl: process.env.PAYFAST_API_URL || 'https://api.payfast.co.za',
  },
  solana: {
    rpcUrl: process.env.SOLANA_RPC_URL || 'https://api.mainnet-beta.solana.com',
    network: process.env.SOLANA_NETWORK || 'mainnet-beta',
    programId: process.env.SOLANA_PROGRAM_ID || '',
  },
  email: {
    host: process.env.SMTP_HOST || '',
    port: parseInt(process.env.SMTP_PORT || '587', 10),
    user: process.env.SMTP_USER || '',
    password: process.env.SMTP_PASSWORD || '',
  },
  logging: {
    level: process.env.LOG_LEVEL || 'debug',
  },
};

export default config;
