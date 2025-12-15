import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET as getMotivationAwardRoute, PATCH as patchMotivationAwardRoute, DELETE as deleteMotivationAwardRoute } from '@/app/api/v1/oc/[ocId]/motivation-awards/[id]/route';
import { makeJsonRequest } from '../utils/next';
import { ApiError } from '@/app/lib/http';
import * as authz from '@/app/lib/authz';
import * as ocChecks from '@/app/api/v1/oc/_checks';
import * as ocQueries from '@/app/db/queries/oc';
import * as auditLog from '@/lib/audit-log';

vi.mock('@/app/lib/authz', () => ({
  requireAuth: vi.fn(),
}));

vi.mock('@/app/api/v1/oc/_checks', () => ({
  mustBeAuthed: vi.fn(),
  mustBeAdmin: vi.fn(),
  parseParam: vi.fn(),
  ensureOcExists: vi.fn(),
}));

vi.mock('@/app/db/queries/oc', () => ({
  getMotivationAward: vi.fn(async () => null),
  updateMotivationAward: vi.fn(async () => null),
  deleteMotivationAward: vi.fn(async () => null),
}));

vi.mock('@/lib/audit-log', () => ({
  createAuditLog: vi.fn(async () => {}),
  logApiRequest: vi.fn(),
  ensureRequestContext: vi.fn(() => ({
    requestId: 'test',
    method: 'GET',
    pathname: '/',
    url: '/',
    startTime: Date.now(),
  })),
  noteRequestActor: vi.fn(),
  setRequestTenant: vi.fn(),
  AuditEventType: {
    OC_RECORD_CREATED: 'oc.record.created',
    OC_RECORD_UPDATED: 'oc.record.updated',
    OC_RECORD_DELETED: 'oc.record.deleted',
  },
  AuditResourceType: {
    OC: 'oc',
  },
}));

const basePath = '/api/v1/oc';
const ocId = '11111111-1111-4111-8111-111111111111';
const id = '22222222-2222-4222-8222-222222222222';

beforeEach(() => {
  vi.clearAllMocks();
  (auditLog.createAuditLog as any).mockClear?.();
});

