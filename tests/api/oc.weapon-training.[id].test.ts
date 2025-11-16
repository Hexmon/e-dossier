import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET as getWeaponTrainingRoute, PATCH as patchWeaponTrainingRoute, DELETE as deleteWeaponTrainingRoute } from '@/app/api/v1/oc/[ocId]/weapon-training/[id]/route';
import { makeJsonRequest } from '../utils/next';
import { ApiError } from '@/app/lib/http';
import * as authz from '@/app/lib/authz';
import * as ocChecks from '@/app/api/v1/oc/_checks';
import * as ocQueries from '@/app/db/queries/oc';

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
  getWeaponTraining: vi.fn(async () => null),
  updateWeaponTraining: vi.fn(async () => null),
  deleteWeaponTraining: vi.fn(async () => null),
}));

const basePath = '/api/v1/oc';
const ocId = '11111111-1111-4111-8111-111111111111';
const id = '22222222-2222-4222-8222-222222222222';

beforeEach(() => { vi.clearAllMocks(); });

describe('GET /api/v1/oc/:ocId/weapon-training/:id', () => {
  it('returns 401 when authentication fails', async () => { (ocChecks.mustBeAuthed as any).mockRejectedValueOnce(new ApiError(401, 'Unauthorized', 'unauthorized')); const req = makeJsonRequest({ method: 'GET', path: `${basePath}/${ocId}/weapon-training/${id}` }); const ctx = { params: { ocId, id } } as any; const res = await getWeaponTrainingRoute(req as any, ctx); expect(res.status).toBe(401); const body = await res.json(); expect(body.ok).toBe(false); expect(body.error).toBe('unauthorized'); });

  it('returns 400 for invalid UUID in path params', async () => { (ocChecks.mustBeAuthed as any).mockResolvedValueOnce({ userId: 'u1', roles: [] }); (ocChecks.parseParam as any).mockRejectedValueOnce(new ApiError(400, 'Bad request', 'bad_request')); const req = makeJsonRequest({ method: 'GET', path: `${basePath}/not-a-uuid/weapon-training/not-a-uuid` }); const ctx = { params: { ocId: 'not-a-uuid', id: 'not-a-uuid' } } as any; const res = await getWeaponTrainingRoute(req as any, ctx); expect(res.status).toBe(400); const body = await res.json(); expect(body.ok).toBe(false); expect(body.error).toBe('bad_request'); });

  it('returns 404 when OC cadet is not found', async () => { (ocChecks.mustBeAuthed as any).mockResolvedValueOnce({ userId: 'u1', roles: [] }); (ocChecks.parseParam as any).mockResolvedValueOnce({ ocId }); (ocChecks.ensureOcExists as any).mockRejectedValueOnce(new ApiError(404, 'OC not found', 'not_found')); const req = makeJsonRequest({ method: 'GET', path: `${basePath}/${ocId}/weapon-training/${id}` }); const ctx = { params: { ocId, id } } as any; const res = await getWeaponTrainingRoute(req as any, ctx); expect(res.status).toBe(404); const body = await res.json(); expect(body.ok).toBe(false); expect(body.error).toBe('not_found'); });

  it('returns 404 when weapon training record is not found', async () => { (ocChecks.mustBeAuthed as any).mockResolvedValueOnce({ userId: 'u1', roles: [] }); (ocChecks.parseParam as any).mockResolvedValueOnce({ ocId }).mockResolvedValueOnce({ id }); (ocChecks.ensureOcExists as any).mockResolvedValueOnce(undefined); (ocQueries.getWeaponTraining as any).mockResolvedValueOnce(null); const req = makeJsonRequest({ method: 'GET', path: `${basePath}/${ocId}/weapon-training/${id}` }); const ctx = { params: { ocId, id } } as any; const res = await getWeaponTrainingRoute(req as any, ctx); expect(res.status).toBe(404); const body = await res.json(); expect(body.ok).toBe(false); expect(body.error).toBe('not_found'); });

  it('returns 200 with weapon training record on happy path', async () => { (ocChecks.mustBeAuthed as any).mockResolvedValueOnce({ userId: 'u1', roles: [] }); (ocChecks.parseParam as any).mockResolvedValueOnce({ ocId }).mockResolvedValueOnce({ id }); (ocChecks.ensureOcExists as any).mockResolvedValueOnce(undefined); const row = { id, ocId, subjectId: '33333333-3333-4333-8333-333333333333', semester: 3, maxMarks: 75.0, marksObtained: 70.5 }; (ocQueries.getWeaponTraining as any).mockResolvedValueOnce(row); const req = makeJsonRequest({ method: 'GET', path: `${basePath}/${ocId}/weapon-training/${id}` }); const ctx = { params: { ocId, id } } as any; const res = await getWeaponTrainingRoute(req as any, ctx); expect(res.status).toBe(200); const body = await res.json(); expect(body.ok).toBe(true); expect(body.data.id).toBe(id); });
});

