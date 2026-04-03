import { beforeEach, describe, expect, it, vi } from 'vitest';
import { POST } from '@/app/api/v1/oc/[ocId]/physical-training/route';
import { createRouteContext, makeJsonRequest } from '../utils/next';

const auditLogMock = vi.fn(async () => undefined);

vi.mock('@/lib/audit', () => ({
  withAuditRoute: (_method: string, handler: any) => {
    return (req: any, context: any) => {
      req.audit = { log: auditLogMock };
      return handler(req, context);
    };
  },
  AuditEventType: {
    OC_RECORD_CREATED: 'oc.record.created',
  },
  AuditResourceType: {
    OC: 'oc',
  },
}));

vi.mock('@/app/api/v1/oc/_checks', () => ({
  mustBeAuthed: vi.fn(),
  parseParam: vi.fn(),
  ensureOcExists: vi.fn(),
}));

vi.mock('@/app/services/marksReviewWorkflow', () => ({
  assertWorkflowDirectWriteAllowed: vi.fn(),
}));

vi.mock('@/app/db/queries/physicalTrainingOc', () => ({
  listTemplateScoresByIds: vi.fn(),
  listOcPtScores: vi.fn(),
  upsertOcPtScores: vi.fn(),
  deleteOcPtScoresByIds: vi.fn(),
  deleteOcPtScoresBySemester: vi.fn(),
}));

import * as ocChecks from '@/app/api/v1/oc/_checks';
import * as workflowServices from '@/app/services/marksReviewWorkflow';
import * as ptOcQueries from '@/app/db/queries/physicalTrainingOc';
import { ApiError } from '@/app/lib/http';

const ocId = '11111111-1111-4111-8111-111111111111';
const ptTaskScoreId = '22222222-2222-4222-8222-222222222222';

describe('POST /api/v1/oc/[ocId]/physical-training', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(ocChecks.mustBeAuthed).mockResolvedValue({ userId: 'user-1' } as any);
    vi.mocked(ocChecks.parseParam).mockResolvedValue({ ocId } as any);
    vi.mocked(ocChecks.ensureOcExists).mockResolvedValue(undefined);
    vi.mocked(workflowServices.assertWorkflowDirectWriteAllowed).mockResolvedValue(undefined as any);
    vi.mocked(ptOcQueries.upsertOcPtScores).mockResolvedValue([] as any);
    vi.mocked(ptOcQueries.listOcPtScores).mockResolvedValue([
      {
        id: '33333333-3333-4333-8333-333333333333',
        ptTaskScoreId,
        marksScored: 40,
      },
    ] as any);
  });

  it('allows free-entry attempt codes to save marks above template max marks', async () => {
    vi.mocked(ptOcQueries.listTemplateScoresByIds).mockResolvedValue([
      {
        ptTaskScoreId,
        attemptCode: 'A1/C1',
        maxMarks: 26,
        semester: 1,
        typeIsActive: true,
        attemptIsActive: true,
        gradeIsActive: true,
        typeDeletedAt: null,
        taskDeletedAt: null,
        attemptDeletedAt: null,
        gradeDeletedAt: null,
      },
    ] as any);

    const req = makeJsonRequest({
      method: 'POST',
      path: `/api/v1/oc/${ocId}/physical-training`,
      body: {
        semester: 1,
        scores: [{ ptTaskScoreId, marksScored: 40 }],
      },
    });

    const res = await POST(req as any, createRouteContext({ ocId }));
    const body = await res.json();

    expect(res.status).toBe(201);
    expect(body.ok).toBe(true);
    expect(ptOcQueries.upsertOcPtScores).toHaveBeenCalledWith(ocId, 1, [{ ptTaskScoreId, marksScored: 40 }]);
  });

  it('rejects non-free-entry attempt codes when marks exceed template max marks', async () => {
    vi.mocked(ptOcQueries.listTemplateScoresByIds).mockResolvedValue([
      {
        ptTaskScoreId,
        attemptCode: 'B1',
        maxMarks: 26,
        semester: 1,
        typeIsActive: true,
        attemptIsActive: true,
        gradeIsActive: true,
        typeDeletedAt: null,
        taskDeletedAt: null,
        attemptDeletedAt: null,
        gradeDeletedAt: null,
      },
    ] as any);

    const req = makeJsonRequest({
      method: 'POST',
      path: `/api/v1/oc/${ocId}/physical-training`,
      body: {
        semester: 1,
        scores: [{ ptTaskScoreId, marksScored: 40 }],
      },
    });

    const res = await POST(req as any, createRouteContext({ ocId }));
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.error).toBe('marks_exceed_max');
    expect(ptOcQueries.upsertOcPtScores).not.toHaveBeenCalled();
  });

  it('returns workflow_required when workflow is active', async () => {
    vi.mocked(workflowServices.assertWorkflowDirectWriteAllowed).mockRejectedValueOnce(
      new ApiError(409, 'Workflow required', 'workflow_required') as any,
    );

    const req = makeJsonRequest({
      method: 'POST',
      path: `/api/v1/oc/${ocId}/physical-training`,
      body: {
        semester: 1,
        scores: [{ ptTaskScoreId, marksScored: 10 }],
      },
    });

    const res = await POST(req as any, createRouteContext({ ocId }));
    const body = await res.json();

    expect(res.status).toBe(409);
    expect(body.error).toBe('workflow_required');
  });
});
