import Stripe from 'stripe';
import axios from 'axios';
import crypto from 'crypto';
import { Transaction, PaymentMethod, User } from '../database/models.js';
import logger from '../utils/logger.js';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2023-10-16',
});

export class PaymentService {
  // STRIPE INTEGRATION
  static async createStripePaymentIntent(
    userId: string,
    amount: number,
    currency: string = 'ZAR'
  ) {
    try {
      const user = await User.findByPk(userId);

      if (!user) {
        const error = new Error('User not found');
        (error as any).statusCode = 404;
        (error as any).isOperational = true;
        throw error;
      }

      const paymentIntent = await stripe.paymentIntents.create({
        amount: Math.round(amount * 100), // Convert to cents
        currency: currency.toLowerCase(),
        metadata: {
          userId,
          email: user.email,
        },
      });

      // Create transaction record
      const transaction = await Transaction.create({
        userId,
        type: 'DEPOSIT',
        amount,
        currency,
        status: 'PENDING',
        stripeTransactionId: paymentIntent.id,
      });

      logger.info(`Payment intent created: ${paymentIntent.id} for user: ${userId}`);

      return {
        success: true,
        clientSecret: paymentIntent.client_secret,
        transactionId: transaction.id,
      };
    } catch (error) {
      logger.error('Stripe payment intent creation error:', error);
      throw error;
    }
  }

