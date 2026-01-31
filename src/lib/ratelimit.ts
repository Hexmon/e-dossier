// src/lib/ratelimit.ts
// SECURITY FIX: Rate Limiting Implementation using Upstash Redis
// Now with configurable limits via environment variables
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';
import { NextRequest } from 'next/server';
import {
  isRateLimitEnabled,
  getLoginRateLimitConfig,
  getApiRateLimitConfig,
  getSignupRateLimitConfig,
  getPasswordResetRateLimitConfig,
  getRateLimitRedisKeyPrefix,
} from '@/config/ratelimit.config';

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
 * Helper function to convert seconds to milliseconds for Duration
 */
function secondsToMilliseconds(seconds: number): number {
  return seconds * 1000;
}

const basePrefix = getRateLimitRedisKeyPrefix();

/**
 * Rate limiter for login attempts
 * Configured via RATE_LIMIT_LOGIN_* environment variables
 */
export const loginRateLimiter = isRateLimitEnabled() && redis
  ? new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(
        getLoginRateLimitConfig().maxRequests,
        getLoginRateLimitConfig().windowSeconds * 1000 as any
      ),
      analytics: true,
      prefix: `${basePrefix}:login`,
    })
  : null;

/**
 * Rate limiter for API requests
 * Configured via RATE_LIMIT_API_* environment variables
 */
export const apiRateLimiter = isRateLimitEnabled() && redis
  ? new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(
        getApiRateLimitConfig().maxRequests,
        getApiRateLimitConfig().windowSeconds * 1000 as any
      ),
      analytics: true,
      prefix: `${basePrefix}:api`,
    })
  : null;

/**
 * Rate limiter for signup requests
 * Configured via RATE_LIMIT_SIGNUP_* environment variables
 */
export const signupRateLimiter = isRateLimitEnabled() && redis
  ? new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(
        getSignupRateLimitConfig().maxRequests,
        getSignupRateLimitConfig().windowSeconds * 1000 as any
      ),
      analytics: true,
      prefix: `${basePrefix}:signup`,
    })
  : null;

/**
 * Rate limiter for password reset requests
 * Configured via RATE_LIMIT_PASSWORD_RESET_* environment variables
 */
export const passwordResetRateLimiter = isRateLimitEnabled() && redis
  ? new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(
        getPasswordResetRateLimitConfig().maxRequests,
        getPasswordResetRateLimitConfig().windowSeconds * 1000 as any
      ),
      analytics: true,
      prefix: `${basePrefix}:password-reset`,
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
 * If rate limiting is disabled, always returns success
 * @param identifier - Unique identifier (usually IP address)
 * @returns Rate limit result
 */
export async function checkLoginRateLimit(identifier: string) {
  // If rate limiting is disabled globally, allow all requests
  if (!isRateLimitEnabled()) {
    const loginConfig = getLoginRateLimitConfig();
    return {
      success: true,
      limit: loginConfig.maxRequests,
      remaining: loginConfig.maxRequests,
      reset: Date.now() + loginConfig.windowMs,
    };
  }

  if (loginRateLimiter) {
    return await loginRateLimiter.limit(identifier);
  }

  // Fallback to in-memory rate limiting
  const loginConfig = getLoginRateLimitConfig();
  return await inMemoryRateLimit(identifier, loginConfig.maxRequests, loginConfig.windowMs);
}

/**
 * Check rate limit for API requests
 * If rate limiting is disabled, always returns success
 * @param identifier - Unique identifier (usually IP address)
 * @returns Rate limit result
 */
export async function checkApiRateLimit(identifier: string) {
  // If rate limiting is disabled globally, allow all requests
  if (!isRateLimitEnabled()) {
    const apiConfig = getApiRateLimitConfig();
    return {
      success: true,
      limit: apiConfig.maxRequests,
      remaining: apiConfig.maxRequests,
      reset: Date.now() + apiConfig.windowMs,
    };
  }

  if (apiRateLimiter) {
    return await apiRateLimiter.limit(identifier);
  }

  // Fallback to in-memory rate limiting
  const apiConfig = getApiRateLimitConfig();
  return await inMemoryRateLimit(identifier, apiConfig.maxRequests, apiConfig.windowMs);
}

/**
 * Check rate limit for signup requests
 * If rate limiting is disabled, always returns success
 * @param identifier - Unique identifier (usually IP address)
 * @returns Rate limit result
 */
export async function checkSignupRateLimit(identifier: string) {
  // If rate limiting is disabled globally, allow all requests
  if (!isRateLimitEnabled()) {
    const signupConfig = getSignupRateLimitConfig();
    return {
      success: true,
      limit: signupConfig.maxRequests,
      remaining: signupConfig.maxRequests,
      reset: Date.now() + signupConfig.windowMs,
    };
  }

  if (signupRateLimiter) {
    return await signupRateLimiter.limit(identifier);
  }

  // Fallback to in-memory rate limiting
  const signupConfig = getSignupRateLimitConfig();
  return await inMemoryRateLimit(identifier, signupConfig.maxRequests, signupConfig.windowMs);
}

/**
 * Check rate limit for password reset requests
 * If rate limiting is disabled, always returns success
 * @param identifier - Unique identifier (usually IP address)
 * @returns Rate limit result
 */
export async function checkPasswordResetRateLimit(identifier: string) {
  // If rate limiting is disabled globally, allow all requests
  if (!isRateLimitEnabled()) {
    const prConfig = getPasswordResetRateLimitConfig();
    return {
      success: true,
      limit: prConfig.maxRequests,
      remaining: prConfig.maxRequests,
      reset: Date.now() + prConfig.windowMs,
    };
  }

  if (passwordResetRateLimiter) {
    return await passwordResetRateLimiter.limit(identifier);
  }

  // Fallback to in-memory rate limiting
  const prConfig = getPasswordResetRateLimitConfig();
  return await inMemoryRateLimit(identifier, prConfig.maxRequests, prConfig.windowMs);
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

