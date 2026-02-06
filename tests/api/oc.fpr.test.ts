import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET } from '@/app/api/v1/oc/[ocId]/fpr/route';
import { makeJsonRequest } from '../utils/next';
import * as ocChecks from '@/app/api/v1/oc/_checks';
import * as authz from '@/lib/authorization';
import * as service from '@/app/services/oc-performance-records';

vi.mock('@/app/api/v1/oc/_checks', () => ({
  parseParam: vi.fn(),
  ensureOcExists: vi.fn(),
}));

vi.mock('@/lib/authorization', () => ({
  authorizeOcAccess: vi.fn(),
}));

vi.mock('@/app/services/oc-performance-records', () => ({
  getFprView: vi.fn(),
}));

const ocId = '11111111-1111-4111-8111-111111111111';

beforeEach(() => {
  vi.clearAllMocks();
  (ocChecks.parseParam as any).mockImplementation(async ({ params }: any, schema: any) => schema.parse(await params));
  (ocChecks.ensureOcExists as any).mockResolvedValue(undefined);
  (authz.authorizeOcAccess as any).mockResolvedValue({ userId: 'u1' });
});

describe('GET /api/v1/oc/:ocId/fpr', () => {
  it('returns fpr payload', async () => {
    (service.getFprView as any).mockResolvedValue({ rows: [] });
    const req = makeJsonRequest({ method: 'GET', path: `/api/v1/oc/${ocId}/fpr` });
    const res = await GET(req as any, { params: Promise.resolve({ ocId }) } as any);
    expect(res.status).toBe(200);
  });
});
