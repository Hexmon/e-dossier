// src/lib/ratelimit.ts
// SECURITY FIX: Rate Limiting Implementation using Upstash Redis
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';
import { NextRequest } from 'next/server';

// Initialize Redis client
// If Upstash credentials are not provided, use in-memory store (for development only)
const redis = process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN
  ? new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL,
      token: process.env.UPSTASH_REDIS_REST_TOKEN,
    })
  : null;

// In-memory fallback for development (not recommended for production)
class InMemoryStore {
  private store: Map<string, { count: number; reset: number }> = new Map();

  async get(key: string): Promise<number | null> {
    const entry = this.store.get(key);
    if (!entry) return null;
    if (Date.now() > entry.reset) {
      this.store.delete(key);
      return null;
    }
    return entry.count;
  }

  async set(key: string, count: number, ttl: number): Promise<void> {
    this.store.set(key, { count, reset: Date.now() + ttl * 1000 });
  }

  async incr(key: string): Promise<number> {
    const current = await this.get(key);
    const newCount = (current || 0) + 1;
    return newCount;
  }
}

const inMemoryStore = new InMemoryStore();

/**
 * Rate limiter for login attempts
 * Limit: 5 attempts per 15 minutes per IP address
 */
export const loginRateLimiter = redis
  ? new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(5, '15 m'),
      analytics: true,
      prefix: 'ratelimit:login',
    })
  : null;

/**
 * Rate limiter for API requests
 * Limit: 100 requests per minute per IP address
 */
export const apiRateLimiter = redis
  ? new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(100, '1 m'),
      analytics: true,
      prefix: 'ratelimit:api',
    })
  : null;

/**
 * Rate limiter for signup requests
 * Limit: 3 attempts per hour per IP address
 */
export const signupRateLimiter = redis
  ? new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(3, '1 h'),
      analytics: true,
      prefix: 'ratelimit:signup',
    })
  : null;

/**
 * Rate limiter for password reset requests
 * Limit: 3 attempts per hour per IP address
 */
export const passwordResetRateLimiter = redis
  ? new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(3, '1 h'),
      analytics: true,
      prefix: 'ratelimit:password-reset',
    })
  : null;

/**
 * Extract IP address from request
 * Checks X-Forwarded-For, X-Real-IP, and falls back to socket address
 */
export function getClientIp(req: NextRequest): string {
  // Check X-Forwarded-For header (set by proxies/load balancers)
  const forwardedFor = req.headers.get('x-forwarded-for');
  if (forwardedFor) {
    // X-Forwarded-For can contain multiple IPs, take the first one
    return forwardedFor.split(',')[0].trim();
  }

  // Check X-Real-IP header (set by some proxies)
  const realIp = req.headers.get('x-real-ip');
  if (realIp) {
    return realIp.trim();
  }

  // Fallback to a default IP for development
  return '127.0.0.1';
}

/**
 * In-memory rate limiting fallback for development
 * @param key - Unique identifier for rate limiting (e.g., IP address)
 * @param limit - Maximum number of requests
 * @param windowMs - Time window in milliseconds
 * @returns Object with success status and remaining requests
 */
async function inMemoryRateLimit(
  key: string,
  limit: number,
  windowMs: number
): Promise<{ success: boolean; limit: number; remaining: number; reset: number }> {
  const now = Date.now();
  const entry = inMemoryStore['store'].get(key);

  if (!entry || now > entry.reset) {
    // First request or window expired
    inMemoryStore['store'].set(key, { count: 1, reset: now + windowMs });
    return { success: true, limit, remaining: limit - 1, reset: now + windowMs };
  }

  if (entry.count >= limit) {
    // Rate limit exceeded
    return { success: false, limit, remaining: 0, reset: entry.reset };
  }

  // Increment count
  entry.count++;
  return { success: true, limit, remaining: limit - entry.count, reset: entry.reset };
}

/**
 * Check rate limit for login attempts
 * @param identifier - Unique identifier (usually IP address)
 * @returns Rate limit result
 */
export async function checkLoginRateLimit(identifier: string) {
  if (loginRateLimiter) {
    return await loginRateLimiter.limit(identifier);
  }
  // Fallback to in-memory rate limiting
  return await inMemoryRateLimit(identifier, 5, 15 * 60 * 1000); // 5 per 15 minutes
}

/**
 * Check rate limit for API requests
 * @param identifier - Unique identifier (usually IP address)
 * @returns Rate limit result
 */
export async function checkApiRateLimit(identifier: string) {
  if (apiRateLimiter) {
    return await apiRateLimiter.limit(identifier);
  }
  // Fallback to in-memory rate limiting
  return await inMemoryRateLimit(identifier, 100, 60 * 1000); // 100 per minute
}

/**
 * Check rate limit for signup requests
 * @param identifier - Unique identifier (usually IP address)
 * @returns Rate limit result
 */
export async function checkSignupRateLimit(identifier: string) {
  if (signupRateLimiter) {
    return await signupRateLimiter.limit(identifier);
  }
  // Fallback to in-memory rate limiting
  return await inMemoryRateLimit(identifier, 3, 60 * 60 * 1000); // 3 per hour
}

/**
 * Check rate limit for password reset requests
 * @param identifier - Unique identifier (usually IP address)
 * @returns Rate limit result
 */
export async function checkPasswordResetRateLimit(identifier: string) {
  if (passwordResetRateLimiter) {
    return await passwordResetRateLimiter.limit(identifier);
  }
  // Fallback to in-memory rate limiting
  return await inMemoryRateLimit(identifier, 3, 60 * 60 * 1000); // 3 per hour
}

/**
 * Format rate limit headers for response
 * @param result - Rate limit result from Upstash
 * @returns Headers object
 */
export function getRateLimitHeaders(result: {
  success: boolean;
  limit: number;
  remaining: number;
  reset: number;
}): Record<string, string> {
  return {
    'X-RateLimit-Limit': result.limit.toString(),
    'X-RateLimit-Remaining': result.remaining.toString(),
    'X-RateLimit-Reset': result.reset.toString(),
  };
}

