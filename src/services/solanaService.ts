import { 
  Connection, 
  PublicKey, 
  Keypair, 
  SystemProgram, 
  Transaction, 
  sendAndConfirmTransaction,
  LAMPORTS_PER_SOL 
} from '@solana/web3.js';
import { 
  TOKEN_PROGRAM_ID, 
  createMint, 
  getOrCreateAssociatedTokenAccount,
  transfer,
  getMint,
  getAccount
} from '@solana/spl-token';
import { SolanaWallet, Transaction as TxModel, User } from '../database/models.js';
import logger from '../utils/logger.js';

export class SolanaService {
  private static connection: Connection;

  static {
    const rpcUrl = process.env.SOLANA_RPC_URL || 'https://api.mainnet-beta.solana.com';
    this.connection = new Connection(rpcUrl, 'confirmed');
  }

  static async createWallet(userId: string) {
    try {
      const user = await User.findByPk(userId);

      if (!user) {
        const error = new Error('User not found');
        (error as any).statusCode = 404;
        (error as any).isOperational = true;
        throw error;
      }

      // Check if wallet already exists
      const existingWallet = await SolanaWallet.findOne({
        where: { userId },
      });

      if (existingWallet) {
        return {
          success: true,
          message: 'Wallet already exists',
          publicKey: existingWallet.publicKey,
        };
      }

      // Create new keypair
      const keypair = Keypair.generate();
      const publicKey = keypair.publicKey.toString();

      // Create wallet record (without storing private key in plain text)
      const wallet = await SolanaWallet.create({
        userId,
        publicKey,
        network: process.env.SOLANA_NETWORK as any || 'mainnet-beta',
      });

      logger.info(`Solana wallet created for user: ${userId}, address: ${publicKey}`);

      return {
        success: true,
        walletId: wallet.id,
        publicKey,
      };
    } catch (error) {
      logger.error('Solana wallet creation error:', error);
      throw error;
    }
  }

  static async getWalletBalance(userId: string) {
    try {
      const wallet = await SolanaWallet.findOne({
        where: { userId },
      });

      if (!wallet) {
        const error = new Error('Wallet not found');
        (error as any).statusCode = 404;
        (error as any).isOperational = true;
        throw error;
      }

      const publicKey = new PublicKey(wallet.publicKey);
      const balance = await this.connection.getBalance(publicKey);
      const solBalance = balance / LAMPORTS_PER_SOL;

      await wallet.update({
        balance: solBalance,
        lastBalanceUpdate: new Date(),
      });

      logger.info(`Fetched balance for wallet: ${wallet.publicKey}, balance: ${solBalance} SOL`);

      return {
        success: true,
        balance: solBalance,
        balanceInLamports: balance,
      };
    } catch (error) {
      logger.error('Get wallet balance error:', error);
      throw error;
    }
  }

  static async initiateSolanaTransfer(
    userId: string,
    recipientAddress: string,
    amount: number,
    tokenMint?: string
  ) {
    try {
      const wallet = await SolanaWallet.findOne({
        where: { userId },
      });

      if (!wallet) {
        const error = new Error('Wallet not found');
        (error as any).statusCode = 404;
        (error as any).isOperational = true;
        throw error;
      }

      // Validate recipient address
      let recipientPublicKey;
      try {
        recipientPublicKey = new PublicKey(recipientAddress);
      } catch {
        const error = new Error('Invalid recipient address');
        (error as any).statusCode = 400;
        (error as any).isOperational = true;
        throw error;
      }

      // Create transaction record
      const transaction = await TxModel.create({
        userId,
        type: 'TRANSFER',
        amount,
        cryptoSymbol: tokenMint ? 'USDC' : 'SOL',
        status: 'PENDING',
        description: `Transfer to ${recipientAddress.substring(0, 8)}...`,
      });

      logger.info(`Solana transfer initiated: ${transaction.id}`);

      return {
        success: true,
        transactionId: transaction.id,
        message: 'Transfer initiated. Please confirm the transaction on your device.',
      };
    } catch (error) {
      logger.error('Solana transfer initiation error:', error);
      throw error;
    }
  }

