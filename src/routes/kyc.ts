import { Router, Request, Response } from 'express';
import Joi from 'joi';
import { validate } from '../middleware/validation.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import { authenticateToken } from '../middleware/auth.js';
import KycService from '../services/kycService.js';

const router = Router();

// Validation schemas
const submitDocumentsSchema = Joi.object({
  documentType: Joi.string().valid('PASSPORT', 'NATIONAL_ID', 'DRIVERS_LICENSE', 'BUSINESS_REGISTRATION').required(),
  documentNumber: Joi.string().required(),
  firstName: Joi.string().required(),
  lastName: Joi.string().required(),
  dateOfBirth: Joi.string().isoDate().required(),
  idDocumentUrl: Joi.string().uri(),
  proofOfAddressUrl: Joi.string().uri(),
});

// Initiate KYC Verification
router.post(
  '/initiate',
  authenticateToken,
  asyncHandler(async (req: Request, res: Response) => {
    const result = await KycService.initiateKycVerification(req.user!.userId);
    res.json(result);
  })
);

// Check KYC Status
router.get(
  '/status',
  authenticateToken,
  asyncHandler(async (req: Request, res: Response) => {
    const result = await KycService.checkKycStatus(req.user!.userId);
    res.json(result);
  })
);

// Submit KYC Documents
router.post(
  '/submit',
  authenticateToken,
  validate(submitDocumentsSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const result = await KycService.submitKycDocuments(req.user!.userId, req.body);
    res.json(result);
  })
);

// Verification Callback (for Stripe Identity)
router.post(
  '/callback',
  asyncHandler(async (req: Request, res: Response) => {
    const { verificationSessionId, status } = req.body;

    if (status === 'verified') {
      res.json({
        success: true,
        message: 'Verification completed successfully',
      });
    } else {
      res.status(400).json({
        success: false,
        message: 'Verification failed',
      });
    }
  })
);

export default router;
