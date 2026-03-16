import { beforeEach, describe, expect, it, vi } from 'vitest';

import { POST as presignPlatoonImage } from '@/app/api/v1/platoons/image/presign/route';
import { ApiError } from '@/app/lib/http';
import { makeJsonRequest, createRouteContext } from '../utils/next';

import * as authz from '@/app/lib/authz';
import * as storage from '@/app/lib/storage';

const auditLogMock = vi.fn(async () => undefined);

vi.mock('@/lib/audit', () => ({
  withAuditRoute: (_method: string, handler: any) => {
    return (req: any, context: any) => {
      req.audit = { log: auditLogMock };
      return handler(req, context);
    };
  },
  AuditEventType: {
    API_REQUEST: 'ACCESS.REQUEST',
  },
  AuditResourceType: {
    API: 'api',
  },
}));

vi.mock('@/app/lib/authz', () => ({
  requireAuth: vi.fn(),
}));

vi.mock('@/app/lib/storage', () => ({
  createPresignedUploadUrl: vi.fn(async () => 'https://upload.example.test/platoons/arjun/upload'),
  getPublicObjectUrl: vi.fn(() => 'https://public.example.test/platoons/arjun/image.png'),
}));

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(authz.requireAuth).mockResolvedValue({
    userId: 'user-1',
    roles: ['ADMIN'],
    claims: {},
  } as Awaited<ReturnType<typeof authz.requireAuth>>);
});

describe('POST /api/v1/platoons/image/presign', () => {
  it('returns 401 when auth fails', async () => {
    vi.mocked(authz.requireAuth).mockRejectedValueOnce(
      new ApiError(401, 'Unauthorized', 'unauthorized'),
    );

    const req = makeJsonRequest({
      method: 'POST',
      path: '/api/v1/platoons/image/presign',
      body: {
        platoonKey: 'ARJUN',
        contentType: 'image/png',
        sizeBytes: 1024,
      },
    });

    const res = await presignPlatoonImage(req as any, createRouteContext());

    expect(res.status).toBe(401);
  });

  it('returns 400 for an invalid request body', async () => {
    const req = makeJsonRequest({
      method: 'POST',
      path: '/api/v1/platoons/image/presign',
      body: {
        platoonKey: 'bad key',
        contentType: 'text/plain',
        sizeBytes: -1,
      },
    });

    const res = await presignPlatoonImage(req as any, createRouteContext());
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.error).toBe('bad_request');
  });

  it('returns a presigned upload url for a valid image request', async () => {
    const req = makeJsonRequest({
      method: 'POST',
      path: '/api/v1/platoons/image/presign',
      body: {
        platoonKey: 'ARJUN',
        contentType: 'image/png',
        sizeBytes: 1024,
      },
    });

    const res = await presignPlatoonImage(req as any, createRouteContext());
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.message).toBe('Presigned upload URL generated successfully.');
    expect(body.uploadUrl).toBe('https://upload.example.test/platoons/arjun/upload');
    expect(body.publicUrl).toBe('https://public.example.test/platoons/arjun/image.png');
    expect(body.objectKey).toMatch(/^platoons\/arjun\/.+\.png$/);
    expect(body.expiresInSeconds).toBe(300);
    expect(storage.createPresignedUploadUrl).toHaveBeenCalledWith(
      expect.objectContaining({
        contentType: 'image/png',
        expiresInSeconds: 300,
        key: expect.stringMatching(/^platoons\/arjun\/.+\.png$/),
      }),
    );
    expect(storage.getPublicObjectUrl).toHaveBeenCalledWith(
      expect.stringMatching(/^platoons\/arjun\/.+\.png$/),
    );
    expect(auditLogMock).toHaveBeenCalledWith(
      expect.objectContaining({
        outcome: 'SUCCESS',
        metadata: expect.objectContaining({
          platoonKey: 'ARJUN',
          sizeBytes: 1024,
        }),
      }),
    );
  });
});
