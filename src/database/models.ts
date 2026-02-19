import { Sequelize, DataTypes, Model } from 'sequelize';
import dotenv from 'dotenv';

dotenv.config();

const databaseUrl = process.env.DATABASE_URL || 'sqlite::memory:';

export const sequelize = new Sequelize(databaseUrl, {
  dialect: databaseUrl.includes('postgres') ? 'postgres' : 'sqlite',
  logging: process.env.NODE_ENV === 'development' ? console.log : false,
});

// User Model
export class User extends Model {}

User.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    email: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
    },
    phone: {
      type: DataTypes.STRING,
    },
    passwordHash: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    firstName: {
      type: DataTypes.STRING,
    },
    lastName: {
      type: DataTypes.STRING,
    },
    dateOfBirth: {
      type: DataTypes.DATE,
    },
    country: {
      type: DataTypes.STRING,
    },
    state: {
      type: DataTypes.STRING,
    },
    city: {
      type: DataTypes.STRING,
    },
    address: {
      type: DataTypes.STRING,
    },
    idType: {
      type: DataTypes.ENUM('PASSPORT', 'NATIONAL_ID', 'DRIVERS_LICENSE', 'BUSINESS_REGISTRATION'),
    },
    idNumber: {
      type: DataTypes.STRING,
    },
    idExpiry: {
      type: DataTypes.DATE,
    },
    profileImageUrl: {
      type: DataTypes.STRING,
    },
    idDocumentUrl: {
      type: DataTypes.STRING,
    },
    proofOfAddressUrl: {
      type: DataTypes.STRING,
    },
    kycStatus: {
      type: DataTypes.ENUM('PENDING', 'VERIFIED', 'REJECTED', 'EXPIRED'),
      defaultValue: 'PENDING',
    },
    kycRejectionReason: {
      type: DataTypes.STRING,
    },
    twoFactorEnabled: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    twoFactorSecret: {
      type: DataTypes.STRING,
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
    },
    lastLoginAt: {
      type: DataTypes.DATE,
    },
    createdAt: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
    },
    updatedAt: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
    },
  },
  {
    sequelize,
    tableName: 'users',
  }
);

// Payment Method Model
export class PaymentMethod extends Model {}

PaymentMethod.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    userId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: User,
        key: 'id',
      },
    },
    type: {
      type: DataTypes.ENUM('CARD', 'BANK_ACCOUNT', 'MOBILE_MONEY', 'CRYPTO_WALLET'),
      allowNull: false,
    },
    provider: {
      type: DataTypes.ENUM('STRIPE', 'PAYFAST', 'LUNO', 'PAYPAL'),
    },
    stripePaymentMethodId: {
      type: DataTypes.STRING,
    },
    cardLastFour: {
      type: DataTypes.STRING,
    },
    cardBrand: {
      type: DataTypes.ENUM('VISA', 'MASTERCARD', 'AMEX', 'DISCOVER'),
    },
    cardExpiryMonth: {
      type: DataTypes.INTEGER,
    },
    cardExpiryYear: {
      type: DataTypes.INTEGER,
    },
    bankAccountNumber: {
      type: DataTypes.STRING,
    },
    bankCode: {
      type: DataTypes.STRING,
    },
    bankName: {
      type: DataTypes.STRING,
    },
    accountHolderName: {
      type: DataTypes.STRING,
    },
    mobilePhoneNumber: {
      type: DataTypes.STRING,
    },
    mobileProvider: {
      type: DataTypes.STRING,
    },
    walletAddress: {
      type: DataTypes.STRING,
    },
    isDefault: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    isVerified: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    createdAt: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
    },
  },
  {
    sequelize,
    tableName: 'payment_methods',
  }
);

// Transaction Model
export class Transaction extends Model {}

