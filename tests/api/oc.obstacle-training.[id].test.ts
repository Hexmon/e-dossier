import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET as getObstacleTrainingRoute, PATCH as patchObstacleTrainingRoute, DELETE as deleteObstacleTrainingRoute } from '@/app/api/v1/oc/[ocId]/obstacle-training/[id]/route';
import { makeJsonRequest, createRouteContext } from '../utils/next';
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
  getObstacleTraining: vi.fn(async () => null),
  updateObstacleTraining: vi.fn(async () => null),
  deleteObstacleTraining: vi.fn(async () => null),
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

describe('GET /api/v1/oc/:ocId/obstacle-training/:id', () => {
  it('returns 401 when authentication fails', async () => { (ocChecks.mustBeAuthed as any).mockRejectedValueOnce(new ApiError(401, 'Unauthorized', 'unauthorized')); const req = makeJsonRequest({ method: 'GET', path: `${basePath}/${ocId}/obstacle-training/${id}` }); const ctx = { params: { ocId, id } } as any; const res = await getObstacleTrainingRoute(req as any, ctx); expect(res.status).toBe(401); const body = await res.json(); expect(body.ok).toBe(false); expect(body.error).toBe('unauthorized'); });

  it('returns 400 for invalid UUID in path params', async () => { (ocChecks.mustBeAuthed as any).mockResolvedValueOnce({ userId: 'u1', roles: [] }); (ocChecks.parseParam as any).mockRejectedValueOnce(new ApiError(400, 'Bad request', 'bad_request')); const req = makeJsonRequest({ method: 'GET', path: `${basePath}/not-a-uuid/obstacle-training/not-a-uuid` }); const ctx = { params: { ocId: 'not-a-uuid', id: 'not-a-uuid' } } as any; const res = await getObstacleTrainingRoute(req as any, ctx); expect(res.status).toBe(400); const body = await res.json(); expect(body.ok).toBe(false); expect(body.error).toBe('bad_request'); });

  it('returns 404 when OC cadet is not found', async () => { (ocChecks.mustBeAuthed as any).mockResolvedValueOnce({ userId: 'u1', roles: [] }); (ocChecks.parseParam as any).mockResolvedValueOnce({ ocId }); (ocChecks.ensureOcExists as any).mockRejectedValueOnce(new ApiError(404, 'OC not found', 'not_found')); const req = makeJsonRequest({ method: 'GET', path: `${basePath}/${ocId}/obstacle-training/${id}` }); const ctx = { params: { ocId, id } } as any; const res = await getObstacleTrainingRoute(req as any, ctx); expect(res.status).toBe(404); const body = await res.json(); expect(body.ok).toBe(false); expect(body.error).toBe('not_found'); });

  it('returns 404 when obstacle training record is not found', async () => { (ocChecks.mustBeAuthed as any).mockResolvedValueOnce({ userId: 'u1', roles: [] }); (ocChecks.parseParam as any).mockResolvedValueOnce({ ocId }).mockResolvedValueOnce({ id }); (ocChecks.ensureOcExists as any).mockResolvedValueOnce(undefined); (ocQueries.getObstacleTraining as any).mockResolvedValueOnce(null); const req = makeJsonRequest({ method: 'GET', path: `${basePath}/${ocId}/obstacle-training/${id}` }); const ctx = { params: { ocId, id } } as any; const res = await getObstacleTrainingRoute(req as any, ctx); expect(res.status).toBe(404); const body = await res.json(); expect(body.ok).toBe(false); expect(body.error).toBe('not_found'); });

  it('returns 200 with obstacle training record on happy path', async () => { (ocChecks.mustBeAuthed as any).mockResolvedValueOnce({ userId: 'u1', roles: [] }); (ocChecks.parseParam as any).mockResolvedValueOnce({ ocId }).mockResolvedValueOnce({ id }); (ocChecks.ensureOcExists as any).mockResolvedValueOnce(undefined); const row = { id, ocId, semester: 4, obstacle: 'High wall', marksObtained: 18.5, remark: 'Good' }; (ocQueries.getObstacleTraining as any).mockResolvedValueOnce(row); const req = makeJsonRequest({ method: 'GET', path: `${basePath}/${ocId}/obstacle-training/${id}` }); const ctx = { params: { ocId, id } } as any; const res = await getObstacleTrainingRoute(req as any, ctx); expect(res.status).toBe(200); const body = await res.json(); expect(body.ok).toBe(true); expect(body.data.id).toBe(id); });
});

