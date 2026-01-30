// src/app/api/v1/admin/signup-requests/[id]/approve/route.ts
import { NextRequest } from 'next/server';
import { json, handleApiError } from '@/app/lib/http';
import { requireAuth } from '@/app/lib/authz';
import { grantSignupRequestSchema } from '@/app/lib/validators';
import { approveSignupRequest } from '@/app/db/queries/signupRequests';
import { IdSchema } from '@/app/lib/apiClient';
import { createAuditLog, AuditEventType, AuditResourceType } from '@/lib/audit-log';
import { withRouteLogging } from '@/lib/withRouteLogging';

/**
 * POST /api/v1/admin/signup-requests/:id/approve
 * Body: grantSignupRequestSchema (positionKey, scopeType, scopeId?, startsAt?, reason?, roleKeys?)
 */
async function POSTHandler(
    req: NextRequest,
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

        await createAuditLog({
            actorUserId: adminId,
            eventType: AuditEventType.SIGNUP_REQUEST_APPROVED,
            resourceType: AuditResourceType.SIGNUP_REQUEST,
            resourceId: id,
            description: `Signup request ${id} approved`,
            metadata: {
                requestId: id,
                appointmentId: result.appointment.id,
                userId: result.appointment.userId,
                positionId: result.appointment.positionId,
                scopeType: result.appointment.scopeType,
                scopeId: result.appointment.scopeId ?? null,
                startsAt: result.appointment.startsAt,
            },
            request: req,
            required: true,
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
export const POST = withRouteLogging('POST', POSTHandler);
