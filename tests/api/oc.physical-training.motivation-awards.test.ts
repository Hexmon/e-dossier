import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  GET,
  DELETE,
} from '@/app/api/v1/oc/[ocId]/physical-training/motivation-awards/route';
import { createRouteContext, makeJsonRequest } from '../utils/next';
import { ApiError } from '@/app/lib/http';

const auditLogMock = vi.fn(async () => undefined);

vi.mock('@/lib/audit', () => ({
  withAuditRoute: (_method: string, handler: any) => {
    return (req: any, context: any) => {
      req.audit = { log: auditLogMock };
      return handler(req, context);
    };
  },
  AuditEventType: {
    API_REQUEST: 'api.request',
    OC_RECORD_DELETED: 'oc.record.deleted',
  },
  AuditResourceType: {
    OC: 'oc',
  },
}));

vi.mock('@/app/api/v1/oc/_checks', () => ({
  mustBeAuthed: vi.fn(),
  parseParam: vi.fn(),
  ensureOcExists: vi.fn(),
  assertOcSemesterWriteAllowed: vi.fn(),
}));

vi.mock('@/app/services/marksReviewWorkflow', () => ({
  assertWorkflowDirectWriteAllowed: vi.fn(),
}));

vi.mock('@/app/db/queries/physicalTrainingOc', () => ({
  listMotivationFieldsByIds: vi.fn(),
  listOcPtMotivationValues: vi.fn(),
  upsertOcPtMotivationValues: vi.fn(),
  deleteOcPtMotivationValuesByIds: vi.fn(),
  deleteOcPtMotivationValuesBySemester: vi.fn(),
}));

import * as ocChecks from '@/app/api/v1/oc/_checks';
import * as workflowServices from '@/app/services/marksReviewWorkflow';
import * as ptOcQueries from '@/app/db/queries/physicalTrainingOc';

const ocId = '11111111-1111-4111-8111-111111111111';

describe('GET /api/v1/oc/[ocId]/physical-training/motivation-awards', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(ocChecks.mustBeAuthed).mockResolvedValue({ userId: 'user-1' } as any);
    vi.mocked(ocChecks.parseParam).mockResolvedValue({ ocId } as any);
    vi.mocked(ocChecks.ensureOcExists).mockResolvedValue(undefined);
    vi.mocked(ocChecks.assertOcSemesterWriteAllowed).mockResolvedValue(undefined as any);
    vi.mocked(ptOcQueries.listOcPtMotivationValues).mockResolvedValue([
      {
        id: '22222222-2222-4222-8222-222222222222',
        fieldId: '33333333-3333-4333-8333-333333333333',
        value: 'Good progress',
      },
    ] as any);
  });

  it('returns values even when the workflow is active', async () => {
    const req = makeJsonRequest({
      method: 'GET',
      path: `/api/v1/oc/${ocId}/physical-training/motivation-awards?semester=1`,
    });

    const res = await GET(req as any, createRouteContext({ ocId }));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.ok).toBe(true);
    expect(workflowServices.assertWorkflowDirectWriteAllowed).not.toHaveBeenCalled();
    expect(ptOcQueries.listOcPtMotivationValues).toHaveBeenCalledWith(ocId, 1);
  });
});

describe('DELETE /api/v1/oc/[ocId]/physical-training/motivation-awards', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(ocChecks.mustBeAuthed).mockResolvedValue({ userId: 'user-1' } as any);
    vi.mocked(ocChecks.parseParam).mockResolvedValue({ ocId } as any);
    vi.mocked(ocChecks.ensureOcExists).mockResolvedValue(undefined);
    vi.mocked(ocChecks.assertOcSemesterWriteAllowed).mockResolvedValue(undefined as any);
    vi.mocked(workflowServices.assertWorkflowDirectWriteAllowed).mockResolvedValue(undefined as any);
  });

  it('returns workflow_required when workflow is active', async () => {
    vi.mocked(workflowServices.assertWorkflowDirectWriteAllowed).mockRejectedValueOnce(
      new ApiError(409, 'Workflow required', 'workflow_required') as any,
    );

    const req = makeJsonRequest({
      method: 'DELETE',
      path: `/api/v1/oc/${ocId}/physical-training/motivation-awards`,
      body: { semester: 1 },
    });

    const res = await DELETE(req as any, createRouteContext({ ocId }));
    const body = await res.json();

    expect(res.status).toBe(409);
    expect(body.error).toBe('workflow_required');
  });
});
