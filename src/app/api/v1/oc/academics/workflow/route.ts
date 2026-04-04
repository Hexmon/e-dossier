import { z } from 'zod';
import { ApiError, handleApiError, json } from '@/app/lib/http';
import { mustBeAuthed } from '../../_checks';
import { Semester } from '@/app/lib/oc-validators';
import {
  applyAcademicsWorkflowAction,
  getAcademicsWorkflowState,
} from '@/app/services/marksReviewWorkflow';
import { marksWorkflowTicketActionSchema } from '@/app/lib/marks-review-workflow';
import { withAuditRoute, AuditEventType, AuditResourceType } from '@/lib/audit';
import type { AuditNextRequest } from '@/lib/audit';

export const runtime = 'nodejs';

const academicsWorkflowQuerySchema = z.object({
  courseId: z.string().uuid(),
  semester: Semester,
  subjectId: z.string().uuid(),
});

function parseQuery(req: Request) {
  const sp = new URL(req.url).searchParams;
  return academicsWorkflowQuerySchema.parse({
    courseId: sp.get('courseId') ?? undefined,
    semester: sp.get('semester') ?? undefined,
    subjectId: sp.get('subjectId') ?? undefined,
  });
}

async function GETHandler(req: AuditNextRequest) {
  try {
    const authCtx = await mustBeAuthed(req);
    const query = parseQuery(req);
    const data = await getAcademicsWorkflowState(
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
      target: { type: AuditResourceType.API, id: 'academics-workflow' },
      metadata: {
        description: 'Retrieved academics workflow state.',
        ...query,
      },
    });

    return json.ok({
      message: 'Academics workflow state retrieved successfully.',
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
    const data = await applyAcademicsWorkflowAction(
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
      target: { type: AuditResourceType.API, id: 'academics-workflow' },
      metadata: {
        description: `Applied academics workflow action ${action.action}.`,
        ...query,
        workflowAction: action.action,
      },
    });

    return json.ok({
      message: 'Academics workflow action applied successfully.',
      ...data,
    });
  } catch (err) {
    return handleApiError(err);
  }
}

export const GET = withAuditRoute('GET', GETHandler);
export const POST = withAuditRoute('POST', POSTHandler);
