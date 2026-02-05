import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  checkApiRateLimit,
  checkLoginRateLimit,
  checkSignupRateLimit,
  checkPasswordResetRateLimit,
  getClientIp,
} from '@/lib/ratelimit';
import * as rateLimitConfig from '@/config/ratelimit.config';
import { NextRequest } from 'next/server';

/**
 * Tests for configurable rate limiting
 * Verifies that rate limiting respects environment configuration
 */

describe('Rate Limiting Configuration', () => {
  beforeEach(() => {
    // Reset mocks before each test
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetModules();
  });

  describe('isRateLimitEnabled', () => {
    it('should return true when RATE_LIMIT_ENABLED=true', () => {
      vi.spyOn(rateLimitConfig, 'isRateLimitEnabled').mockReturnValue(true);
      expect(rateLimitConfig.isRateLimitEnabled()).toBe(true);
    });

    it('should return false when RATE_LIMIT_ENABLED=false (default)', () => {
      vi.spyOn(rateLimitConfig, 'isRateLimitEnabled').mockReturnValue(false);
      expect(rateLimitConfig.isRateLimitEnabled()).toBe(false);
    });
  });

  describe('getApiRateLimitConfig', () => {
    it('should return default API rate limit config', () => {
      const config = rateLimitConfig.getApiRateLimitConfig();
      expect(config).toMatchObject({
        maxRequests: expect.any(Number),
        windowSeconds: expect.any(Number),
        windowMs: expect.any(Number),
      });
      expect(config.windowMs).toBe(config.windowSeconds * 1000);
    });

    it('should use configured values if provided', () => {
      const config = rateLimitConfig.getApiRateLimitConfig();
      // Default values should be 100 and 60
      expect(config.maxRequests).toBe(100);
      expect(config.windowSeconds).toBe(60);
    });
  });

  describe('getLoginRateLimitConfig', () => {
    it('should return default login rate limit config', () => {
      const config = rateLimitConfig.getLoginRateLimitConfig();
      expect(config).toMatchObject({
        maxRequests: expect.any(Number),
        windowSeconds: expect.any(Number),
        windowMs: expect.any(Number),
      });
    });

    it('should have default of 5 attempts per 15 minutes', () => {
      const config = rateLimitConfig.getLoginRateLimitConfig();
      expect(config.maxRequests).toBe(5);
      expect(config.windowSeconds).toBe(900);
    });
  });

  describe('getSignupRateLimitConfig', () => {
    it('should return default signup rate limit config', () => {
      const config = rateLimitConfig.getSignupRateLimitConfig();
      expect(config).toMatchObject({
        maxRequests: expect.any(Number),
        windowSeconds: expect.any(Number),
      });
    });

    it('should have default of 3 attempts per hour', () => {
      const config = rateLimitConfig.getSignupRateLimitConfig();
      expect(config.maxRequests).toBe(3);
      expect(config.windowSeconds).toBe(3600);
    });
  });

  describe('getPasswordResetRateLimitConfig', () => {
    it('should return default password reset rate limit config', () => {
      const config = rateLimitConfig.getPasswordResetRateLimitConfig();
      expect(config).toMatchObject({
        maxRequests: expect.any(Number),
        windowSeconds: expect.any(Number),
      });
    });

    it('should have default of 3 attempts per hour', () => {
      const config = rateLimitConfig.getPasswordResetRateLimitConfig();
      expect(config.maxRequests).toBe(3);
      expect(config.windowSeconds).toBe(3600);
    });
  });

  describe('shouldExcludeHealthCheck', () => {
    it('should return true by default to exclude health check', () => {
      expect(rateLimitConfig.shouldExcludeHealthCheck()).toBe(true);
    });
  });

  describe('getRateLimitRedisKeyPrefix', () => {
    it('should return default prefix "ratelimit"', () => {
      expect(rateLimitConfig.getRateLimitRedisKeyPrefix()).toBe('ratelimit');
    });
  });
});

