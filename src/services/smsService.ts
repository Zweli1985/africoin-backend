import twilio from 'twilio';
import logger from '../utils/logger.js';

export class SmsService {
  private static client: twilio.Twilio | null = null;

  static initialize() {
    if (!process.env.TWILIO_ACCOUNT_SID) {
      logger.warn('SMS service not configured');
      return;
    }

    this.client = twilio(
      process.env.TWILIO_ACCOUNT_SID,
      process.env.TWILIO_AUTH_TOKEN
    );

    logger.info('SMS service initialized');
  }

  static async sendSms(phoneNumber: string, message: string): Promise<boolean> {
    try {
      if (!this.client) {
        logger.warn('SMS service not configured');
        return false;
      }

      await this.client.messages.create({
        body: message,
        from: process.env.TWILIO_PHONE_NUMBER,
        to: phoneNumber,
      });

      logger.info(`SMS sent to ${phoneNumber}`);
      return true;
    } catch (error) {
      logger.error('SMS sending failed:', error);
      return false;
    }
  }

  static async sendVerificationCode(phoneNumber: string, code: string): Promise<boolean> {
    const message = `Your AfriCoin verification code is: ${code}. This code expires in 10 minutes.`;
    return this.sendSms(phoneNumber, message);
  }

  static async send2faCode(phoneNumber: string, code: string): Promise<boolean> {
    const message = `Your AfriCoin two-factor authentication code is: ${code}. Do not share this code.`;
    return this.sendSms(phoneNumber, message);
  }

  static async sendTransactionAlert(phoneNumber: string, amount: number, currency: string): Promise<boolean> {
    const message = `AfriCoin: Transaction of ${amount} ${currency} has been completed on your account.`;
    return this.sendSms(phoneNumber, message);
  }

  static async sendSecurityAlert(phoneNumber: string, alertType: string): Promise<boolean> {
    const message = `[SECURITY ALERT] ${alertType} on your AfriCoin account. If this wasn't you, change your password immediately.`;
    return this.sendSms(phoneNumber, message);
  }

  static async sendLoginNotification(phoneNumber: string, location: string): Promise<boolean> {
    const message = `AfriCoin: New login detected from ${location}. If this wasn't you, secure your account immediately.`;
    return this.sendSms(phoneNumber, message);
  }
}

export default SmsService;
