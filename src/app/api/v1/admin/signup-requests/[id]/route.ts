import { json, handleApiError } from '@/app/lib/http';

export const runtime = 'nodejs';
import { withAuthz } from '@/app/lib/acx/withAuthz';
import { requireAuth } from '@/app/lib/authz';
import { deleteSignupRequest } from '@/app/db/queries/signupRequests';
import { withAuditRoute, AuditEventType, AuditResourceType } from '@/lib/audit';
import type { AuditNextRequest } from '@/lib/audit';

async function DELETEHandler(req: AuditNextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { userId: adminUserId } = await requireAuth(req);
    const { id } = await params;
    await deleteSignupRequest({
      requestId: id,
      adminUserId,
      auditRequestId: req.headers.get('x-request-id') ?? undefined,
    });

    await req.audit.log({
      action: AuditEventType.SIGNUP_REQUEST_DELETED,
      outcome: 'SUCCESS',
      actor: { type: 'user', id: adminUserId },
      target: { type: AuditResourceType.SIGNUP_REQUEST, id },
      metadata: {
        description: `Signup request ${id} deleted`,
        requestId: id,
      },
    });
    return json.ok({ message: 'Signup request deleted successfully.' });
  } catch (err: any) {
    if (err?.message === 'request_not_found') return json.notFound('Request not found.');
    if (err?.message === 'cannot_delete_pending') return json.badRequest('Cannot delete a pending request.');
    return handleApiError(err);
  }
}
export const DELETE = withAuditRoute('DELETE', withAuthz(DELETEHandler));
