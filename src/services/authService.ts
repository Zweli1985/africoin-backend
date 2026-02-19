import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import { User } from '../database/models.js';
import logger from '../utils/logger.js';

interface AuthPayload {
  email: string;
  password: string;
}

interface RegisterPayload extends AuthPayload {
  firstName?: string;
  lastName?: string;
  phone?: string;
}

export class AuthService {
  static async register(payload: RegisterPayload) {
    try {
      const { email, password, firstName, lastName, phone } = payload;

      // Check if user exists
      const existingUser = await User.findOne({ where: { email } });
      if (existingUser) {
        const error = new Error('Email already registered');
        (error as any).statusCode = 400;
        (error as any).isOperational = true;
        throw error;
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(password, 10);

      // Create user
      const user = await User.create({
        id: uuidv4(),
        email,
        passwordHash: hashedPassword,
        firstName,
        lastName,
        phone,
      });

      logger.info(`User registered: ${email}`);

      const token = this.generateToken(user.id, email);

      return {
        success: true,
        user: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
        },
        token,
      };
    } catch (error) {
      logger.error('Registration error:', error);
      throw error;
    }
  }

  static async login(payload: AuthPayload) {
    try {
      const { email, password } = payload;

      const user = await User.findOne({ where: { email } });

      if (!user) {
        const error = new Error('Invalid credentials');
        (error as any).statusCode = 401;
        (error as any).isOperational = true;
        throw error;
      }

      const passwordMatch = await bcrypt.compare(password, user.passwordHash);

      if (!passwordMatch) {
        const error = new Error('Invalid credentials');
        (error as any).statusCode = 401;
        (error as any).isOperational = true;
        throw error;
      }

      // Update last login
      await user.update({ lastLoginAt: new Date() });

      const token = this.generateToken(user.id, email);

      logger.info(`User logged in: ${email}`);

      return {
        success: true,
        user: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          kycStatus: user.kycStatus,
        },
        token,
      };
    } catch (error) {
      logger.error('Login error:', error);
      throw error;
    }
  }

  static async verifyToken(token: string) {
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret');
      return decoded;
    } catch (error) {
      const err = new Error('Invalid token');
      (err as any).statusCode = 401;
      (err as any).isOperational = true;
      throw err;
    }
  }

  static async refreshToken(token: string) {
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret') as any;
      const newToken = this.generateToken(decoded.userId, decoded.email);
      return { token: newToken };
    } catch (error) {
      const err = new Error('Invalid token');
      (err as any).statusCode = 401;
      (err as any).isOperational = true;
      throw err;
    }
  }

  private static generateToken(userId: string, email: string): string {
    return jwt.sign(
      {
        userId,
        email,
      },
      process.env.JWT_SECRET || 'secret',
      { expiresIn: '7d' }
    );
  }

  static async changePassword(userId: string, oldPassword: string, newPassword: string) {
    try {
      const user = await User.findByPk(userId);

      if (!user) {
        const error = new Error('User not found');
        (error as any).statusCode = 404;
        (error as any).isOperational = true;
        throw error;
      }

      const passwordMatch = await bcrypt.compare(oldPassword, user.passwordHash);

      if (!passwordMatch) {
        const error = new Error('Current password is incorrect');
        (error as any).statusCode = 400;
        (error as any).isOperational = true;
        throw error;
      }

      const hashedPassword = await bcrypt.hash(newPassword, 10);
      await user.update({ passwordHash: hashedPassword });

      logger.info(`Password changed for user: ${user.email}`);

      return { success: true, message: 'Password changed successfully' };
    } catch (error) {
      logger.error('Password change error:', error);
      throw error;
    }
  }
}

export default AuthService;
