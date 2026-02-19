import crypto from 'crypto';

// Generate a unique transaction reference
export function generateTransactionReference(): string {
  return `TXN-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
}

// Hash a string
export function hashString(value: string): string {
  return crypto.createHash('sha256').update(value).digest('hex');
}

// Generate a random token
export function generateToken(length: number = 32): string {
  return crypto.randomBytes(length).toString('hex');
}

// Validate email format
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

// Format currency amount
export function formatCurrency(amount: number, currency: string = 'ZAR'): string {
  return new Intl.NumberFormat('en-ZA', {
    style: 'currency',
    currency,
  }).format(amount);
}

// Calculate exchange rate
export function calculateExchange(
  amount: number,
  fromRate: number,
  toRate: number
): number {
  return (amount * toRate) / fromRate;
}

// Validate public key (Solana)
export function isValidSolanaAddress(address: string): boolean {
  // Basic validation - can be improved with proper Solana validation
  return address.length === 44 && /^[A-Za-z0-9+/=]+$/.test(address);
}

// Retry mechanism for async operations
export async function retryAsync<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  delayMs: number = 1000
): Promise<T> {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      if (i === maxRetries - 1) throw error;
      await new Promise(resolve => setTimeout(resolve, delayMs * (i + 1)));
    }
  }
  throw new Error('Retry limit exceeded');
}

// Truncate middle of string (for displaying addresses)
export function truncateMiddle(str: string, length: number = 20): string {
  if (str.length <= length) return str;
  const start = Math.floor(length / 2) - 2;
  const end = str.length - (length - start - 2);
  return str.substring(0, start) + '...' + str.substring(end);
}

// Parse decimal from database (for Sequelize decimals)
export function parseDecimal(value: any): number {
  if (value === null || value === undefined) return 0;
  if (typeof value === 'number') return value;
  if (typeof value === 'string') return parseFloat(value);
  if (typeof value === 'object' && value.toString) return parseFloat(value.toString());
  return 0;
}