describe('Rate Limit Functions with Config', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('checkApiRateLimit when disabled', () => {
    it('should allow all requests when rate limiting disabled', async () => {
      vi.spyOn(rateLimitConfig, 'isRateLimitEnabled').mockReturnValue(false);

      const result = await checkApiRateLimit('127.0.0.1');

      expect(result.success).toBe(true);
      expect(result.limit).toBe(100); // default max
      expect(result.remaining).toBe(100);
    });
  });

  describe('checkLoginRateLimit when disabled', () => {
    it('should allow all requests when rate limiting disabled', async () => {
      vi.spyOn(rateLimitConfig, 'isRateLimitEnabled').mockReturnValue(false);

      const result = await checkLoginRateLimit('127.0.0.1');

      expect(result.success).toBe(true);
      expect(result.limit).toBe(5); // default max
    });
  });

  describe('checkSignupRateLimit when disabled', () => {
    it('should allow all requests when rate limiting disabled', async () => {
      vi.spyOn(rateLimitConfig, 'isRateLimitEnabled').mockReturnValue(false);

      const result = await checkSignupRateLimit('127.0.0.1');

      expect(result.success).toBe(true);
      expect(result.limit).toBe(3); // default max
    });
  });

  describe('checkPasswordResetRateLimit when disabled', () => {
    it('should allow all requests when rate limiting disabled', async () => {
      vi.spyOn(rateLimitConfig, 'isRateLimitEnabled').mockReturnValue(false);

      const result = await checkPasswordResetRateLimit('127.0.0.1');

      expect(result.success).toBe(true);
      expect(result.limit).toBe(3); // default max
    });
  });

  describe('Rate limit in-memory fallback', () => {
    beforeEach(() => {
      vi.spyOn(rateLimitConfig, 'isRateLimitEnabled').mockReturnValue(true);
    });

    it('should track requests and enforce limit when enabled', async () => {
      const clientIp = '192.168.1.100';
      const config = rateLimitConfig.getApiRateLimitConfig();

      // First request should succeed
      const result1 = await checkApiRateLimit(clientIp);
      expect(result1.success).toBe(true);

      // Keep making requests up to the limit
      for (let i = 1; i < config.maxRequests; i++) {
        const result = await checkApiRateLimit(clientIp);
        expect(result.success).toBe(true);
        expect(result.remaining).toBeLessThanOrEqual(config.maxRequests - i - 1);
      }

      // Request exceeding limit should fail
      const resultExceeded = await checkApiRateLimit(clientIp);
      expect(resultExceeded.success).toBe(false);
      expect(resultExceeded.remaining).toBe(0);
    });

    it('should track requests separately for different IPs', async () => {
      const ip1 = '192.168.1.1';
      const ip2 = '192.168.1.2';

      const result1 = await checkApiRateLimit(ip1);
      const result2 = await checkApiRateLimit(ip2);

      expect(result1.success).toBe(true);
      expect(result2.success).toBe(true);
      // Both should have independent remaining counts
      expect(result1.remaining).toBe(result2.remaining);
    });
  });
});

describe('Client IP Extraction', () => {
  it('should extract IP from X-Forwarded-For header', () => {
    const req = new NextRequest('http://localhost:3000/api/test', {
      headers: {
        'x-forwarded-for': '203.0.113.5, 203.0.113.6',
      },
    });

    const ip = getClientIp(req);
    expect(ip).toBe('203.0.113.5');
  });

  it('should extract IP from X-Real-IP header', () => {
    const req = new NextRequest('http://localhost:3000/api/test', {
      headers: {
        'x-real-ip': '203.0.113.7',
      },
    });

    const ip = getClientIp(req);
    expect(ip).toBe('203.0.113.7');
  });

  it('should prefer X-Forwarded-For over X-Real-IP', () => {
    const req = new NextRequest('http://localhost:3000/api/test', {
      headers: {
        'x-forwarded-for': '203.0.113.5',
        'x-real-ip': '203.0.113.7',
      },
    });

    const ip = getClientIp(req);
    expect(ip).toBe('203.0.113.5');
  });

  it('should return default IP when no headers present', () => {
    const req = new NextRequest('http://localhost:3000/api/test');
    const ip = getClientIp(req);
    expect(ip).toBe('127.0.0.1');
  });

  it('should trim whitespace from IP addresses', () => {
    const req = new NextRequest('http://localhost:3000/api/test', {
      headers: {
        'x-forwarded-for': '  203.0.113.5  , 203.0.113.6  ',
      },
    });

    const ip = getClientIp(req);
    expect(ip).toBe('203.0.113.5');
  });
});
