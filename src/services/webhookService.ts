import crypto from 'crypto';
import axios from 'axios';
import logger from '../utils/logger.js';

export enum WebhookEventType {
  PAYMENT_COMPLETED = 'payment.completed',
  PAYMENT_FAILED = 'payment.failed',
  TRANSACTION_CREATED = 'transaction.created',
  KYC_VERIFIED = 'kyc.verified',
  KYC_REJECTED = 'kyc.rejected',
  WALLET_CREATED = 'wallet.created',
  USER_REGISTERED = 'user.registered',
  SECURITY_ALERT = 'security.alert',
}

export interface Webhook {
  id?: string;
  userId: string;
  url: string;
  events: WebhookEventType[];
  isActive: boolean;
  createdAt?: Date;
}

export interface WebhookEvent {
  id: string;
  type: WebhookEventType;
  timestamp: Date;
  data: Record<string, any>;
  userId: string;
}

export class WebhookService {
  static getSignature(payload: string, secret: string): string {
    return crypto
      .createHmac('sha256', secret)
      .update(payload)
      .digest('hex');
  }

  static verifySignature(
    payload: string,
    signature: string,
    secret: string
  ): boolean {
    const expectedSignature = this.getSignature(payload, secret);
    return crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expectedSignature)
    );
  }

  static async triggerWebhook(
    webhookUrl: string,
    event: WebhookEvent,
    secret: string
  ): Promise<boolean> {
    try {
      const payload = JSON.stringify(event);
      const signature = this.getSignature(payload, secret);

      await axios.post(
        webhookUrl,
        event,
        {
          headers: {
            'X-Webhook-Signature': signature,
            'X-Webhook-ID': event.id,
            'Content-Type': 'application/json',
          },
          timeout: 30000,
        }
      );

      logger.info(`Webhook triggered for ${event.type}`);
      return true;
    } catch (error) {
      logger.error('Webhook trigger error:', error);
      return false;
    }
  }

  static async triggerUserWebhooks(
    userId: string,
    eventType: WebhookEventType,
    data: Record<string, any>,
    webhooks: any[] // User's webhooks from DB
  ): Promise<void> {
    try {
      const event: WebhookEvent = {
        id: crypto.randomUUID(),
        type: eventType,
        timestamp: new Date(),
        data,
        userId,
      };

      const activeWebhooks = webhooks.filter(
        w => w.isActive && w.events.includes(eventType)
      );

      for (const webhook of activeWebhooks) {
        // Fire and forget pattern - don't wait for response
        this.triggerWebhook(webhook.url, event, process.env.WEBHOOK_SECRET || '');
      }
    } catch (error) {
      logger.error('User webhooks trigger error:', error);
    }
  }

  static getAllowedEventTypes(): WebhookEventType[] {
    return Object.values(WebhookEventType);
  }

  static isValidEventType(eventType: string): boolean {
    return Object.values(WebhookEventType).includes(eventType as WebhookEventType);
  }
}

export default WebhookService;