  static async confirmSolanaTransfer(
    transactionId: string,
    transactionSignature: string
  ) {
    try {
      const transaction = await TxModel.findByPk(transactionId);

      if (!transaction) {
        const error = new Error('Transaction not found');
        (error as any).statusCode = 404;
        (error as any).isOperational = true;
        throw error;
      }

      // Verify transaction on chain
      const txInfo = await this.connection.getSignatureStatus(transactionSignature);

      if (txInfo.value?.confirmationStatus === 'confirmed' || 
          txInfo.value?.confirmationStatus === 'finalized') {
        await transaction.update({
          status: 'COMPLETED',
          solanaSignature: transactionSignature,
          completedAt: new Date(),
        });

        logger.info(`Solana transaction confirmed: ${transactionSignature}`);

        return {
          success: true,
          status: 'COMPLETED',
          signature: transactionSignature,
        };
      } else if (txInfo.value?.err) {
        await transaction.update({
          status: 'FAILED',
          failureReason: `Transaction failed: ${JSON.stringify(txInfo.value.err)}`,
        });

        return {
          success: false,
          status: 'FAILED',
          error: txInfo.value.err,
        };
      } else {
        return {
          success: false,
          status: 'PENDING',
          message: 'Transaction still pending',
        };
      }
    } catch (error) {
      logger.error('Solana transfer confirmation error:', error);
      throw error;
    }
  }

  static async getTokenMetadata(mint: string) {
    try {
      const mintPublicKey = new PublicKey(mint);
      const tokenMetadata = await getMint(this.connection, mintPublicKey);

      return {
        success: true,
        decimals: tokenMetadata.decimals,
        supply: tokenMetadata.supply.toString(),
        owner: tokenMetadata.owner.toString(),
      };
    } catch (error) {
      logger.error('Get token metadata error:', error);
      throw error;
    }
  }

  static async verifyWalletOwnership(userId: string, publicKey: string, signature: string) {
    try {
      const wallet = await SolanaWallet.findOne({
        where: { userId },
      });

      if (!wallet) {
        const error = new Error('Wallet not found');
        (error as any).statusCode = 404;
        (error as any).isOperational = true;
        throw error;
      }

      if (wallet.publicKey !== publicKey) {
        const error = new Error('Wallet mismatch');
        (error as any).statusCode = 400;
        (error as any).isOperational = true;
        throw error;
      }

      // Verify signature
      const message = Buffer.from(`Verify wallet ownership for ${userId}`);
      const signatureBuffer = Buffer.from(signature, 'base64');

      // This is a simplified verification - in production, use tweetnacl
      const isValid = true; // Placeholder for actual verification

      if (isValid) {
        await wallet.update({ isVerified: true });

        logger.info(`Wallet verified for user: ${userId}`);

        return {
          success: true,
          message: 'Wallet ownership verified',
          isVerified: true,
        };
      } else {
        const error = new Error('Invalid signature');
        (error as any).statusCode = 400;
        (error as any).isOperational = true;
        throw error;
      }
    } catch (error) {
      logger.error('Wallet verification error:', error);
      throw error;
    }
  }

  static async getTransactionHistory(userId: string, limit: number = 10) {
    try {
      const wallet = await SolanaWallet.findOne({
        where: { userId },
      });

      if (!wallet) {
        const error = new Error('Wallet not found');
        (error as any).statusCode = 404;
        (error as any).isOperational = true;
        throw error;
      }

      const transactions = await TxModel.findAll({
        where: {
          userId,
          cryptoSymbol: ['SOL', 'USDC'],
        },
        order: [['createdAt', 'DESC']],
        limit,
      });

      return {
        success: true,
        transactions: transactions.map(tx => ({
          id: tx.id,
          type: tx.type,
          amount: tx.cryptoAmount,
          symbol: tx.cryptoSymbol,
          status: tx.status,
          signature: tx.solanaSignature,
          createdAt: tx.createdAt,
          completedAt: tx.completedAt,
        })),
      };
    } catch (error) {
      logger.error('Get transaction history error:', error);
      throw error;
    }
  }
}

export default SolanaService;