describe('GET /api/v1/oc/:ocId/motivation-awards/:id', () => {
  it('returns 401 when authentication fails', async () => { (ocChecks.mustBeAuthed as any).mockRejectedValueOnce(new ApiError(401, 'Unauthorized', 'unauthorized')); const req = makeJsonRequest({ method: 'GET', path: `${basePath}/${ocId}/motivation-awards/${id}` }); const ctx = { params: { ocId, id } } as any; const res = await getMotivationAwardRoute(req as any, ctx); expect(res.status).toBe(401); const body = await res.json(); expect(body.ok).toBe(false); expect(body.error).toBe('unauthorized'); });

  it('returns 400 for invalid UUID in path params', async () => { (ocChecks.mustBeAuthed as any).mockResolvedValueOnce({ userId: 'u1', roles: [] }); (ocChecks.parseParam as any).mockRejectedValueOnce(new ApiError(400, 'Bad request', 'bad_request')); const req = makeJsonRequest({ method: 'GET', path: `${basePath}/not-a-uuid/motivation-awards/not-a-uuid` }); const ctx = { params: { ocId: 'not-a-uuid', id: 'not-a-uuid' } } as any; const res = await getMotivationAwardRoute(req as any, ctx); expect(res.status).toBe(400); const body = await res.json(); expect(body.ok).toBe(false); expect(body.error).toBe('bad_request'); });

  it('returns 404 when OC cadet is not found', async () => { (ocChecks.mustBeAuthed as any).mockResolvedValueOnce({ userId: 'u1', roles: [] }); (ocChecks.parseParam as any).mockResolvedValueOnce({ ocId }); (ocChecks.ensureOcExists as any).mockRejectedValueOnce(new ApiError(404, 'OC not found', 'not_found')); const req = makeJsonRequest({ method: 'GET', path: `${basePath}/${ocId}/motivation-awards/${id}` }); const ctx = { params: { ocId, id } } as any; const res = await getMotivationAwardRoute(req as any, ctx); expect(res.status).toBe(404); const body = await res.json(); expect(body.ok).toBe(false); expect(body.error).toBe('not_found'); });

  it('returns 404 when motivation award is not found', async () => { (ocChecks.mustBeAuthed as any).mockResolvedValueOnce({ userId: 'u1', roles: [] }); (ocChecks.parseParam as any).mockResolvedValueOnce({ ocId }).mockResolvedValueOnce({ id }); (ocChecks.ensureOcExists as any).mockResolvedValueOnce(undefined); (ocQueries.getMotivationAward as any).mockResolvedValueOnce(null); const req = makeJsonRequest({ method: 'GET', path: `${basePath}/${ocId}/motivation-awards/${id}` }); const ctx = { params: { ocId, id } } as any; const res = await getMotivationAwardRoute(req as any, ctx); expect(res.status).toBe(404); const body = await res.json(); expect(body.ok).toBe(false); expect(body.error).toBe('not_found'); });

  it('returns 200 with motivation award on happy path', async () => { (ocChecks.mustBeAuthed as any).mockResolvedValueOnce({ userId: 'u1', roles: [] }); (ocChecks.parseParam as any).mockResolvedValueOnce({ ocId }).mockResolvedValueOnce({ id }); (ocChecks.ensureOcExists as any).mockResolvedValueOnce(undefined); const row = { id, ocId, semester: 1, fieldName: 'Best Cadet', maxMarks: 100.0, marksObtained: 95.5 }; (ocQueries.getMotivationAward as any).mockResolvedValueOnce(row); const req = makeJsonRequest({ method: 'GET', path: `${basePath}/${ocId}/motivation-awards/${id}` }); const ctx = { params: { ocId, id } } as any; const res = await getMotivationAwardRoute(req as any, ctx); expect(res.status).toBe(200); const body = await res.json(); expect(body.ok).toBe(true); expect(body.data.id).toBe(id); });
});