  static async confirmStripePayment(
    transactionId: string,
    paymentIntentId: string
  ) {
    try {
      const transaction = await Transaction.findByPk(transactionId);

      if (!transaction) {
        const error = new Error('Transaction not found');
        (error as any).statusCode = 404;
        (error as any).isOperational = true;
        throw error;
      }

      const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);

      if (paymentIntent.status === 'succeeded') {
        await transaction.update({
          status: 'COMPLETED',
          completedAt: new Date(),
        });

        logger.info(`Payment confirmed: ${paymentIntentId}`);

        return {
          success: true,
          status: 'COMPLETED',
          amount: transaction.amount,
        };
      } else if (paymentIntent.status === 'requires_action') {
        return {
          success: false,
          status: 'REQUIRES_ACTION',
          message: 'Payment requires additional action',
        };
      } else {
        await transaction.update({
          status: 'FAILED',
          failureReason: 'Payment processing failed',
        });

        return {
          success: false,
          status: 'FAILED',
          message: 'Payment failed',
        };
      }
    } catch (error) {
      logger.error('Payment confirmation error:', error);
      throw error;
    }
  }

  static async createPaymentMethod(
    userId: string,
    methodData: {
      type: 'CARD' | 'BANK_ACCOUNT' | 'MOBILE_MONEY';
      cardToken?: string;
      bankDetails?: any;
      mobileDetails?: any;
    }
  ) {
    try {
      if (methodData.type === 'CARD' && methodData.cardToken) {
        const paymentMethod = await stripe.paymentMethods.create({
          type: 'card',
          card: { token: methodData.cardToken },
        });

        const card = paymentMethod.card;

        const savedMethod = await PaymentMethod.create({
          userId,
          type: 'CARD',
          provider: 'STRIPE',
          stripePaymentMethodId: paymentMethod.id,
          cardLastFour: card?.last4,
          cardBrand: (card?.brand?.toUpperCase() as any) || 'UNKNOWN',
          cardExpiryMonth: card?.exp_month,
          cardExpiryYear: card?.exp_year,
          isVerified: true,
        });

        logger.info(`Payment method added for user: ${userId}`);

        return {
          success: true,
          paymentMethodId: savedMethod.id,
          lastFour: savedMethod.cardLastFour,
        };
      } else if (methodData.type === 'BANK_ACCOUNT' && methodData.bankDetails) {
        const savedMethod = await PaymentMethod.create({
          userId,
          type: 'BANK_ACCOUNT',
          provider: 'PAYFAST',
          bankAccountNumber: methodData.bankDetails.accountNumber,
          bankCode: methodData.bankDetails.bankCode,
          bankName: methodData.bankDetails.bankName,
          accountHolderName: methodData.bankDetails.accountHolderName,
        });

        return {
          success: true,
          paymentMethodId: savedMethod.id,
        };
      }

      const error = new Error('Invalid payment method type');
      (error as any).statusCode = 400;
      (error as any).isOperational = true;
      throw error;
    } catch (error) {
      logger.error('Payment method creation error:', error);
      throw error;
    }
  }

  // PAYFAST INTEGRATION (South Africa)
  static async initiatePayFastPayment(
    userId: string,
    amount: number,
    itemName: string,
    itemDescription: string
  ) {
    try {
      const user = await User.findByPk(userId);

      if (!user) {
        const error = new Error('User not found');
        (error as any).statusCode = 404;
        (error as any).isOperational = true;
        throw error;
      }

      // Create transaction record
      const transaction = await Transaction.create({
        userId,
        type: 'DEPOSIT',
        amount,
        currency: 'ZAR',
        status: 'PENDING',
        description: itemName,
      });

      const payfastData = {
        merchant_id: process.env.PAYFAST_MERCHANT_ID || '',
        merchant_key: process.env.PAYFAST_MERCHANT_KEY || '',
        return_url: `${process.env.API_URL}/api/payment/payfast-callback`,
        cancel_url: `${process.env.FRONTEND_URL}/payment/cancelled`,
        notify_url: `${process.env.API_URL}/api/payment/payfast-notify`,
        name_first: user.firstName || '',
        name_last: user.lastName || '',
        email_address: user.email,
        item_name: itemName,
        item_description: itemDescription,
        amount: amount.toFixed(2),
        reference: transaction.id,
        custom_int1: parseInt(userId),
        custom_str1: transaction.id,
      };

      // Generate signature
      const signature = this.generatePayFastSignature(payfastData);
      (payfastData as any).signature = signature;

      logger.info(`PayFast payment initiated for user: ${userId}, transaction: ${transaction.id}`);

      return {
        success: true,
        transactionId: transaction.id,
        paymentData: payfastData,
        paymentUrl: 'https://www.payfast.co.za/eng/process',
      };
    } catch (error) {
      logger.error('PayFast payment initiation error:', error);
      throw error;
    }
  }

  static async handlePayFastCallback(data: any) {
    try {
      // Verify signature
      const signature = data.signature;
      delete data.signature;

      const calculatedSignature = this.generatePayFastSignature(data);

      if (signature !== calculatedSignature) {
        const error = new Error('Invalid PayFast signature');
        (error as any).statusCode = 400;
        (error as any).isOperational = true;
        throw error;
      }

      const transaction = await Transaction.findByPk(data.custom_str1);

      if (!transaction) {
        const error = new Error('Transaction not found');
        (error as any).statusCode = 404;
        (error as any).isOperational = true;
        throw error;
      }

      const status = parseInt(data.payment_status);
      const paymentComplete = status === 2; // PayFast status code for complete

      if (paymentComplete) {
        await transaction.update({
          status: 'COMPLETED',
          payfastTransactionId: data.pf_payment_id,
          completedAt: new Date(),
        });

        logger.info(`PayFast payment completed: ${data.pf_payment_id}`);
      } else {
        await transaction.update({
          status: 'FAILED',
          failureReason: `PayFast status: ${status}`,
        });

        logger.warn(`PayFast payment failed with status: ${status}`);
      }

      return transaction;
    } catch (error) {
      logger.error('PayFast callback error:', error);
      throw error;
    }
  }

  private static generatePayFastSignature(data: any): string {
    let postData = '';
    for (const key in data) {
      if (data.hasOwnProperty(key) && key !== 'signature') {
        postData += key + '=' + encodeURIComponent(data[key]).replace(/%20/g, '+') + '&';
      }
    }
    postData = postData.slice(0, -1);

    const passphrase = process.env.PAYFAST_PASSPHRASE || '';
    if (passphrase !== '') {
      postData += '&passphrase=' + encodeURIComponent(passphrase).replace(/%20/g, '+');
    }

    return crypto.createHash('md5').update(postData).digest('hex');
  }

  // REFUND HANDLING
  static async processRefund(transactionId: string, reason: string) {
    try {
      const transaction = await Transaction.findByPk(transactionId);

      if (!transaction) {
        const error = new Error('Transaction not found');
        (error as any).statusCode = 404;
        (error as any).isOperational = true;
        throw error;
      }

      if (transaction.status !== 'COMPLETED') {
        const error = new Error('Can only refund completed transactions');
        (error as any).statusCode = 400;
        (error as any).isOperational = true;
        throw error;
      }

      // Handle Stripe refund
      if (transaction.stripeTransactionId) {
        const refund = await stripe.refunds.create({
          payment_intent: transaction.stripeTransactionId,
          reason: 'requested_by_customer',
          metadata: { refundReason: reason },
        });

        await transaction.update({
          status: 'REFUNDED',
          metadata: { refundId: refund.id },
        });

        logger.info(`Refund processed for Stripe transaction: ${transaction.id}`);
      }

      return {
        success: true,
        message: 'Refund processed successfully',
        transactionId,
      };
    } catch (error) {
      logger.error('Refund processing error:', error);
      throw error;
    }
  }

  static async savePaymentMethod(userId: string, stripePaymentMethodId: string) {
    try {
      const paymentMethod = await stripe.paymentMethods.retrieve(
        stripePaymentMethodId
      );

      const card = paymentMethod.card;

      const savedMethod = await PaymentMethod.create({
        userId,
        type: 'CARD',
        provider: 'STRIPE',
        stripePaymentMethodId,
        cardLastFour: card?.last4,
        cardBrand: (card?.brand?.toUpperCase() as any) || 'UNKNOWN',
        cardExpiryMonth: card?.exp_month,
        cardExpiryYear: card?.exp_year,
        isVerified: true,
      });

      return {
        success: true,
        paymentMethodId: savedMethod.id,
      };
    } catch (error) {
      logger.error('Save payment method error:', error);
      throw error;
    }
  }
}

export default PaymentService;