Transaction.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    userId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: User,
        key: 'id',
      },
    },
    type: {
      type: DataTypes.ENUM('DEPOSIT', 'WITHDRAWAL', 'TRANSFER', 'PAYMENT', 'REFUND'),
      allowNull: false,
    },
    amount: {
      type: DataTypes.DECIMAL(18, 8),
      allowNull: false,
    },
    currency: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: 'ZAR',
    },
    cryptoAmount: {
      type: DataTypes.DECIMAL(18, 8),
    },
    cryptoSymbol: {
      type: DataTypes.STRING,
      defaultValue: 'USDC',
    },
    exchangeRate: {
      type: DataTypes.DECIMAL(18, 8),
    },
    status: {
      type: DataTypes.ENUM('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED', 'CANCELLED', 'REFUNDED'),
      defaultValue: 'PENDING',
    },
    paymentMethodId: {
      type: DataTypes.UUID,
      references: {
        model: PaymentMethod,
        key: 'id',
      },
    },
    stripeTransactionId: {
      type: DataTypes.STRING,
    },
    payfastTransactionId: {
      type: DataTypes.STRING,
    },
    solanaSignature: {
      type: DataTypes.STRING,
    },
    description: {
      type: DataTypes.STRING,
    },
    failureReason: {
      type: DataTypes.STRING,
    },
    metadata: {
      type: DataTypes.JSON,
    },
    createdAt: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
    },
    completedAt: {
      type: DataTypes.DATE,
    },
    updatedAt: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
    },
  },
  {
    sequelize,
    tableName: 'transactions',
  }
);

// KYC Verification Model
export class KycVerification extends Model {}

KycVerification.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    userId: {
      type: DataTypes.UUID,
      allowNull: false,
      unique: true,
      references: {
        model: User,
        key: 'id',
      },
    },
    status: {
      type: DataTypes.ENUM('PENDING', 'VERIFIED', 'REJECTED'),
      defaultValue: 'PENDING',
    },
    verificationLevel: {
      type: DataTypes.ENUM('BASIC', 'STANDARD', 'ENHANCED'),
      defaultValue: 'BASIC',
    },
    documentType: {
      type: DataTypes.STRING,
    },
    documentNumber: {
      type: DataTypes.STRING,
    },
    documentUrl: {
      type: DataTypes.STRING,
    },
    faceScanUrl: {
      type: DataTypes.STRING,
    },
    stripeVerificationSessionId: {
      type: DataTypes.STRING,
    },
    verificationScore: {
      type: DataTypes.DECIMAL(3, 2),
    },
    rejectionReason: {
      type: DataTypes.STRING,
    },
    rejectionDetails: {
      type: DataTypes.JSON,
    },
    verifiedAt: {
      type: DataTypes.DATE,
    },
    expiresAt: {
      type: DataTypes.DATE,
    },
    createdAt: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
    },
    updatedAt: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
    },
  },
  {
    sequelize,
    tableName: 'kyc_verifications',
  }
);

// Solana Wallet Model
export class SolanaWallet extends Model {}

SolanaWallet.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    userId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: User,
        key: 'id',
      },
    },
    publicKey: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
    },
    encryptedPrivateKey: {
      type: DataTypes.STRING,
    },
    network: {
      type: DataTypes.ENUM('mainnet-beta', 'testnet', 'devnet'),
      defaultValue: 'mainnet-beta',
    },
    isVerified: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    balance: {
      type: DataTypes.DECIMAL(18, 8),
      defaultValue: 0,
    },
    lastBalanceUpdate: {
      type: DataTypes.DATE,
    },
    createdAt: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
    },
    updatedAt: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
    },
  },
  {
    sequelize,
    tableName: 'solana_wallets',
  }
);

// Associations
User.hasMany(PaymentMethod, { foreignKey: 'userId', as: 'paymentMethods' });
PaymentMethod.belongsTo(User, { foreignKey: 'userId' });

User.hasMany(Transaction, { foreignKey: 'userId', as: 'transactions' });
Transaction.belongsTo(User, { foreignKey: 'userId' });

User.hasOne(KycVerification, { foreignKey: 'userId', as: 'kycVerification' });
KycVerification.belongsTo(User, { foreignKey: 'userId' });

User.hasMany(SolanaWallet, { foreignKey: 'userId', as: 'solanaWallets' });
SolanaWallet.belongsTo(User, { foreignKey: 'userId' });

Transaction.belongsTo(PaymentMethod, { foreignKey: 'paymentMethodId' });
PaymentMethod.hasMany(Transaction, { foreignKey: 'paymentMethodId' });

export default sequelize;