describe('PATCH /api/v1/oc/:ocId/motivation-awards/:id', () => {
  it('returns 403 when user lacks admin privileges', async () => { (ocChecks.mustBeAdmin as any).mockRejectedValueOnce(new ApiError(403, 'Forbidden', 'forbidden')); const req = makeJsonRequest({ method: 'PATCH', path: `${basePath}/${ocId}/motivation-awards/${id}`, body: { fieldName: 'Updated' } }); const ctx = { params: { ocId, id } } as any; const res = await patchMotivationAwardRoute(req as any, ctx); expect(res.status).toBe(403); const body = await res.json(); expect(body.ok).toBe(false); expect(body.error).toBe('forbidden'); });

  it('returns 400 for invalid UUID in path params', async () => { (ocChecks.mustBeAdmin as any).mockResolvedValueOnce({ userId: 'admin-1', roles: ['ADMIN'] }); (ocChecks.parseParam as any).mockRejectedValueOnce(new ApiError(400, 'Bad request', 'bad_request')); const req = makeJsonRequest({ method: 'PATCH', path: `${basePath}/not-a-uuid/motivation-awards/not-a-uuid`, body: { fieldName: 'Updated' } }); const ctx = { params: { ocId: 'not-a-uuid', id: 'not-a-uuid' } } as any; const res = await patchMotivationAwardRoute(req as any, ctx); expect(res.status).toBe(400); const body = await res.json(); expect(body.ok).toBe(false); expect(body.error).toBe('bad_request'); });

  it('returns 400 when request body fails validation', async () => { (ocChecks.mustBeAdmin as any).mockResolvedValueOnce({ userId: 'admin-1', roles: ['ADMIN'] }); (ocChecks.parseParam as any).mockResolvedValueOnce({ ocId }).mockResolvedValueOnce({ id }); (ocChecks.ensureOcExists as any).mockResolvedValueOnce(undefined); const req = makeJsonRequest({ method: 'PATCH', path: `${basePath}/${ocId}/motivation-awards/${id}`, body: {} }); const ctx = { params: { ocId, id } } as any; const res = await patchMotivationAwardRoute(req as any, ctx); expect(res.status).toBe(400); const body = await res.json(); expect(body.ok).toBe(false); expect(body.error).toBe('bad_request'); });

  it('returns 404 when OC cadet is not found', async () => { (ocChecks.mustBeAdmin as any).mockResolvedValueOnce({ userId: 'admin-1', roles: ['ADMIN'] }); (ocChecks.parseParam as any).mockResolvedValueOnce({ ocId }); (ocChecks.ensureOcExists as any).mockRejectedValueOnce(new ApiError(404, 'OC not found', 'not_found')); const req = makeJsonRequest({ method: 'PATCH', path: `${basePath}/${ocId}/motivation-awards/${id}`, body: { fieldName: 'Updated' } }); const ctx = { params: { ocId, id } } as any; const res = await patchMotivationAwardRoute(req as any, ctx); expect(res.status).toBe(404); const body = await res.json(); expect(body.ok).toBe(false); expect(body.error).toBe('not_found'); });

  it('returns 404 when motivation award to update is not found', async () => { (ocChecks.mustBeAdmin as any).mockResolvedValueOnce({ userId: 'admin-1', roles: ['ADMIN'] }); (ocChecks.parseParam as any).mockResolvedValueOnce({ ocId }).mockResolvedValueOnce({ id }); (ocChecks.ensureOcExists as any).mockResolvedValueOnce(undefined); (ocQueries.updateMotivationAward as any).mockResolvedValueOnce(null); const req = makeJsonRequest({ method: 'PATCH', path: `${basePath}/${ocId}/motivation-awards/${id}`, body: { fieldName: 'Updated' } }); const ctx = { params: { ocId, id } } as any; const res = await patchMotivationAwardRoute(req as any, ctx); expect(res.status).toBe(404); const body = await res.json(); expect(body.ok).toBe(false); expect(body.error).toBe('not_found'); });

  it('returns 200 with updated motivation award on happy path', async () => { (ocChecks.mustBeAdmin as any).mockResolvedValueOnce({ userId: 'admin-1', roles: ['ADMIN'] }); (ocChecks.parseParam as any).mockResolvedValueOnce({ ocId }).mockResolvedValueOnce({ id }); (ocChecks.ensureOcExists as any).mockResolvedValueOnce(undefined); const updated = { id, ocId, semester: 1, fieldName: 'Updated', maxMarks: 100.0, marksObtained: 96.0 }; (ocQueries.updateMotivationAward as any).mockResolvedValueOnce(updated); const req = makeJsonRequest({ method: 'PATCH', path: `${basePath}/${ocId}/motivation-awards/${id}`, body: { fieldName: 'Updated' } }); const ctx = { params: { ocId, id } } as any; const res = await patchMotivationAwardRoute(req as any, ctx); expect(res.status).toBe(200); const body = await res.json(); expect(body.ok).toBe(true); expect(body.data.id).toBe(id); });
});

