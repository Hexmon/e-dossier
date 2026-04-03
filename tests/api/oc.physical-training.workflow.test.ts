import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from '@/app/lib/http';
import { GET, POST } from '@/app/api/v1/oc/physical-training/workflow/route';
import { makeJsonRequest } from '../utils/next';

vi.mock('@/app/api/v1/oc/_checks', () => ({
  mustBeAuthed: vi.fn(),
}));

vi.mock('@/app/services/marksReviewWorkflow', () => ({
  getPtWorkflowState: vi.fn(),
  applyPtWorkflowAction: vi.fn(),
}));

import { mustBeAuthed } from '@/app/api/v1/oc/_checks';
import {
  getPtWorkflowState,
  applyPtWorkflowAction,
} from '@/app/services/marksReviewWorkflow';

function attachAudit(req: any) {
  req.audit = { log: vi.fn(async () => undefined) };
  return req;
}

describe('PT workflow API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (mustBeAuthed as any).mockResolvedValue({ userId: 'user-1', roles: ['ADMIN'] });
    (getPtWorkflowState as any).mockResolvedValue({
      settings: { isActive: true },
      ticket: { status: 'DRAFT' },
      currentRevision: 1,
      allowedActions: ['SAVE_DRAFT'],
      liveSnapshot: { items: [], template: { types: [] } },
      draftPayload: { items: [], template: { types: [] } },
      activityLog: [],
      selectionLabel: 'Course / Semester / PT',
      courseLabel: 'COURSE',
    });
    (applyPtWorkflowAction as any).mockResolvedValue({
      settings: { isActive: true },
      ticket: { status: 'VERIFIED' },
      currentRevision: 2,
      allowedActions: [],
      liveSnapshot: { items: [], template: { types: [] } },
      draftPayload: { items: [], template: { types: [] } },
      activityLog: [],
      selectionLabel: 'Course / Semester / PT',
      courseLabel: 'COURSE',
    });
  });

  it('GET returns PT workflow state', async () => {
    const req = attachAudit(
      makeJsonRequest({
        method: 'GET',
        path: '/api/v1/oc/physical-training/workflow?courseId=11111111-1111-4111-8111-111111111111&semester=1',
      }),
    );

    const res = await GET(req as any, { params: Promise.resolve({}) } as any);
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.ticket.status).toBe('DRAFT');
  });

  it('POST applies PT workflow action', async () => {
    const req = attachAudit(
      makeJsonRequest({
        method: 'POST',
        path: '/api/v1/oc/physical-training/workflow?courseId=11111111-1111-4111-8111-111111111111&semester=1',
        body: {
          action: 'VERIFY_AND_PUBLISH',
          revision: 1,
        },
      }),
    );

    const res = await POST(req as any, { params: Promise.resolve({}) } as any);
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.ticket.status).toBe('VERIFIED');
  });

  it('returns 400 for malformed action payload', async () => {
    const req = attachAudit(
      makeJsonRequest({
        method: 'POST',
        path: '/api/v1/oc/physical-training/workflow?courseId=11111111-1111-4111-8111-111111111111&semester=1',
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

  it('returns 400 for invalid query params', async () => {
    const req = attachAudit(
      makeJsonRequest({
        method: 'GET',
        path: '/api/v1/oc/physical-training/workflow?semester=1',
      }),
    );

    const res = await GET(req as any, { params: Promise.resolve({}) } as any);
    const body = await res.json();
    expect(res.status).toBe(400);
    expect(body.error).toBe('bad_request');
  });
});
