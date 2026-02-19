import { Router, Request, Response } from 'express';
import Joi from 'joi';
import { validate } from '../middleware/validation.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import { authenticateToken } from '../middleware/auth.js';
import SolanaService from '../services/solanaService.js';

const router = Router();

// Validation schemas
const transferSchema = Joi.object({
  recipientAddress: Joi.string().required(),
  amount: Joi.number().positive().required(),
  tokenMint: Joi.string(),
});

const confirmTransferSchema = Joi.object({
  transactionSignature: Joi.string().required(),
});

const verifyWalletSchema = Joi.object({
  publicKey: Joi.string().required(),
  signature: Joi.string().required(),
});

// Create Solana Wallet
router.post(
  '/wallet/create',
  authenticateToken,
  asyncHandler(async (req: Request, res: Response) => {
    const result = await SolanaService.createWallet(req.user!.userId);
    res.json(result);
  })
);

// Get Wallet Balance
router.get(
  '/wallet/balance',
  authenticateToken,
  asyncHandler(async (req: Request, res: Response) => {
    const result = await SolanaService.getWalletBalance(req.user!.userId);
    res.json(result);
  })
);

// Initiate Transfer
router.post(
  '/transfer/initiate',
  authenticateToken,
  validate(transferSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const { recipientAddress, amount, tokenMint } = req.body;
    const result = await SolanaService.initiateSolanaTransfer(
      req.user!.userId,
      recipientAddress,
      amount,
      tokenMint
    );
    res.json(result);
  })
);

// Confirm Transfer
router.post(
  '/transfer/:transactionId/confirm',
  authenticateToken,
  validate(confirmTransferSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const { transactionId } = req.params;
    const { transactionSignature } = req.body;
    const result = await SolanaService.confirmSolanaTransfer(
      transactionId,
      transactionSignature
    );
    res.json(result);
  })
);

// Get Token Metadata
router.get(
  '/token/:mint/metadata',
  asyncHandler(async (req: Request, res: Response) => {
    const { mint } = req.params;
    const result = await SolanaService.getTokenMetadata(mint);
    res.json(result);
  })
);

// Verify Wallet Ownership
router.post(
  '/wallet/verify',
  authenticateToken,
  validate(verifyWalletSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const { publicKey, signature } = req.body;
    const result = await SolanaService.verifyWalletOwnership(
      req.user!.userId,
      publicKey,
      signature
    );
    res.json(result);
  })
);

// Get Transaction History
router.get(
  '/transactions/history',
  authenticateToken,
  asyncHandler(async (req: Request, res: Response) => {
    const limit = parseInt(req.query.limit as string) || 10;
    const result = await SolanaService.getTransactionHistory(
      req.user!.userId,
      limit
    );
    res.json(result);
  })
);

export default router;
