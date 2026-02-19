import promClient from 'prom-client';
import logger from '../utils/logger.js';

export class MetricsService {
  private static isInitialized = false;

  static initialize() {
    if (this.isInitialized) return;

    // Default metrics
    promClient.collectDefaultMetrics();

    // Custom metrics
    this.httpRequestDuration = new promClient.Histogram({
      name: 'http_request_duration_seconds',
      help: 'Duration of HTTP requests in seconds',
      labelNames: ['method', 'route', 'status_code'],
      buckets: [0.1, 0.5, 1, 2, 5],
    });

    this.transactionCounter = new promClient.Counter({
      name: 'transactions_total',
      help: 'Total number of transactions',
      labelNames: ['type', 'status'],
    });

    this.paymentCounter = new promClient.Counter({
      name: 'payments_total',
      help: 'Total number of payments processed',
      labelNames: ['provider', 'status'],
    });

    this.kycCounter = new promClient.Counter({
      name: 'kyc_verifications_total',
      help: 'Total number of KYC verifications',
      labelNames: ['status'],
    });

    this.activeConnections = new promClient.Gauge({
      name: 'active_connections',
      help: 'Number of active connections',
    });

    this.dbQueryDuration = new promClient.Histogram({
      name: 'db_query_duration_seconds',
      help: 'Duration of database queries in seconds',
      labelNames: ['operation'],
      buckets: [0.01, 0.05, 0.1, 0.5, 1],
    });

    this.isInitialized = true;
    logger.info('Metrics service initialized');
  }

  private static httpRequestDuration: promClient.Histogram;
  private static transactionCounter: promClient.Counter;
  private static paymentCounter: promClient.Counter;
  private static kycCounter: promClient.Counter;
  private static activeConnections: promClient.Gauge;
  private static dbQueryDuration: promClient.Histogram;

  static recordHttpRequest(
    method: string,
    route: string,
    statusCode: number,
    durationSeconds: number
  ) {
    try {
      this.httpRequestDuration
        .labels(method, route, statusCode.toString())
        .observe(durationSeconds);
    } catch (error) {
      logger.error('Error recording HTTP request metric:', error);
    }
  }

  static recordTransaction(type: string, status: string) {
    try {
      this.transactionCounter.labels(type, status).inc();
    } catch (error) {
      logger.error('Error recording transaction metric:', error);
    }
  }

  static recordPayment(provider: string, status: string) {
    try {
      this.paymentCounter.labels(provider, status).inc();
    } catch (error) {
      logger.error('Error recording payment metric:', error);
    }
  }

  static recordKyc(status: string) {
    try {
      this.kycCounter.labels(status).inc();
    } catch (error) {
      logger.error('Error recording KYC metric:', error);
    }
  }

  static incrementActiveConnections() {
    try {
      this.activeConnections.inc();
    } catch (error) {
      logger.error('Error incrementing active connections:', error);
    }
  }

  static decrementActiveConnections() {
    try {
      this.activeConnections.dec();
    } catch (error) {
      logger.error('Error decrementing active connections:', error);
    }
  }

  static recordDbQuery(operation: string, durationSeconds: number) {
    try {
      this.dbQueryDuration.labels(operation).observe(durationSeconds);
    } catch (error) {
      logger.error('Error recording DB query metric:', error);
    }
  }

  static getMetrics(): string {
    try {
      return promClient.register.metrics();
    } catch (error) {
      logger.error('Error getting metrics:', error);
      return '';
    }
  }

  static getContentType(): string {
    return promClient.register.contentType;
  }
}

export default MetricsService;
