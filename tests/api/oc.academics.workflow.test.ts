import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from '@/app/lib/http';
import { GET, POST } from '@/app/api/v1/oc/academics/workflow/route';
import { makeJsonRequest } from '../utils/next';

vi.mock('@/app/api/v1/oc/_checks', () => ({
  mustBeAuthed: vi.fn(),
}));

vi.mock('@/app/services/marksReviewWorkflow', () => ({
  getAcademicsWorkflowState: vi.fn(),
  applyAcademicsWorkflowAction: vi.fn(),
}));

import { mustBeAuthed } from '@/app/api/v1/oc/_checks';
import {
  getAcademicsWorkflowState,
  applyAcademicsWorkflowAction,
} from '@/app/services/marksReviewWorkflow';

function attachAudit(req: any) {
  req.audit = { log: vi.fn(async () => undefined) };
  return req;
}

describe('academics workflow API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (mustBeAuthed as any).mockResolvedValue({ userId: 'user-1', roles: ['ADMIN'] });
    (getAcademicsWorkflowState as any).mockResolvedValue({
      settings: { isActive: true },
      ticket: { status: 'DRAFT' },
      currentRevision: 1,
      allowedActions: ['SAVE_DRAFT'],
      liveSnapshot: { items: [] },
      draftPayload: { items: [] },
      activityLog: [],
      selectionLabel: 'Course / Semester / Subject',
      courseLabel: 'COURSE',
    });
    (applyAcademicsWorkflowAction as any).mockResolvedValue({
      settings: { isActive: true },
      ticket: { status: 'PENDING_VERIFICATION' },
      currentRevision: 2,
      allowedActions: ['REQUEST_CHANGES', 'VERIFY_AND_PUBLISH'],
      liveSnapshot: { items: [] },
      draftPayload: { items: [] },
      activityLog: [],
      selectionLabel: 'Course / Semester / Subject',
      courseLabel: 'COURSE',
    });
  });

  it('GET returns workflow state', async () => {
    const req = attachAudit(
      makeJsonRequest({
        method: 'GET',
        path: '/api/v1/oc/academics/workflow?courseId=11111111-1111-4111-8111-111111111111&semester=1&subjectId=22222222-2222-4222-8222-222222222222',
      }),
    );

    const res = await GET(req as any, { params: Promise.resolve({}) } as any);
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.ticket.status).toBe('DRAFT');
  });

  it('POST applies workflow action', async () => {
    const req = attachAudit(
      makeJsonRequest({
        method: 'POST',
        path: '/api/v1/oc/academics/workflow?courseId=11111111-1111-4111-8111-111111111111&semester=1&subjectId=22222222-2222-4222-8222-222222222222',
        body: {
          action: 'SUBMIT_FOR_VERIFICATION',
          revision: 1,
        },
      }),
    );

    const res = await POST(req as any, { params: Promise.resolve({}) } as any);
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.ticket.status).toBe('PENDING_VERIFICATION');
  });

  it('returns 400 for malformed action payload', async () => {
    const req = attachAudit(
      makeJsonRequest({
        method: 'POST',
        path: '/api/v1/oc/academics/workflow?courseId=11111111-1111-4111-8111-111111111111&semester=1&subjectId=22222222-2222-4222-8222-222222222222',
      }),
    );
    req.json = vi.fn(async () => {
      throw new SyntaxError('Unexpected end of JSON input');
    });

    const res = await POST(req as any, { params: Promise.resolve({}) } as any);
    const body = await res.json();
    expect(res.status).toBe(400);
    expect(body.error).toBe('bad_request');
    expect(body.message).toBe('Workflow action payload is required.');
  });

  it('returns 401 when auth fails', async () => {
    (mustBeAuthed as any).mockRejectedValueOnce(new ApiError(401, 'Unauthorized', 'unauthorized'));
    const req = attachAudit(
      makeJsonRequest({
        method: 'GET',
        path: '/api/v1/oc/academics/workflow?courseId=11111111-1111-4111-8111-111111111111&semester=1&subjectId=22222222-2222-4222-8222-222222222222',
      }),
    );

    const res = await GET(req as any, { params: Promise.resolve({}) } as any);
    const body = await res.json();
    expect(res.status).toBe(401);
    expect(body.error).toBe('unauthorized');
  });
});
