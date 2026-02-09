// src/app/api/v1/admin/signup-requests/[id]/approve/route.ts
import { json, handleApiError } from '@/app/lib/http';
import { requireAuth } from '@/app/lib/authz';
import { grantSignupRequestSchema } from '@/app/lib/validators';
import { approveSignupRequest } from '@/app/db/queries/signupRequests';
import { IdSchema } from '@/app/lib/apiClient';
import { withAuditRoute, AuditEventType, AuditResourceType } from '@/lib/audit';
import type { AuditNextRequest } from '@/lib/audit';

/**
 * POST /api/v1/admin/signup-requests/:id/approve
 * Body: grantSignupRequestSchema (positionKey, scopeType, scopeId?, startsAt?, reason?, roleKeys?)
 */
async function POSTHandler(
    req: AuditNextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { userId: adminId } = await requireAuth(req);

        const { id: raw } = await params;
        const { id } = IdSchema.parse({ id: decodeURIComponent((raw ?? '')).trim() });

        // Validate body
        const body = await req.json();
        const dto = grantSignupRequestSchema.parse(body);

        // Delegate to query layer (handles overlap checks, insert, roles, audit)
        const result = await approveSignupRequest(id, dto, adminId, {
            requestId: req.headers.get('x-request-id') ?? undefined,
        });

        await req.audit.log({
      action: AuditEventType.SIGNUP_REQUEST_APPROVED,
      outcome: 'SUCCESS',
      actor: { type: 'user', id: adminId },
      target: { type: AuditResourceType.SIGNUP_REQUEST, id: id },
      metadata: {
        description: `Signup request ${id} approved`,
                requestId: id,
                appointmentId: result.appointment.id,
                userId: result.appointment.userId,
                positionId: result.appointment.positionId,
                scopeType: result.appointment.scopeType,
                scopeId: result.appointment.scopeId ?? null,
                startsAt: result.appointment.startsAt,
      },
    });

        return json.ok({
            message: 'Signup request approved successfully.',
            appointment: result.appointment,
            granted_roles: result.appointment, // [{ id, key }]
        });
    } catch (err) {
        return handleApiError(err);
    }
}
export const POST = withAuditRoute('POST', POSTHandler);
