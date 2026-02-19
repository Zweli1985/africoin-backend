import Stripe from 'stripe';
import { User, KycVerification } from '../database/models.js';
import logger from '../utils/logger.js';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2023-10-16',
});

export class KycService {
  static async initiateKycVerification(userId: string) {
    try {
      const user = await User.findByPk(userId);

      if (!user) {
        const error = new Error('User not found');
        (error as any).statusCode = 404;
        (error as any).isOperational = true;
        throw error;
      }

      // Check existing KYC verification
      let kycVerification = await KycVerification.findOne({
        where: { userId },
      });

      if (kycVerification && kycVerification.status === 'VERIFIED') {
        return {
          success: true,
          message: 'User is already verified',
          status: 'VERIFIED',
        };
      }

      // Create Stripe Identity verification session
      const verificationSession = await stripe.identity.verificationSessions.create({
        type: 'document',
        options: {
          document: {
            allowed_types: ['passport', 'id_card', 'driving_license'],
          },
        },
      });

      if (!kycVerification) {
        kycVerification = await KycVerification.create({
          userId,
          status: 'PENDING',
          stripeVerificationSessionId: verificationSession.id,
          verificationLevel: 'STANDARD',
        });
      } else {
        await kycVerification.update({
          stripeVerificationSessionId: verificationSession.id,
          status: 'PENDING',
        });
      }

      logger.info(`KYC verification initiated for user: ${userId}`);

      return {
        success: true,
        verificationSessionId: verificationSession.id,
        clientSecret: verificationSession.client_secret,
      };
    } catch (error) {
      logger.error('KYC initiation error:', error);
      throw error;
    }
  }

  static async checkKycStatus(userId: string) {
    try {
      let kycVerification = await KycVerification.findOne({
        where: { userId },
      });

      if (!kycVerification) {
        // Create a new KYC record with PENDING status
        kycVerification = await KycVerification.create({
          userId,
          status: 'PENDING',
        });
      }

      // If verification session exists, check status with Stripe
      if (kycVerification.stripeVerificationSessionId) {
        const session = await stripe.identity.verificationSessions.retrieve(
          kycVerification.stripeVerificationSessionId
        );

        if (session.status === 'verified') {
          await kycVerification.update({
            status: 'VERIFIED',
            verificationScore: 1.0,
            verifiedAt: new Date(),
          });

          // Update user KYC status
          const user = await User.findByPk(userId);
          if (user) {
            await user.update({ kycStatus: 'VERIFIED' });
          }
        } else if (session.status === 'unverified') {
          const error = new Error('Verification failed');
          (error as any).statusCode = 400;
          (error as any).isOperational = true;
          throw error;
        }
      }

      return {
        success: true,
        userId,
        status: kycVerification.status,
        verificationLevel: kycVerification.verificationLevel,
        verifiedAt: kycVerification.verifiedAt,
      };
    } catch (error) {
      logger.error('KYC status check error:', error);
      throw error;
    }
  }

  static async submitKycDocuments(
    userId: string,
    documents: {
      documentType: string;
      documentNumber: string;
      firstName: string;
      lastName: string;
      dateOfBirth: string;
      idDocumentUrl?: string;
      proofOfAddressUrl?: string;
    }
  ) {
    try {
      const user = await User.findByPk(userId);

      if (!user) {
        const error = new Error('User not found');
        (error as any).statusCode = 404;
        (error as any).isOperational = true;
        throw error;
      }

      // Update user with document info
      await user.update({
        firstName: documents.firstName,
        lastName: documents.lastName,
        dateOfBirth: new Date(documents.dateOfBirth),
        idType: documents.documentType,
        idNumber: documents.documentNumber,
        idDocumentUrl: documents.idDocumentUrl,
        proofOfAddressUrl: documents.proofOfAddressUrl,
      });

      // Create or update KYC verification
      let kycVerification = await KycVerification.findOne({
        where: { userId },
      });

      if (!kycVerification) {
        kycVerification = await KycVerification.create({
          userId,
          status: 'PENDING',
          documentType: documents.documentType,
          documentNumber: documents.documentNumber,
          documentUrl: documents.idDocumentUrl,
        });
      } else {
        await kycVerification.update({
          documentType: documents.documentType,
          documentNumber: documents.documentNumber,
          documentUrl: documents.idDocumentUrl,
        });
      }

      logger.info(`KYC documents submitted for user: ${userId}`);

      return {
        success: true,
        message: 'Documents submitted for verification',
        status: kycVerification.status,
      };
    } catch (error) {
      logger.error('KYC document submission error:', error);
      throw error;
    }
  }

  static async rejectKyc(userId: string, reason: string) {
    try {
      const kycVerification = await KycVerification.findOne({
        where: { userId },
      });

      if (!kycVerification) {
        const error = new Error('KYC verification not found');
        (error as any).statusCode = 404;
        (error as any).isOperational = true;
        throw error;
      }

      await kycVerification.update({
        status: 'REJECTED',
        rejectionReason: reason,
        rejectionDetails: { rejectedAt: new Date() },
      });

      const user = await User.findByPk(userId);
      if (user) {
        await user.update({
          kycStatus: 'REJECTED',
          kycRejectionReason: reason,
        });
      }

      logger.warn(`KYC rejected for user: ${userId}, reason: ${reason}`);

      return { success: true, message: 'KYC verification rejected' };
    } catch (error) {
      logger.error('KYC rejection error:', error);
      throw error;
    }
  }
}

export default KycService;
