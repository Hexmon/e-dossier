import { describe, expect, it } from 'vitest';
import { shouldSkipRateLimit } from '@/middleware';

describe('shouldSkipRateLimit', () => {
  it('skips rate limit for logout POST', () => {
    expect(shouldSkipRateLimit('/api/v1/auth/logout', 'POST')).toBe(true);
  });

  it('skips rate limit for logout OPTIONS', () => {
    expect(shouldSkipRateLimit('/api/v1/auth/logout', 'OPTIONS')).toBe(true);
  });

  it('does not skip rate limit for logout GET', () => {
    expect(shouldSkipRateLimit('/api/v1/auth/logout', 'GET')).toBe(false);
  });

  it('does not skip rate limit for other API routes', () => {
    expect(shouldSkipRateLimit('/api/v1/oc', 'POST')).toBe(false);
  });
});