describe('PATCH /api/v1/oc/:ocId/weapon-training/:id', () => {
  it('returns 403 when user lacks admin privileges', async () => { (ocChecks.mustBeAdmin as any).mockRejectedValueOnce(new ApiError(403, 'Forbidden', 'forbidden')); const req = makeJsonRequest({ method: 'PATCH', path: `${basePath}/${ocId}/weapon-training/${id}`, body: { maxMarks: 80 } }); const ctx = { params: { ocId, id } } as any; const res = await patchWeaponTrainingRoute(req as any, ctx); expect(res.status).toBe(403); const body = await res.json(); expect(body.ok).toBe(false); expect(body.error).toBe('forbidden'); });

  it('returns 400 for invalid UUID in path params', async () => { (ocChecks.mustBeAdmin as any).mockResolvedValueOnce({ userId: 'admin-1', roles: ['ADMIN'] }); (ocChecks.parseParam as any).mockRejectedValueOnce(new ApiError(400, 'Bad request', 'bad_request')); const req = makeJsonRequest({ method: 'PATCH', path: `${basePath}/not-a-uuid/weapon-training/not-a-uuid`, body: { maxMarks: 80 } }); const ctx = { params: { ocId: 'not-a-uuid', id: 'not-a-uuid' } } as any; const res = await patchWeaponTrainingRoute(req as any, ctx); expect(res.status).toBe(400); const body = await res.json(); expect(body.ok).toBe(false); expect(body.error).toBe('bad_request'); });

  it('returns 400 when request body fails validation', async () => { (ocChecks.mustBeAdmin as any).mockResolvedValueOnce({ userId: 'admin-1', roles: ['ADMIN'] }); (ocChecks.parseParam as any).mockResolvedValueOnce({ ocId }).mockResolvedValueOnce({ id }); (ocChecks.ensureOcExists as any).mockResolvedValueOnce(undefined); const req = makeJsonRequest({ method: 'PATCH', path: `${basePath}/${ocId}/weapon-training/${id}`, body: {} }); const ctx = { params: { ocId, id } } as any; const res = await patchWeaponTrainingRoute(req as any, ctx); expect(res.status).toBe(400); const body = await res.json(); expect(body.ok).toBe(false); expect(body.error).toBe('bad_request'); });

  it('returns 404 when OC cadet is not found', async () => { (ocChecks.mustBeAdmin as any).mockResolvedValueOnce({ userId: 'admin-1', roles: ['ADMIN'] }); (ocChecks.parseParam as any).mockResolvedValueOnce({ ocId }); (ocChecks.ensureOcExists as any).mockRejectedValueOnce(new ApiError(404, 'OC not found', 'not_found')); const req = makeJsonRequest({ method: 'PATCH', path: `${basePath}/${ocId}/weapon-training/${id}`, body: { maxMarks: 80 } }); const ctx = { params: { ocId, id } } as any; const res = await patchWeaponTrainingRoute(req as any, ctx); expect(res.status).toBe(404); const body = await res.json(); expect(body.ok).toBe(false); expect(body.error).toBe('not_found'); });

  it('returns 404 when weapon training record to update is not found', async () => { (ocChecks.mustBeAdmin as any).mockResolvedValueOnce({ userId: 'admin-1', roles: ['ADMIN'] }); (ocChecks.parseParam as any).mockResolvedValueOnce({ ocId }).mockResolvedValueOnce({ id }); (ocChecks.ensureOcExists as any).mockResolvedValueOnce(undefined); (ocQueries.updateWeaponTraining as any).mockResolvedValueOnce(null); const req = makeJsonRequest({ method: 'PATCH', path: `${basePath}/${ocId}/weapon-training/${id}`, body: { maxMarks: 80 } }); const ctx = { params: { ocId, id } } as any; const res = await patchWeaponTrainingRoute(req as any, ctx); expect(res.status).toBe(404); const body = await res.json(); expect(body.ok).toBe(false); expect(body.error).toBe('not_found'); });

  it('returns 200 with updated weapon training record on happy path', async () => { (ocChecks.mustBeAdmin as any).mockResolvedValueOnce({ userId: 'admin-1', roles: ['ADMIN'] }); (ocChecks.parseParam as any).mockResolvedValueOnce({ ocId }).mockResolvedValueOnce({ id }); (ocChecks.ensureOcExists as any).mockResolvedValueOnce(undefined); const updated = { id, ocId, subjectId: '33333333-3333-4333-8333-333333333333', semester: 3, maxMarks: 80.0, marksObtained: 78.5 }; (ocQueries.updateWeaponTraining as any).mockResolvedValueOnce(updated); const req = makeJsonRequest({ method: 'PATCH', path: `${basePath}/${ocId}/weapon-training/${id}`, body: { maxMarks: 80 } }); const ctx = { params: { ocId, id } } as any; const res = await patchWeaponTrainingRoute(req as any, ctx); expect(res.status).toBe(200); const body = await res.json(); expect(body.ok).toBe(true); expect(body.data.id).toBe(id); });
});

