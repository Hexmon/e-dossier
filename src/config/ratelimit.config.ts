import { z } from 'zod';

/**
 * Rate Limit Configuration Module
 * Parses and validates environment variables for configurable rate limiting
 */

// Zod schema for rate limit config
const RateLimitConfigSchema = z.object({
  // Global rate limit enable/disable switch
  enabled: z.enum(['true', 'false']).default('false').transform(v => v === 'true'),

  // API rate limiting (general endpoints)
  api: z.object({
    maxRequests: z.coerce.number().int().positive().default(100),
    windowSeconds: z.coerce.number().int().positive().default(60),
    blockSeconds: z.coerce.number().int().positive().default(300),
  }).optional().default({ maxRequests: 100, windowSeconds: 60, blockSeconds: 300 }),

  // Login rate limiting
  login: z.object({
    maxRequests: z.coerce.number().int().positive().default(5),
    windowSeconds: z.coerce.number().int().positive().default(900), // 15 minutes
    blockSeconds: z.coerce.number().int().positive().default(600), // 10 minutes
  }).optional().default({ maxRequests: 5, windowSeconds: 900, blockSeconds: 600 }),

  // Signup rate limiting
  signup: z.object({
    maxRequests: z.coerce.number().int().positive().default(3),
    windowSeconds: z.coerce.number().int().positive().default(3600), // 1 hour
    blockSeconds: z.coerce.number().int().positive().default(600),
  }).optional().default({ maxRequests: 3, windowSeconds: 3600, blockSeconds: 600 }),

  // Password reset rate limiting
  passwordReset: z.object({
    maxRequests: z.coerce.number().int().positive().default(3),
    windowSeconds: z.coerce.number().int().positive().default(3600), // 1 hour
    blockSeconds: z.coerce.number().int().positive().default(600),
  }).optional().default({ maxRequests: 3, windowSeconds: 3600, blockSeconds: 600 }),

  // Redis key prefix
  redisKeyPrefix: z.string().default('ratelimit'),

  // Rate limit identifier type (IP is default and currently only supported)
  identifierType: z.enum(['ip']).default('ip'),

  // Health endpoint exclusion
  excludeHealthCheck: z.enum(['true', 'false']).default('true').transform(v => v === 'true'),
});

type RateLimitConfig = z.infer<typeof RateLimitConfigSchema>;

/**
 * Parse and validate rate limit configuration from environment variables
 * Handles defaults gracefully for missing values
 */
function parseRateLimitConfig(): RateLimitConfig {
  const raw = {
    enabled: process.env.RATE_LIMIT_ENABLED,

    api: {
      maxRequests: process.env.RATE_LIMIT_API_MAX_REQUESTS,
      windowSeconds: process.env.RATE_LIMIT_API_WINDOW_SECONDS,
      blockSeconds: process.env.RATE_LIMIT_API_BLOCK_SECONDS,
    },

    login: {
      maxRequests: process.env.RATE_LIMIT_LOGIN_MAX_REQUESTS,
      windowSeconds: process.env.RATE_LIMIT_LOGIN_WINDOW_SECONDS,
      blockSeconds: process.env.RATE_LIMIT_LOGIN_BLOCK_SECONDS,
    },

    signup: {
      maxRequests: process.env.RATE_LIMIT_SIGNUP_MAX_REQUESTS,
      windowSeconds: process.env.RATE_LIMIT_SIGNUP_WINDOW_SECONDS,
      blockSeconds: process.env.RATE_LIMIT_SIGNUP_BLOCK_SECONDS,
    },

    passwordReset: {
      maxRequests: process.env.RATE_LIMIT_PASSWORD_RESET_MAX_REQUESTS,
      windowSeconds: process.env.RATE_LIMIT_PASSWORD_RESET_WINDOW_SECONDS,
      blockSeconds: process.env.RATE_LIMIT_PASSWORD_RESET_BLOCK_SECONDS,
    },

    redisKeyPrefix: process.env.RATE_LIMIT_REDIS_KEY_PREFIX,
    identifierType: process.env.RATE_LIMIT_IDENTIFIER_TYPE,
    excludeHealthCheck: process.env.RATE_LIMIT_EXCLUDE_HEALTH_CHECK,
  };

  try {
    return RateLimitConfigSchema.parse(raw);
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.warn('[RateLimit Config] Validation errors, using defaults:', error.flatten().fieldErrors);
    }
    // Fall back to defaults by returning empty object to parse
    return RateLimitConfigSchema.parse({});
  }
}

/**
 * Export singleton config instance
 */
export const rateLimitConfig = parseRateLimitConfig();

/**
 * Helper to check if rate limiting is enabled
 */
export function isRateLimitEnabled(): boolean {
  return rateLimitConfig.enabled;
}

/**
 * Get rate limit config for API endpoints
 */
export function getApiRateLimitConfig() {
  return {
    maxRequests: rateLimitConfig.api.maxRequests,
    windowSeconds: rateLimitConfig.api.windowSeconds,
    windowMs: rateLimitConfig.api.windowSeconds * 1000,
    blockSeconds: rateLimitConfig.api.blockSeconds,
    blockMs: rateLimitConfig.api.blockSeconds * 1000,
  };
}

/**
 * Get rate limit config for login endpoints
 */
export function getLoginRateLimitConfig() {
  return {
    maxRequests: rateLimitConfig.login.maxRequests,
    windowSeconds: rateLimitConfig.login.windowSeconds,
    windowMs: rateLimitConfig.login.windowSeconds * 1000,
    blockSeconds: rateLimitConfig.login.blockSeconds,
    blockMs: rateLimitConfig.login.blockSeconds * 1000,
  };
}

/**
 * Get rate limit config for signup endpoints
 */
export function getSignupRateLimitConfig() {
  return {
    maxRequests: rateLimitConfig.signup.maxRequests,
    windowSeconds: rateLimitConfig.signup.windowSeconds,
    windowMs: rateLimitConfig.signup.windowSeconds * 1000,
    blockSeconds: rateLimitConfig.signup.blockSeconds,
    blockMs: rateLimitConfig.signup.blockSeconds * 1000,
  };
}

/**
 * Get rate limit config for password reset endpoints
 */
export function getPasswordResetRateLimitConfig() {
  return {
    maxRequests: rateLimitConfig.passwordReset.maxRequests,
    windowSeconds: rateLimitConfig.passwordReset.windowSeconds,
    windowMs: rateLimitConfig.passwordReset.windowSeconds * 1000,
    blockSeconds: rateLimitConfig.passwordReset.blockSeconds,
    blockMs: rateLimitConfig.passwordReset.blockSeconds * 1000,
  };
}

/**
 * Get Redis key prefix for rate limiting
 */
export function getRateLimitRedisKeyPrefix(): string {
  return rateLimitConfig.redisKeyPrefix;
}

/**
 * Check if health endpoint should be excluded from rate limiting
 */
export function shouldExcludeHealthCheck(): boolean {
  return rateLimitConfig.excludeHealthCheck;
}
