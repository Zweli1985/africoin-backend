import Redis from 'ioredis';
import logger from '../utils/logger.js';

export class CacheService {
  private static redis: Redis | null = null;
  private static isConnected = false;

  static initialize() {
    if (!process.env.REDIS_URL) {
      logger.warn('Redis not configured - caching disabled');
      return;
    }

    try {
      this.redis = new Redis(process.env.REDIS_URL, {
        password: process.env.REDIS_PASSWORD,
        retryStrategy: (times) => Math.min(times * 50, 2000),
      });

      this.redis.on('connect', () => {
        this.isConnected = true;
        logger.info('Redis connected');
      });

      this.redis.on('error', (err) => {
        logger.error('Redis error:', err);
        this.isConnected = false;
      });

      this.redis.on('close', () => {
        this.isConnected = false;
        logger.info('Redis connection closed');
      });
    } catch (error) {
      logger.error('Failed to initialize Redis:', error);
    }
  }

  static async set(key: string, value: any, ttlSeconds?: number): Promise<boolean> {
    try {
      if (!this.redis || !this.isConnected) return false;

      const serialized = JSON.stringify(value);

      if (ttlSeconds) {
        await this.redis.setex(key, ttlSeconds, serialized);
      } else {
        await this.redis.set(key, serialized);
      }

      return true;
    } catch (error) {
      logger.error('Cache set error:', error);
      return false;
    }
  }

  static async get<T>(key: string): Promise<T | null> {
    try {
      if (!this.redis || !this.isConnected) return null;

      const value = await this.redis.get(key);
      return value ? JSON.parse(value) : null;
    } catch (error) {
      logger.error('Cache get error:', error);
      return null;
    }
  }

  static async delete(key: string): Promise<boolean> {
    try {
      if (!this.redis || !this.isConnected) return false;

      await this.redis.del(key);
      return true;
    } catch (error) {
      logger.error('Cache delete error:', error);
      return false;
    }
  }

  static async clear(pattern: string = '*'): Promise<boolean> {
    try {
      if (!this.redis || !this.isConnected) return false;

      const keys = await this.redis.keys(pattern);
      if (keys.length > 0) {
        await this.redis.del(...keys);
      }

      return true;
    } catch (error) {
      logger.error('Cache clear error:', error);
      return false;
    }
  }

  static async exists(key: string): Promise<boolean> {
    try {
      if (!this.redis || !this.isConnected) return false;

      const result = await this.redis.exists(key);
      return result === 1;
    } catch (error) {
      logger.error('Cache exists error:', error);
      return false;
    }
  }

  static async increment(key: string, amount: number = 1): Promise<number | null> {
    try {
      if (!this.redis || !this.isConnected) return null;

      return await this.redis.incrby(key, amount);
    } catch (error) {
      logger.error('Cache increment error:', error);
      return null;
    }
  }

  static async setHash(key: string, data: Record<string, any>, ttlSeconds?: number): Promise<boolean> {
    try {
      if (!this.redis || !this.isConnected) return false;

      // Flatten nested objects
      const flattened: Record<string, string> = {};
      for (const [k, v] of Object.entries(data)) {
        flattened[k] = typeof v === 'string' ? v : JSON.stringify(v);
      }

      await this.redis.hmset(key, flattened);

      if (ttlSeconds) {
        await this.redis.expire(key, ttlSeconds);
      }

      return true;
    } catch (error) {
      logger.error('Cache setHash error:', error);
      return false;
    }
  }

  static async getHash(key: string): Promise<Record<string, any> | null> {
    try {
      if (!this.redis || !this.isConnected) return null;

      const data = await this.redis.hgetall(key);
      if (!data || Object.keys(data).length === 0) return null;

      return data;
    } catch (error) {
      logger.error('Cache getHash error:', error);
      return null;
    }
  }

  static async disconnect(): Promise<void> {
    if (this.redis) {
      await this.redis.quit();
      this.isConnected = false;
      logger.info('Redis disconnected');
    }
  }

  static isReady(): boolean {
    return this.isConnected;
  }
}

export default CacheService;