describe('DELETE /api/v1/oc/:ocId/motivation-awards/:id', () => {
  it('returns 403 when user lacks admin privileges', async () => { (ocChecks.mustBeAdmin as any).mockRejectedValueOnce(new ApiError(403, 'Forbidden', 'forbidden')); const req = makeJsonRequest({ method: 'DELETE', path: `${basePath}/${ocId}/motivation-awards/${id}` }); const ctx = { params: { ocId, id } } as any; const res = await deleteMotivationAwardRoute(req as any, ctx); expect(res.status).toBe(403); const body = await res.json(); expect(body.ok).toBe(false); expect(body.error).toBe('forbidden'); });

  it('returns 400 for invalid UUID in path params', async () => { (ocChecks.mustBeAdmin as any).mockResolvedValueOnce({ userId: 'admin-1', roles: ['ADMIN'] }); (ocChecks.parseParam as any).mockRejectedValueOnce(new ApiError(400, 'Bad request', 'bad_request')); const req = makeJsonRequest({ method: 'DELETE', path: `${basePath}/not-a-uuid/motivation-awards/not-a-uuid` }); const ctx = { params: { ocId: 'not-a-uuid', id: 'not-a-uuid' } } as any; const res = await deleteMotivationAwardRoute(req as any, ctx); expect(res.status).toBe(400); const body = await res.json(); expect(body.ok).toBe(false); expect(body.error).toBe('bad_request'); });

  it('returns 404 when OC cadet is not found', async () => { (ocChecks.mustBeAdmin as any).mockResolvedValueOnce({ userId: 'admin-1', roles: ['ADMIN'] }); (ocChecks.parseParam as any).mockResolvedValueOnce({ ocId }); (ocChecks.ensureOcExists as any).mockRejectedValueOnce(new ApiError(404, 'OC not found', 'not_found')); const req = makeJsonRequest({ method: 'DELETE', path: `${basePath}/${ocId}/motivation-awards/${id}` }); const ctx = { params: { ocId, id } } as any; const res = await deleteMotivationAwardRoute(req as any, ctx); expect(res.status).toBe(404); const body = await res.json(); expect(body.ok).toBe(false); expect(body.error).toBe('not_found'); });

  it('returns 404 when motivation award to delete is not found', async () => { (ocChecks.mustBeAdmin as any).mockResolvedValueOnce({ userId: 'admin-1', roles: ['ADMIN'] }); (ocChecks.parseParam as any).mockResolvedValueOnce({ ocId }).mockResolvedValueOnce({ id }); (ocChecks.ensureOcExists as any).mockResolvedValueOnce(undefined); (ocQueries.deleteMotivationAward as any).mockResolvedValueOnce(null); const req = makeJsonRequest({ method: 'DELETE', path: `${basePath}/${ocId}/motivation-awards/${id}` }); const ctx = { params: { ocId, id } } as any; const res = await deleteMotivationAwardRoute(req as any, ctx); expect(res.status).toBe(404); const body = await res.json(); expect(body.ok).toBe(false); expect(body.error).toBe('not_found'); });

  it('returns 200 with soft-delete message on happy path', async () => { (ocChecks.mustBeAdmin as any).mockResolvedValueOnce({ userId: 'admin-1', roles: ['ADMIN'] }); (ocChecks.parseParam as any).mockResolvedValueOnce({ ocId }).mockResolvedValueOnce({ id }); (ocChecks.ensureOcExists as any).mockResolvedValueOnce(undefined); (ocQueries.deleteMotivationAward as any).mockResolvedValueOnce({ id }); const req = makeJsonRequest({ method: 'DELETE', path: `${basePath}/${ocId}/motivation-awards/${id}` }); const ctx = { params: { ocId, id } } as any; const res = await deleteMotivationAwardRoute(req as any, ctx); expect(res.status).toBe(200); const body = await res.json(); expect(body.ok).toBe(true); expect(body.id).toBe(id); expect(body.message).toMatch(/soft-deleted/); });

  it('returns 200 with hard-delete message on happy path', async () => { (ocChecks.mustBeAdmin as any).mockResolvedValueOnce({ userId: 'admin-1', roles: ['ADMIN'] }); (ocChecks.parseParam as any).mockResolvedValueOnce({ ocId }).mockResolvedValueOnce({ id }); (ocChecks.ensureOcExists as any).mockResolvedValueOnce(undefined); (ocQueries.deleteMotivationAward as any).mockResolvedValueOnce({ id }); const req = makeJsonRequest({ method: 'DELETE', path: `${basePath}/${ocId}/motivation-awards/${id}?hard=true` }); const ctx = { params: { ocId, id } } as any; const res = await deleteMotivationAwardRoute(req as any, ctx); expect(res.status).toBe(200); const body = await res.json(); expect(body.ok).toBe(true); expect(body.id).toBe(id); expect(body.message).toMatch(/hard-deleted/); });
});
