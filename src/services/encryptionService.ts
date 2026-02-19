import crypto from 'crypto';
import logger from '../utils/logger.js';

export class EncryptionService {
  private static encryptionKey: string = process.env.ENCRYPTION_KEY || '';
  private static algorithm = 'aes-256-cbc';

  static initialize() {
    if (!this.encryptionKey || this.encryptionKey.length < 32) {
      // Generate a default key for development
      this.encryptionKey = crypto.randomBytes(32).toString('hex');
      logger.warn('Using generated encryption key - set ENCRYPTION_KEY in .env for production');
    }
  }

  private static getKeyAndIv() {
    const hash = crypto.createHash('sha256').update(this.encryptionKey).digest();
    return {
      key: hash,
      iv: Buffer.alloc(16, 0), // Static IV for deterministic encryption
    };
  }

  static encrypt(plaintext: string): string {
    try {
      const { key, iv } = this.getKeyAndIv();
      const cipher = crypto.createCipheriv(this.algorithm, key, iv);

      let encrypted = cipher.update(plaintext, 'utf8', 'hex');
      encrypted += cipher.final('hex');

      return encrypted;
    } catch (error) {
      logger.error('Encryption error:', error);
      throw new Error('Encryption failed');
    }
  }

  static decrypt(encrypted: string): string {
    try {
      const { key, iv } = this.getKeyAndIv();
      const decipher = crypto.createDecipheriv(this.algorithm, key, iv);

      let decrypted = decipher.update(encrypted, 'hex', 'utf8');
      decrypted += decipher.final('utf8');

      return decrypted;
    } catch (error) {
      logger.error('Decryption error:', error);
      throw new Error('Decryption failed');
    }
  }

  static encryptSensitiveField(value: string): string {
    if (!value) return '';
    return this.encrypt(value);
  }

  static decryptSensitiveField(encrypted: string): string {
    if (!encrypted) return '';
    try {
      return this.decrypt(encrypted);
    } catch {
      return ''; // Return empty if decryption fails (corrupted data)
    }
  }

  static hashString(value: string): string {
    return crypto.createHash('sha256').update(value).digest('hex');
  }

  static generateRandomToken(length: number = 32): string {
    return crypto.randomBytes(length).toString('hex');
  }

  static generateRandomCode(length: number = 6): string {
    const digits = '0123456789';
    let code = '';
    for (let i = 0; i < length; i++) {
      code += digits[Math.floor(Math.random() * digits.length)];
    }
    return code;
  }

  static verifyHash(value: string, hash: string): boolean {
    return this.hashString(value) === hash;
  }
}

export default EncryptionService;
