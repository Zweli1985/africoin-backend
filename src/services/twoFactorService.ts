import speakeasy from 'speakeasy';
import QRCode from 'qrcode';
import logger from '../utils/logger.js';

export class TwoFactorService {
  static generateSecret(email: string) {
    try {
      const secret = speakeasy.generateSecret({
        name: `AfriCoin (${email})`,
        issuer: 'AfriCoin',
        length: 32,
      });

      return {
        secret: secret.base32,
        qrCode: secret.otpauth_url,
      };
    } catch (error) {
      logger.error('2FA secret generation error:', error);
      throw new Error('Failed to generate 2FA secret');
    }
  }

  static async generateQRCode(otpauthUrl: string): Promise<string> {
    try {
      const qrCodeUrl = await QRCode.toDataURL(otpauthUrl);
      return qrCodeUrl;
    } catch (error) {
      logger.error('QR code generation error:', error);
      throw new Error('Failed to generate QR code');
    }
  }

  static verifyToken(secret: string, token: string): boolean {
    try {
      const verified = speakeasy.totp.verify({
        secret,
        encoding: 'base32',
        token,
        window: 2, // Allow time window of +/- 2 * 30 seconds
      });

      return verified;
    } catch (error) {
      logger.error('2FA token verification error:', error);
      return false;
    }
  }

  static generateBackupCodes(count: number = 10): string[] {
    const codes: string[] = [];
    for (let i = 0; i < count; i++) {
      const code = Math.random().toString(36).substring(2, 10).toUpperCase();
      codes.push(code);
    }
    return codes;
  }

  static verifyBackupCode(code: string, backupCodes: string[]): boolean {
    return backupCodes.includes(code.toUpperCase());
  }

  static removeBackupCode(code: string, backupCodes: string[]): string[] {
    return backupCodes.filter(c => c !== code.toUpperCase());
  }
}

export default TwoFactorService;
