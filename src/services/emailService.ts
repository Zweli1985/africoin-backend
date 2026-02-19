import nodemailer from 'nodemailer';
import logger from '../utils/logger.js';

interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

export class EmailService {
  private static transporter: nodemailer.Transporter | null = null;

  static initialize() {
    if (!process.env.SMTP_HOST) {
      logger.warn('Email service not configured - emails will not be sent');
      return;
    }

    this.transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: process.env.SMTP_PORT === '465',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASSWORD,
      },
    });

    logger.info('Email service initialized');
  }

  static async sendEmail(options: EmailOptions): Promise<boolean> {
    try {
      if (!this.transporter) {
        logger.warn('Email service not configured');
        return false;
      }

      await this.transporter.sendMail({
        from: `AfriCoin <${process.env.SMTP_USER}>`,
        to: options.to,
        subject: options.subject,
        html: options.html,
        text: options.text,
      });

      logger.info(`Email sent to ${options.to}`);
      return true;
    } catch (error) {
      logger.error('Email sending failed:', error);
      return false;
    }
  }

  static async sendVerificationEmail(email: string, token: string): Promise<boolean> {
    const verificationUrl = `${process.env.FRONTEND_URL}/verify-email?token=${token}`;

    return this.sendEmail({
      to: email,
      subject: 'Verify Your AfriCoin Email',
      html: `
        <h2>Welcome to AfriCoin</h2>
        <p>Please verify your email address to complete your registration.</p>
        <a href="${verificationUrl}" style="background-color: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block;">
          Verify Email
        </a>
        <p>Or copy this link: ${verificationUrl}</p>
        <p>This link expires in 24 hours.</p>
      `,
    });
  }

  static async sendPasswordResetEmail(email: string, token: string): Promise<boolean> {
    const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${token}`;

    return this.sendEmail({
      to: email,
      subject: 'Reset Your AfriCoin Password',
      html: `
        <h2>Password Reset Request</h2>
        <p>You requested to reset your password. Click the link below to proceed:</p>
        <a href="${resetUrl}" style="background-color: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block;">
          Reset Password
        </a>
        <p>Or copy this link: ${resetUrl}</p>
        <p>This link expires in 1 hour.</p>
        <p>If you didn't request this, please ignore this email.</p>
      `,
    });
  }

  static async sendKycApprovedEmail(email: string, userName: string): Promise<boolean> {
    return this.sendEmail({
      to: email,
      subject: 'KYC Verification Approved',
      html: `
        <h2>Your KYC Verification is Complete!</h2>
        <p>Hi ${userName},</p>
        <p>Congratulations! Your identity verification has been approved. You can now access all AfriCoin features.</p>
        <p>Thank you for being part of our community.</p>
      `,
    });
  }

  static async sendKycRejectedEmail(email: string, userName: string, reason: string): Promise<boolean> {
    return this.sendEmail({
      to: email,
      subject: 'KYC Verification Update',
      html: `
        <h2>KYC Verification Status</h2>
        <p>Hi ${userName},</p>
        <p>Your KYC verification was not approved. Reason: ${reason}</p>
        <p>Please contact support for more information or resubmit your documents.</p>
      `,
    });
  }

  static async sendTransactionReceiptEmail(email: string, userName: string, transactionData: any): Promise<boolean> {
    return this.sendEmail({
      to: email,
      subject: `Transaction Receipt - ${transactionData.id}`,
      html: `
        <h2>Transaction Receipt</h2>
        <p>Hi ${userName},</p>
        <p><strong>Amount:</strong> ${transactionData.amount} ${transactionData.currency}</p>
        <p><strong>Type:</strong> ${transactionData.type}</p>
        <p><strong>Status:</strong> ${transactionData.status}</p>
        <p><strong>Date:</strong> ${transactionData.createdAt}</p>
        <p><strong>Transaction ID:</strong> ${transactionData.id}</p>
      `,
    });
  }

  static async sendSecurityAlertEmail(email: string, alertMessage: string): Promise<boolean> {
    return this.sendEmail({
      to: email,
      subject: 'Security Alert - AfriCoin Account',
      html: `
        <h2>⚠️ Security Alert</h2>
        <p>${alertMessage}</p>
        <p>If this wasn't you, please change your password immediately and contact support.</p>
      `,
    });
  }
}

export default EmailService;
