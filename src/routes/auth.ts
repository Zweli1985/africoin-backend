import { Router, Request, Response } from 'express';
import Joi from 'joi';
import passwordComplexity from 'joi-password-complexity';
import { validate, validateParams } from '../middleware/validation.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import { authenticateToken } from '../middleware/auth.js';
import AuthService from '../services/authService.js';
import logger from '../utils/logger.js';

const router = Router();

// Validation schemas
const registerSchema = Joi.object({
  email: Joi.string().email().required().messages({
    'string.email': 'Please provide a valid email address',
    'any.required': 'Email is required',
  }),
  password: passwordComplexity().required().messages({
    'any.required': 'Password is required',
  }),
  firstName: Joi.string().max(50),
  lastName: Joi.string().max(50),
  phone: Joi.string().pattern(/^\+?[0-9]{10,}$/),
});

const loginSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().required(),
});

const changePasswordSchema = Joi.object({
  oldPassword: Joi.string().required(),
  newPassword: passwordComplexity().required(),
  confirmPassword: Joi.string().valid(Joi.ref('newPassword')).required(),
});

// Register
router.post(
  '/register',
  validate(registerSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const result = await AuthService.register(req.body);
    res.status(201).json(result);
  })
);

// Login
router.post(
  '/login',
  validate(loginSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const result = await AuthService.login(req.body);
    res.json(result);
  })
);

// Verify Token
router.post(
  '/verify',
  authenticateToken,
  asyncHandler(async (req: Request, res: Response) => {
    res.json({
      success: true,
      message: 'Token is valid',
      user: req.user,
    });
  })
);

// Refresh Token
router.post(
  '/refresh',
  asyncHandler(async (req: Request, res: Response) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      res.status(401).json({
        success: false,
        message: 'Refresh token required',
      });
      return;
    }

    const result = await AuthService.refreshToken(token);
    res.json(result);
  })
);

// Change Password
router.post(
  '/change-password',
  authenticateToken,
  validate(changePasswordSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const { oldPassword, newPassword } = req.body;
    const result = await AuthService.changePassword(req.user!.userId, oldPassword, newPassword);
    res.json(result);
  })
);

export default router;
