import { describe, it, expect } from 'vitest';
import { GET as getHealth } from '@/app/api/v1/health/route';
import { makeJsonRequest } from '../utils/next';

describe('GET /api/v1/health', () => {
  it('returns 200 with ok=true and service metadata', async () => {
    const req = makeJsonRequest({ path: '/api/v1/health' });
    const res = await getHealth(req as any);

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.status).toBe(200);
    expect(body.service).toBe('api');
    expect(typeof body.uptime_sec).toBe('number');
  });
});

