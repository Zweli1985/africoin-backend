import express, { Express } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import swaggerUi from 'swagger-ui-express';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import path from 'path';

import authRoutes from './routes/auth.js';
import kycRoutes from './routes/kyc.js';
import paymentRoutes from './routes/payment.js';
import transactionRoutes from './routes/transaction.js';
import solanaRoutes from './routes/solana.js';
import userRoutes from './routes/user.js';
import { errorHandler } from './middleware/errorHandler.js';
import { authenticateToken } from './middleware/auth.js';
import { initializeDatabase } from './database/init.js';
import { swaggerSpec } from './config/swagger.js';
import logger from './utils/logger.js';
import EmailService from './services/emailService.js';
import SmsService from './services/smsService.js';
import CacheService from './services/cacheService.js';
import EncryptionService from './services/encryptionService.js';
import MetricsService from './services/metricsService.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app: Express = express();
const PORT = process.env.PORT || 3001;

// Security Middleware
app.use(helmet());
app.use(
  cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:5173',
    credentials: true,
    optionsSuccessStatus: 200,
  })
);

// Logging
app.use(morgan('combined', { stream: { write: (msg) => logger.info(msg.trim()) } }));

// Rate Limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.',
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5, // limit login attempts
  message: 'Too many login attempts, please try again later.',
  skipSuccessfulRequests: true,
});

// Body Parser
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));

// Health Check
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    cacheReady: CacheService.isReady ? CacheService.isReady() : false,
  });
});

// Swagger Documentation
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// Metrics Endpoint
app.get('/metrics', (req, res) => {
  res.set('Content-Type', MetricsService.getContentType());
  res.send(MetricsService.getMetrics());
});

// API Routes
app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/kyc', limiter, kycRoutes);
app.use('/api/payment', limiter, paymentRoutes);
app.use('/api/transaction', authenticateToken, limiter, transactionRoutes);
app.use('/api/solana', authenticateToken, limiter, solanaRoutes);
app.use('/api/user', authenticateToken, limiter, userRoutes);

// 404 Handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found',
    path: req.path,
  });
});

// Error Handler
app.use(errorHandler);

// Start Server
async function startServer() {
  try {
    logger.info('Initializing services...');
    
    // Initialize all services
    EncryptionService.initialize();
    EmailService.initialize();
    SmsService.initialize();
    CacheService.initialize();
    MetricsService.initialize();

    await initializeDatabase();
    
    const server = app.listen(PORT, () => {
      logger.info(`🚀 AfriCoin Backend listening on port ${PORT}`);
      logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
      logger.info(`Database: ${process.env.DATABASE_URL ? 'PostgreSQL' : 'SQLite'}`);
      logger.info(`Cache: ${CacheService.isReady ? 'Redis' : 'Disabled'}`);
      logger.info(`API Docs: http://localhost:${PORT}/api-docs`);
      logger.info(`Metrics: http://localhost:${PORT}/metrics`);
    });

    return server;
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
}

const serverPromise = startServer();

// Graceful Shutdown
process.on('SIGTERM', async () => {
  logger.info('SIGTERM signal received: closing HTTP server');
  const server = await serverPromise;
  server.close(() => {
    logger.info('HTTP server closed');
  });
});

process.on('SIGINT', async () => {
  logger.info('SIGINT signal received: closing HTTP server');
  const server = await serverPromise;
  server.close(() => {
    logger.info('HTTP server closed');
    process.exit(0);
  });
});

export default app;