describe('PATCH /api/v1/oc/:ocId/obstacle-training/:id', () => {
  it('returns 403 when user lacks admin privileges', async () => { (ocChecks.mustBeAdmin as any).mockRejectedValueOnce(new ApiError(403, 'Forbidden', 'forbidden')); const req = makeJsonRequest({ method: 'PATCH', path: `${basePath}/${ocId}/obstacle-training/${id}`, body: { remark: 'Updated' } }); const ctx = { params: { ocId, id } } as any; const res = await patchObstacleTrainingRoute(req as any, ctx); expect(res.status).toBe(403); const body = await res.json(); expect(body.ok).toBe(false); expect(body.error).toBe('forbidden'); });

  it('returns 400 for invalid UUID in path params', async () => { (ocChecks.mustBeAdmin as any).mockResolvedValueOnce({ userId: 'admin-1', roles: ['ADMIN'] }); (ocChecks.parseParam as any).mockRejectedValueOnce(new ApiError(400, 'Bad request', 'bad_request')); const req = makeJsonRequest({ method: 'PATCH', path: `${basePath}/not-a-uuid/obstacle-training/not-a-uuid`, body: { remark: 'Updated' } }); const ctx = { params: { ocId: 'not-a-uuid', id: 'not-a-uuid' } } as any; const res = await patchObstacleTrainingRoute(req as any, ctx); expect(res.status).toBe(400); const body = await res.json(); expect(body.ok).toBe(false); expect(body.error).toBe('bad_request'); });

  it('returns 400 when request body fails validation', async () => { (ocChecks.mustBeAdmin as any).mockResolvedValueOnce({ userId: 'admin-1', roles: ['ADMIN'] }); (ocChecks.parseParam as any).mockResolvedValueOnce({ ocId }).mockResolvedValueOnce({ id }); (ocChecks.ensureOcExists as any).mockResolvedValueOnce(undefined); const req = makeJsonRequest({ method: 'PATCH', path: `${basePath}/${ocId}/obstacle-training/${id}`, body: {} }); const ctx = { params: { ocId, id } } as any; const res = await patchObstacleTrainingRoute(req as any, ctx); expect(res.status).toBe(400); const body = await res.json(); expect(body.ok).toBe(false); expect(body.error).toBe('bad_request'); });

  it('returns 404 when OC cadet is not found', async () => { (ocChecks.mustBeAdmin as any).mockResolvedValueOnce({ userId: 'admin-1', roles: ['ADMIN'] }); (ocChecks.parseParam as any).mockResolvedValueOnce({ ocId }); (ocChecks.ensureOcExists as any).mockRejectedValueOnce(new ApiError(404, 'OC not found', 'not_found')); const req = makeJsonRequest({ method: 'PATCH', path: `${basePath}/${ocId}/obstacle-training/${id}`, body: { remark: 'Updated' } }); const ctx = { params: { ocId, id } } as any; const res = await patchObstacleTrainingRoute(req as any, ctx); expect(res.status).toBe(404); const body = await res.json(); expect(body.ok).toBe(false); expect(body.error).toBe('not_found'); });

  it('returns 404 when obstacle training record to update is not found', async () => { (ocChecks.mustBeAdmin as any).mockResolvedValueOnce({ userId: 'admin-1', roles: ['ADMIN'] }); (ocChecks.parseParam as any).mockResolvedValueOnce({ ocId }).mockResolvedValueOnce({ id }); (ocChecks.ensureOcExists as any).mockResolvedValueOnce(undefined); (ocQueries.updateObstacleTraining as any).mockResolvedValueOnce(null); const req = makeJsonRequest({ method: 'PATCH', path: `${basePath}/${ocId}/obstacle-training/${id}`, body: { remark: 'Updated' } }); const ctx = { params: { ocId, id } } as any; const res = await patchObstacleTrainingRoute(req as any, ctx); expect(res.status).toBe(404); const body = await res.json(); expect(body.ok).toBe(false); expect(body.error).toBe('not_found'); });

  it('returns 200 with updated obstacle training record on happy path', async () => { (ocChecks.mustBeAdmin as any).mockResolvedValueOnce({ userId: 'admin-1', roles: ['ADMIN'] }); (ocChecks.parseParam as any).mockResolvedValueOnce({ ocId }).mockResolvedValueOnce({ id }); (ocChecks.ensureOcExists as any).mockResolvedValueOnce(undefined); const updated = { id, ocId, semester: 4, obstacle: 'High wall', marksObtained: 19.0, remark: 'Updated' }; (ocQueries.updateObstacleTraining as any).mockResolvedValueOnce(updated); const req = makeJsonRequest({ method: 'PATCH', path: `${basePath}/${ocId}/obstacle-training/${id}`, body: { remark: 'Updated' } }); const ctx = { params: { ocId, id } } as any; const res = await patchObstacleTrainingRoute(req as any, ctx); expect(res.status).toBe(200); const body = await res.json(); expect(body.ok).toBe(true); expect(body.data.id).toBe(id); });
});

