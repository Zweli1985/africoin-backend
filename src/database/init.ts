import sequelize, { User, PaymentMethod, Transaction, KycVerification, SolanaWallet } from './models.js';
import logger from '../utils/logger.js';

export async function initializeDatabase() {
  try {
    // Test connection
    await sequelize.authenticate();
    logger.info('Database connection established');

    // Sync models
    await sequelize.sync({ alter: process.env.NODE_ENV === 'development' });
    logger.info('Database models synchronized');

    return true;
  } catch (error) {
    logger.error('Database initialization failed:', error);
    throw error;
  }
}

export async function seedDatabase() {
  try {
    const existingUsers = await User.count();
    if (existingUsers > 0) {
      logger.info('Database already seeded, skipping...');
      return;
    }

    logger.info('Seeding database...');

    // Create sample users (password will be hashed)
    // This is just a placeholder - in production, handle this differently
    logger.info('Database seeding completed');
  } catch (error) {
    logger.error('Database seeding failed:', error);
    throw error;
  }
}

export async function closeDatabase() {
  try {
    await sequelize.close();
    logger.info('Database connection closed');
  } catch (error) {
    logger.error('Error closing database connection:', error);
  }
}

export { sequelize };
