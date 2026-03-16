import { beforeEach, describe, expect, it, vi } from 'vitest';

import { GET as getCommanderHistory } from '@/app/api/v1/platoons/[idOrKey]/commander-history/route';
import { ApiError } from '@/app/lib/http';
import { makeJsonRequest, createRouteContext } from '../utils/next';

import * as platoonCommanderQueries from '@/app/db/queries/platoon-commanders';

vi.mock('@/lib/audit', () => ({
  withAuditRoute: (_method: string, handler: any) => handler,
}));

vi.mock('@/app/db/queries/platoon-commanders', () => ({
  getPlatoonCommanderHistoryByIdOrKey: vi.fn(),
}));

beforeEach(() => {
  vi.clearAllMocks();
});

describe('GET /api/v1/platoons/[idOrKey]/commander-history', () => {
  it('returns 400 when the idOrKey param is blank', async () => {
    const req = makeJsonRequest({
      method: 'GET',
      path: '/api/v1/platoons/%20/commander-history',
    });

    const res = await getCommanderHistory(req as any, createRouteContext({ idOrKey: '%20' }));
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.error).toBe('bad_request');
  });

  it('returns 404 when the platoon does not exist', async () => {
    vi.mocked(platoonCommanderQueries.getPlatoonCommanderHistoryByIdOrKey).mockRejectedValueOnce(
      new ApiError(404, 'Platoon not found.', 'not_found'),
    );

    const req = makeJsonRequest({
      method: 'GET',
      path: '/api/v1/platoons/ARJUN/commander-history',
    });

    const res = await getCommanderHistory(req as any, createRouteContext({ idOrKey: 'ARJUN' }));
    const body = await res.json();

    expect(res.status).toBe(404);
    expect(body.error).toBe('not_found');
  });

  it('returns the public commander history with cache headers', async () => {
    vi.mocked(platoonCommanderQueries.getPlatoonCommanderHistoryByIdOrKey).mockResolvedValueOnce({
      platoon: {
        id: 'platoon-1',
        key: 'ARJUN',
        name: 'Arjun',
        about: 'Alpha platoon',
        themeColor: '#112233',
        imageUrl: 'https://public.example.test/arjun.png',
      },
      items: [
        {
          appointmentId: 'apt-1',
          userId: 'user-1',
          username: 'commander',
          name: 'Commander One',
          rank: 'CAPT',
          assignment: 'PRIMARY',
          startsAt: new Date('2025-01-01T00:00:00.000Z'),
          endsAt: null,
          status: 'CURRENT',
        },
      ],
    });

    const req = makeJsonRequest({
      method: 'GET',
      path: '/api/v1/platoons/ARJUN/commander-history',
    });

    const res = await getCommanderHistory(req as any, createRouteContext({ idOrKey: 'ARJUN' }));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.message).toBe('Public platoon commander history retrieved successfully.');
    expect(body.platoon.key).toBe('ARJUN');
    expect(body.items).toEqual([
      expect.objectContaining({
        appointmentId: 'apt-1',
        name: 'Commander One',
        rank: 'CAPT',
        status: 'CURRENT',
      }),
    ]);
    expect(res.headers.get('Cache-Control')).toBe('public, max-age=60, stale-while-revalidate=300');
  });
});
