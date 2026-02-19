import { Router, Request, Response } from 'express';
import Joi from 'joi';
import { validate } from '../middleware/validation.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import { authenticateToken, optionalAuth } from '../middleware/auth.js';
import PaymentService from '../services/paymentService.js';

const router = Router();

// Validation schemas
const paymentIntentSchema = Joi.object({
  amount: Joi.number().positive().required(),
  currency: Joi.string().length(3).default('ZAR'),
});

const paymentMethodSchema = Joi.object({
  type: Joi.string().valid('CARD', 'BANK_ACCOUNT', 'MOBILE_MONEY').required(),
  cardToken: Joi.string().when('type', { is: 'CARD', then: Joi.required() }),
  bankDetails: Joi.object().when('type', { is: 'BANK_ACCOUNT', then: Joi.required() }),
  mobileDetails: Joi.object().when('type', { is: 'MOBILE_MONEY', then: Joi.required() }),
});

const payfastPaymentSchema = Joi.object({
  amount: Joi.number().positive().required(),
  itemName: Joi.string().required(),
  itemDescription: Joi.string(),
});

const refundSchema = Joi.object({
  reason: Joi.string().required(),
});

// Create Payment Intent (Stripe)
router.post(
  '/stripe/intent',
  authenticateToken,
  validate(paymentIntentSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const { amount, currency } = req.body;
    const result = await PaymentService.createStripePaymentIntent(
      req.user!.userId,
      amount,
      currency
    );
    res.json(result);
  })
);

// Confirm Stripe Payment
router.post(
  '/stripe/confirm',
  authenticateToken,
  asyncHandler(async (req: Request, res: Response) => {
    const { transactionId, paymentIntentId } = req.body;
    const result = await PaymentService.confirmStripePayment(
      transactionId,
      paymentIntentId
    );
    res.json(result);
  })
);

// Save Payment Method
router.post(
  '/method',
  authenticateToken,
  validate(paymentMethodSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const result = await PaymentService.createPaymentMethod(
      req.user!.userId,
      req.body
    );
    res.json(result);
  })
);

// Initiate PayFast Payment
router.post(
  '/payfast/initiate',
  authenticateToken,
  validate(payfastPaymentSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const { amount, itemName, itemDescription } = req.body;
    const result = await PaymentService.initiatePayFastPayment(
      req.user!.userId,
      amount,
      itemName,
      itemDescription || ''
    );
    res.json(result);
  })
);

// PayFast Callback (from PayFast API)
router.post(
  '/payfast-callback',
  optionalAuth,
  asyncHandler(async (req: Request, res: Response) => {
    const result = await PaymentService.handlePayFastCallback(req.body);
    res.json({
      success: true,
      transaction: result,
    });
  })
);

// PayFast Notify (webhook from PayFast)
router.post(
  '/payfast-notify',
  asyncHandler(async (req: Request, res: Response) => {
    await PaymentService.handlePayFastCallback(req.body);
    res.sendStatus(200);
  })
);

// Process Refund
router.post(
  '/:transactionId/refund',
  authenticateToken,
  validate(refundSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const { transactionId } = req.params;
    const { reason } = req.body;
    const result = await PaymentService.processRefund(transactionId, reason);
    res.json(result);
  })
);

export default router;