describe('DELETE /api/v1/oc/:ocId/weapon-training/:id', () => {
  it('returns 403 when user lacks admin privileges', async () => { (ocChecks.mustBeAdmin as any).mockRejectedValueOnce(new ApiError(403, 'Forbidden', 'forbidden')); const req = makeJsonRequest({ method: 'DELETE', path: `${basePath}/${ocId}/weapon-training/${id}` }); const ctx = { params: { ocId, id } } as any; const res = await deleteWeaponTrainingRoute(req as any, ctx); expect(res.status).toBe(403); const body = await res.json(); expect(body.ok).toBe(false); expect(body.error).toBe('forbidden'); });

  it('returns 400 for invalid UUID in path params', async () => { (ocChecks.mustBeAdmin as any).mockResolvedValueOnce({ userId: 'admin-1', roles: ['ADMIN'] }); (ocChecks.parseParam as any).mockRejectedValueOnce(new ApiError(400, 'Bad request', 'bad_request')); const req = makeJsonRequest({ method: 'DELETE', path: `${basePath}/not-a-uuid/weapon-training/not-a-uuid` }); const ctx = { params: { ocId: 'not-a-uuid', id: 'not-a-uuid' } } as any; const res = await deleteWeaponTrainingRoute(req as any, ctx); expect(res.status).toBe(400); const body = await res.json(); expect(body.ok).toBe(false); expect(body.error).toBe('bad_request'); });

  it('returns 404 when OC cadet is not found', async () => { (ocChecks.mustBeAdmin as any).mockResolvedValueOnce({ userId: 'admin-1', roles: ['ADMIN'] }); (ocChecks.parseParam as any).mockResolvedValueOnce({ ocId }); (ocChecks.ensureOcExists as any).mockRejectedValueOnce(new ApiError(404, 'OC not found', 'not_found')); const req = makeJsonRequest({ method: 'DELETE', path: `${basePath}/${ocId}/weapon-training/${id}` }); const ctx = { params: { ocId, id } } as any; const res = await deleteWeaponTrainingRoute(req as any, ctx); expect(res.status).toBe(404); const body = await res.json(); expect(body.ok).toBe(false); expect(body.error).toBe('not_found'); });

  it('returns 404 when weapon training record to delete is not found', async () => { (ocChecks.mustBeAdmin as any).mockResolvedValueOnce({ userId: 'admin-1', roles: ['ADMIN'] }); (ocChecks.parseParam as any).mockResolvedValueOnce({ ocId }).mockResolvedValueOnce({ id }); (ocChecks.ensureOcExists as any).mockResolvedValueOnce(undefined); (ocQueries.deleteWeaponTraining as any).mockResolvedValueOnce(null); const req = makeJsonRequest({ method: 'DELETE', path: `${basePath}/${ocId}/weapon-training/${id}` }); const ctx = { params: { ocId, id } } as any; const res = await deleteWeaponTrainingRoute(req as any, ctx); expect(res.status).toBe(404); const body = await res.json(); expect(body.ok).toBe(false); expect(body.error).toBe('not_found'); });

  it('returns 200 with soft-delete message on happy path', async () => { (ocChecks.mustBeAdmin as any).mockResolvedValueOnce({ userId: 'admin-1', roles: ['ADMIN'] }); (ocChecks.parseParam as any).mockResolvedValueOnce({ ocId }).mockResolvedValueOnce({ id }); (ocChecks.ensureOcExists as any).mockResolvedValueOnce(undefined); (ocQueries.deleteWeaponTraining as any).mockResolvedValueOnce({ id }); const req = makeJsonRequest({ method: 'DELETE', path: `${basePath}/${ocId}/weapon-training/${id}` }); const ctx = { params: { ocId, id } } as any; const res = await deleteWeaponTrainingRoute(req as any, ctx); expect(res.status).toBe(200); const body = await res.json(); expect(body.ok).toBe(true); expect(body.id).toBe(id); expect(body.message).toMatch(/soft-deleted/); });

  it('returns 200 with hard-delete message on happy path', async () => { (ocChecks.mustBeAdmin as any).mockResolvedValueOnce({ userId: 'admin-1', roles: ['ADMIN'] }); (ocChecks.parseParam as any).mockResolvedValueOnce({ ocId }).mockResolvedValueOnce({ id }); (ocChecks.ensureOcExists as any).mockResolvedValueOnce(undefined); (ocQueries.deleteWeaponTraining as any).mockResolvedValueOnce({ id }); const req = makeJsonRequest({ method: 'DELETE', path: `${basePath}/${ocId}/weapon-training/${id}?hard=true` }); const ctx = { params: { ocId, id } } as any; const res = await deleteWeaponTrainingRoute(req as any, ctx); expect(res.status).toBe(200); const body = await res.json(); expect(body.ok).toBe(true); expect(body.id).toBe(id); expect(body.message).toMatch(/hard-deleted/); });
});

