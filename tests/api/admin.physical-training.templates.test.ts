import { beforeEach, describe, expect, it, vi } from 'vitest';
import { GET } from '@/app/api/v1/admin/physical-training/templates/route';
import { makeJsonRequest } from '../utils/next';

vi.mock('@/app/lib/acx/withAuthz', () => ({
  withAuthz: (handler: any) => handler,
}));

vi.mock('@/app/lib/authz', () => ({
  requireAuth: vi.fn(),
}));

vi.mock('@/app/db/queries/physicalTraining', () => ({
  getPtTemplateByCourseSemester: vi.fn(),
}));

import { requireAuth } from '@/app/lib/authz';
import { getPtTemplateByCourseSemester } from '@/app/db/queries/physicalTraining';

describe('Admin PT templates API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(requireAuth).mockResolvedValue({
      userId: 'admin-1',
      roles: ['ADMIN'],
      claims: {},
    } as Awaited<ReturnType<typeof requireAuth>>);
  });

  it('GET returns a course PT template', async () => {
    vi.mocked(getPtTemplateByCourseSemester).mockResolvedValueOnce({
      courseId: '11111111-1111-4111-8111-111111111111',
      semester: 1,
      types: [],
      motivationFields: [],
    });

    const req = makeJsonRequest({
      method: 'GET',
      path: '/api/v1/admin/physical-training/templates?courseId=11111111-1111-4111-8111-111111111111&semester=1',
    });

    const res = await GET(req as any, { params: Promise.resolve({}) } as any);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.data.courseId).toBe('11111111-1111-4111-8111-111111111111');
    expect(getPtTemplateByCourseSemester).toHaveBeenCalledWith(
      '11111111-1111-4111-8111-111111111111',
      1,
      { includeDeleted: false, fallbackToLegacyGlobal: false },
    );
  });

  it('GET can request legacy global fallback for dossier display compatibility', async () => {
    vi.mocked(getPtTemplateByCourseSemester).mockResolvedValueOnce({
      courseId: null,
      semester: 1,
      types: [],
      motivationFields: [],
    });

    const req = makeJsonRequest({
      method: 'GET',
      path: '/api/v1/admin/physical-training/templates?courseId=11111111-1111-4111-8111-111111111111&semester=1&fallbackToLegacyGlobal=true',
    });

    const res = await GET(req as any, { params: Promise.resolve({}) } as any);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.data.courseId).toBeNull();
    expect(getPtTemplateByCourseSemester).toHaveBeenCalledWith(
      '11111111-1111-4111-8111-111111111111',
      1,
      { includeDeleted: false, fallbackToLegacyGlobal: true },
    );
  });

  it('GET returns 400 when course id is missing', async () => {
    const req = makeJsonRequest({
      method: 'GET',
      path: '/api/v1/admin/physical-training/templates?semester=1',
    });

    const res = await GET(req as any, { params: Promise.resolve({}) } as any);

    expect(res.status).toBe(400);
  });
});
