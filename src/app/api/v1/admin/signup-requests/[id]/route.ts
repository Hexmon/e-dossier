import { NextRequest } from 'next/server';
import { json, handleApiError } from '@/app/lib/http';
import { requireAuth } from '@/app/lib/authz';
import { deleteSignupRequest } from '@/app/db/queries/signupRequests';
import { createAuditLog, AuditEventType, AuditResourceType } from '@/lib/audit-log';
import { withRouteLogging } from '@/lib/withRouteLogging';

async function DELETEHandler(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { userId: adminUserId } = await requireAuth(req);
    const { id } = await params;
    await deleteSignupRequest({
      requestId: id,
      adminUserId,
      auditRequestId: req.headers.get('x-request-id') ?? undefined,
    });

    await createAuditLog({
      actorUserId: adminUserId,
      eventType: AuditEventType.SIGNUP_REQUEST_DELETED,
      resourceType: AuditResourceType.SIGNUP_REQUEST,
      resourceId: id,
      description: `Signup request ${id} deleted`,
      metadata: { requestId: id },
      request: req,
      required: true,
    });
    return json.ok({ message: 'Signup request deleted successfully.' });
  } catch (err: any) {
    if (err?.message === 'request_not_found') return json.notFound('Request not found.');
    if (err?.message === 'cannot_delete_pending') return json.badRequest('Cannot delete a pending request.');
    return handleApiError(err);
  }
}
export const DELETE = withRouteLogging('DELETE', DELETEHandler);