describe('DELETE /api/v1/oc/:ocId/obstacle-training/:id', () => {
  it('returns 403 when user lacks admin privileges', async () => { (ocChecks.mustBeAdmin as any).mockRejectedValueOnce(new ApiError(403, 'Forbidden', 'forbidden')); const req = makeJsonRequest({ method: 'DELETE', path: `${basePath}/${ocId}/obstacle-training/${id}` }); const ctx = { params: { ocId, id } } as any; const res = await deleteObstacleTrainingRoute(req as any, ctx); expect(res.status).toBe(403); const body = await res.json(); expect(body.ok).toBe(false); expect(body.error).toBe('forbidden'); });

  it('returns 400 for invalid UUID in path params', async () => { (ocChecks.mustBeAdmin as any).mockResolvedValueOnce({ userId: 'admin-1', roles: ['ADMIN'] }); (ocChecks.parseParam as any).mockRejectedValueOnce(new ApiError(400, 'Bad request', 'bad_request')); const req = makeJsonRequest({ method: 'DELETE', path: `${basePath}/not-a-uuid/obstacle-training/not-a-uuid` }); const ctx = { params: { ocId: 'not-a-uuid', id: 'not-a-uuid' } } as any; const res = await deleteObstacleTrainingRoute(req as any, ctx); expect(res.status).toBe(400); const body = await res.json(); expect(body.ok).toBe(false); expect(body.error).toBe('bad_request'); });

  it('returns 404 when OC cadet is not found', async () => { (ocChecks.mustBeAdmin as any).mockResolvedValueOnce({ userId: 'admin-1', roles: ['ADMIN'] }); (ocChecks.parseParam as any).mockResolvedValueOnce({ ocId }); (ocChecks.ensureOcExists as any).mockRejectedValueOnce(new ApiError(404, 'OC not found', 'not_found')); const req = makeJsonRequest({ method: 'DELETE', path: `${basePath}/${ocId}/obstacle-training/${id}` }); const ctx = { params: { ocId, id } } as any; const res = await deleteObstacleTrainingRoute(req as any, ctx); expect(res.status).toBe(404); const body = await res.json(); expect(body.ok).toBe(false); expect(body.error).toBe('not_found'); });

  it('returns 404 when obstacle training record to delete is not found', async () => { (ocChecks.mustBeAdmin as any).mockResolvedValueOnce({ userId: 'admin-1', roles: ['ADMIN'] }); (ocChecks.parseParam as any).mockResolvedValueOnce({ ocId }).mockResolvedValueOnce({ id }); (ocChecks.ensureOcExists as any).mockResolvedValueOnce(undefined); (ocQueries.deleteObstacleTraining as any).mockResolvedValueOnce(null); const req = makeJsonRequest({ method: 'DELETE', path: `${basePath}/${ocId}/obstacle-training/${id}` }); const ctx = { params: { ocId, id } } as any; const res = await deleteObstacleTrainingRoute(req as any, ctx); expect(res.status).toBe(404); const body = await res.json(); expect(body.ok).toBe(false); expect(body.error).toBe('not_found'); });

  it('returns 200 with soft-delete message on happy path', async () => { (ocChecks.mustBeAdmin as any).mockResolvedValueOnce({ userId: 'admin-1', roles: ['ADMIN'] }); (ocChecks.parseParam as any).mockResolvedValueOnce({ ocId }).mockResolvedValueOnce({ id }); (ocChecks.ensureOcExists as any).mockResolvedValueOnce(undefined); (ocQueries.deleteObstacleTraining as any).mockResolvedValueOnce({ id }); const req = makeJsonRequest({ method: 'DELETE', path: `${basePath}/${ocId}/obstacle-training/${id}` }); const ctx = { params: { ocId, id } } as any; const res = await deleteObstacleTrainingRoute(req as any, ctx); expect(res.status).toBe(200); const body = await res.json(); expect(body.ok).toBe(true); expect(body.id).toBe(id); expect(body.message).toMatch(/soft-deleted/); });

  it('returns 200 with hard-delete message on happy path', async () => { (ocChecks.mustBeAdmin as any).mockResolvedValueOnce({ userId: 'admin-1', roles: ['ADMIN'] }); (ocChecks.parseParam as any).mockResolvedValueOnce({ ocId }).mockResolvedValueOnce({ id }); (ocChecks.ensureOcExists as any).mockResolvedValueOnce(undefined); (ocQueries.deleteObstacleTraining as any).mockResolvedValueOnce({ id }); const req = makeJsonRequest({ method: 'DELETE', path: `${basePath}/${ocId}/obstacle-training/${id}?hard=true` }); const ctx = { params: { ocId, id } } as any; const res = await deleteObstacleTrainingRoute(req as any, ctx); expect(res.status).toBe(200); const body = await res.json(); expect(body.ok).toBe(true); expect(body.id).toBe(id); expect(body.message).toMatch(/hard-deleted/); });
});
