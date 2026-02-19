import { Router, Request, Response } from 'express';
import Joi from 'joi';
import { validate, validateQuery } from '../middleware/validation.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import { authenticateToken } from '../middleware/auth.js';
import { Transaction } from '../database/models.js';

const router = Router();

// Validation schemas
const listTransactionsSchema = Joi.object({
  type: Joi.string().valid('DEPOSIT', 'WITHDRAWAL', 'TRANSFER', 'PAYMENT', 'REFUND'),
  status: Joi.string().valid('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED', 'CANCELLED', 'REFUNDED'),
  startDate: Joi.string().isoDate(),
  endDate: Joi.string().isoDate(),
  limit: Joi.number().integer().min(1).max(100).default(20),
  offset: Joi.number().integer().min(0).default(0),
});

// Get All Transactions
router.get(
  '/',
  validateQuery(listTransactionsSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const { type, status, startDate, endDate, limit, offset } = req.query as any;

    const where: any = { userId: req.user!.userId };

    if (type) where.type = type;
    if (status) where.status = status;

    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.$gte = new Date(startDate);
      if (endDate) where.createdAt.$lte = new Date(endDate);
    }

    const transactions = await Transaction.findAndCountAll({
      where,
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [['createdAt', 'DESC']],
    });

    res.json({
      success: true,
      data: transactions.rows,
      pagination: {
        total: transactions.count,
        limit: parseInt(limit),
        offset: parseInt(offset),
      },
    });
  })
);

// Get Transaction by ID
router.get(
  '/:id',
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;

    const transaction = await Transaction.findOne({
      where: {
        id,
        userId: req.user!.userId,
      },
    });

    if (!transaction) {
      res.status(404).json({
        success: false,
        message: 'Transaction not found',
      });
      return;
    }

    res.json({
      success: true,
      data: transaction,
    });
  })
);

// Get Transaction Summary
router.get(
  '/summary/stats',
  asyncHandler(async (req: Request, res: Response) => {
    const transactions = await Transaction.findAll({
      where: {
        userId: req.user!.userId,
        status: 'COMPLETED',
      },
    });

    const summary = {
      totalTransactions: transactions.length,
      totalDeposits: transactions
        .filter(t => t.type === 'DEPOSIT')
        .reduce((sum, t) => sum + parseFloat(t.amount.toString()), 0),
      totalWithdrawals: transactions
        .filter(t => t.type === 'WITHDRAWAL')
        .reduce((sum, t) => sum + parseFloat(t.amount.toString()), 0),
      totalTransfers: transactions
        .filter(t => t.type === 'TRANSFER')
        .reduce((sum, t) => sum + parseFloat(t.amount.toString()), 0),
      averageTransactionAmount:
        transactions.length > 0
          ? transactions.reduce((sum, t) => sum + parseFloat(t.amount.toString()), 0) /
            transactions.length
          : 0,
    };

    res.json({
      success: true,
      summary,
    });
  })
);

// Cancel Transaction
router.post(
  '/:id/cancel',
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;

    const transaction = await Transaction.findOne({
      where: {
        id,
        userId: req.user!.userId,
      },
    });

    if (!transaction) {
      res.status(404).json({
        success: false,
        message: 'Transaction not found',
      });
      return;
    }

    if (transaction.status !== 'PENDING' && transaction.status !== 'PROCESSING') {
      res.status(400).json({
        success: false,
        message: 'Can only cancel pending or processing transactions',
      });
      return;
    }

    await transaction.update({ status: 'CANCELLED' });

    res.json({
      success: true,
      message: 'Transaction cancelled successfully',
      transaction,
    });
  })
);

export default router;
