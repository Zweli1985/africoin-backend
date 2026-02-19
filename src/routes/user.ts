import { Router, Request, Response } from 'express';
import Joi from 'joi';
import { validate } from '../middleware/validation.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import { authenticateToken } from '../middleware/auth.js';
import { User, PaymentMethod, SolanaWallet } from '../database/models.js';
import logger from '../utils/logger.js';

const router = Router();

// Validation schemas
const updateProfileSchema = Joi.object({
  firstName: Joi.string().max(50),
  lastName: Joi.string().max(50),
  phone: Joi.string().pattern(/^\+?[0-9]{10,}$/),
  country: Joi.string(),
  state: Joi.string(),
  city: Joi.string(),
  address: Joi.string(),
});

// Get User Profile
router.get(
  '/profile',
  asyncHandler(async (req: Request, res: Response) => {
    const user = await User.findByPk(req.user!.userId);

    if (!user) {
      res.status(404).json({
        success: false,
        message: 'User not found',
      });
      return;
    }

    res.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        phone: user.phone,
        dateOfBirth: user.dateOfBirth,
        country: user.country,
        state: user.state,
        city: user.city,
        address: user.address,
        profileImageUrl: user.profileImageUrl,
        kycStatus: user.kycStatus,
        twoFactorEnabled: user.twoFactorEnabled,
        createdAt: user.createdAt,
        lastLoginAt: user.lastLoginAt,
      },
    });
  })
);

// Update User Profile
router.put(
  '/profile',
  validate(updateProfileSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const user = await User.findByPk(req.user!.userId);

    if (!user) {
      res.status(404).json({
        success: false,
        message: 'User not found',
      });
      return;
    }

    await user.update(req.body);
    logger.info(`User profile updated: ${user.email}`);

    res.json({
      success: true,
      message: 'Profile updated successfully',
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        phone: user.phone,
        country: user.country,
        state: user.state,
        city: user.city,
        address: user.address,
      },
    });
  })
);

// Get Payment Methods
router.get(
  '/payment-methods',
  asyncHandler(async (req: Request, res: Response) => {
    const paymentMethods = await PaymentMethod.findAll({
      where: { userId: req.user!.userId },
    });

    res.json({
      success: true,
      paymentMethods: paymentMethods.map(pm => ({
        id: pm.id,
        type: pm.type,
        provider: pm.provider,
        cardLastFour: pm.cardLastFour,
        cardBrand: pm.cardBrand,
        bankName: pm.bankName,
        isDefault: pm.isDefault,
        isVerified: pm.isVerified,
        createdAt: pm.createdAt,
      })),
    });
  })
);

// Delete Payment Method
router.delete(
  '/payment-methods/:id',
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;

    const paymentMethod = await PaymentMethod.findOne({
      where: {
        id,
        userId: req.user!.userId,
      },
    });

    if (!paymentMethod) {
      res.status(404).json({
        success: false,
        message: 'Payment method not found',
      });
      return;
    }

    await paymentMethod.destroy();
    logger.info(`Payment method deleted: ${id}`);

    res.json({
      success: true,
      message: 'Payment method deleted successfully',
    });
  })
);

// Set Default Payment Method
router.patch(
  '/payment-methods/:id/default',
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;

    const paymentMethod = await PaymentMethod.findOne({
      where: {
        id,
        userId: req.user!.userId,
      },
    });

    if (!paymentMethod) {
      res.status(404).json({
        success: false,
        message: 'Payment method not found',
      });
      return;
    }

    // Update all payment methods to not default
    await PaymentMethod.update(
      { isDefault: false },
      { where: { userId: req.user!.userId } }
    );

    // Set this as default
    await paymentMethod.update({ isDefault: true });

    res.json({
      success: true,
      message: 'Default payment method updated',
    });
  })
);

// Get Solana Wallets
router.get(
  '/solana-wallets',
  asyncHandler(async (req: Request, res: Response) => {
    const wallets = await SolanaWallet.findAll({
      where: { userId: req.user!.userId },
    });

    res.json({
      success: true,
      wallets: wallets.map(w => ({
        id: w.id,
        publicKey: w.publicKey,
        network: w.network,
        isVerified: w.isVerified,
        balance: w.balance,
        lastBalanceUpdate: w.lastBalanceUpdate,
        createdAt: w.createdAt,
      })),
    });
  })
);

// Enable 2FA
router.post(
  '/2fa/enable',
  asyncHandler(async (req: Request, res: Response) => {
    const user = await User.findByPk(req.user!.userId);

    if (!user) {
      res.status(404).json({
        success: false,
        message: 'User not found',
      });
      return;
    }

    // In production, use a proper 2FA library like speakeasy
    const secret = Math.random().toString(36).substring(2, 15);

    await user.update({
      twoFactorSecret: secret,
      twoFactorEnabled: true,
    });

    logger.info(`2FA enabled for user: ${user.email}`);

    res.json({
      success: true,
      message: '2FA enabled successfully',
      secret,
    });
  })
);

// Disable 2FA
router.post(
  '/2fa/disable',
  asyncHandler(async (req: Request, res: Response) => {
    const user = await User.findByPk(req.user!.userId);

    if (!user) {
      res.status(404).json({
        success: false,
        message: 'User not found',
      });
      return;
    }

    await user.update({
      twoFactorEnabled: false,
      twoFactorSecret: null,
    });

    logger.info(`2FA disabled for user: ${user.email}`);

    res.json({
      success: true,
      message: '2FA disabled successfully',
    });
  })
);

export default router;
