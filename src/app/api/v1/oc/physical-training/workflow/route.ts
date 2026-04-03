import { z } from 'zod';
import { ApiError, handleApiError, json } from '@/app/lib/http';
import { mustBeAuthed } from '../../_checks';
import { Semester } from '@/app/lib/oc-validators';
import { marksWorkflowTicketActionSchema } from '@/app/lib/marks-review-workflow';
import {
  applyPtWorkflowAction,
  getPtWorkflowState,
} from '@/app/services/marksReviewWorkflow';
import { withAuditRoute, AuditEventType, AuditResourceType } from '@/lib/audit';
import type { AuditNextRequest } from '@/lib/audit';

export const runtime = 'nodejs';

const ptWorkflowQuerySchema = z.object({
  courseId: z.string().uuid(),
  semester: Semester,
});

function parseQuery(req: Request) {
  const sp = new URL(req.url).searchParams;
  return ptWorkflowQuerySchema.parse({
    courseId: sp.get('courseId') ?? undefined,
    semester: sp.get('semester') ?? undefined,
  });
}

async function GETHandler(req: AuditNextRequest) {
  try {
    const authCtx = await mustBeAuthed(req);
    const query = parseQuery(req);
    const data = await getPtWorkflowState(
      {
        userId: authCtx.userId,
        roles: authCtx.roles ?? [],
      },
      query,
    );

    await req.audit.log({
      action: AuditEventType.API_REQUEST,
      outcome: 'SUCCESS',
      actor: { type: 'user', id: authCtx.userId },
      target: { type: AuditResourceType.API, id: 'pt-workflow' },
      metadata: {
        description: 'Retrieved PT workflow state.',
        ...query,
      },
    });

    return json.ok({
      message: 'PT workflow state retrieved successfully.',
      ...data,
    });
  } catch (err) {
    return handleApiError(err);
  }
}

async function POSTHandler(req: AuditNextRequest) {
  try {
    const authCtx = await mustBeAuthed(req);
    const query = parseQuery(req);
    let rawBody: unknown;
    try {
      rawBody = await req.json();
    } catch {
      throw new ApiError(400, 'Workflow action payload is required.', 'bad_request');
    }
    const action = marksWorkflowTicketActionSchema.parse(rawBody);
    const data = await applyPtWorkflowAction(
      {
        userId: authCtx.userId,
        roles: authCtx.roles ?? [],
      },
      query,
      action,
    );

    await req.audit.log({
      action: AuditEventType.API_REQUEST,
      outcome: 'SUCCESS',
      actor: { type: 'user', id: authCtx.userId },
      target: { type: AuditResourceType.API, id: 'pt-workflow' },
      metadata: {
        description: `Applied PT workflow action ${action.action}.`,
        ...query,
        workflowAction: action.action,
      },
    });

    return json.ok({
      message: 'PT workflow action applied successfully.',
      ...data,
    });
  } catch (err) {
    return handleApiError(err);
  }
}

export const GET = withAuditRoute('GET', GETHandler);
export const POST = withAuditRoute('POST', POSTHandler);
