// src/app/api/v1/admin/appointments/[id]/transfer/route.ts
import { NextRequest } from 'next/server';
import { json, handleApiError, ApiError } from '@/app/lib/http';
import { requireAuth } from '@/app/lib/authz';
import { appointmentTransferBody } from '@/app/lib/validators';
import { transferAppointment } from '@/app/db/queries/appointment-transfer';
import { IdSchema } from '@/app/lib/apiClient';
import { createAuditLog, AuditEventType, AuditResourceType } from '@/lib/audit-log';
import { withRouteLogging } from '@/lib/withRouteLogging';

async function POSTHandler(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { userId: adminId } = await requireAuth(req);

        const { id: raw } = await params;
        const { id } = IdSchema.parse({ id: decodeURIComponent((raw ?? '')).trim() });

        // Parse body safely
        let body: unknown;
        try {
            body = await req.json();
        } catch {
            throw new ApiError(400, 'Invalid JSON body', 'bad_request', {
                hint: 'Ensure the request body is valid JSON (quote UUIDs/strings, use null not "null").',
            });
        }

        const parsed = appointmentTransferBody.safeParse(body);
        if (!parsed.success) {
            throw new ApiError(400, 'Validation failed', 'bad_request', parsed.error.flatten());
        }
        const dto = parsed.data;

        const result = await transferAppointment({
            appointmentId: id,
            adminId,
            newUserId: dto.newUserId,
            prevEndsAt: new Date(dto.prevEndsAt),
            newStartsAt: new Date(dto.newStartsAt),
            reason: dto.reason ?? null,
        });

        await createAuditLog({
            actorUserId: adminId,
            eventType: AuditEventType.APPOINTMENT_TRANSFERRED,
            resourceType: AuditResourceType.APPOINTMENT,
            resourceId: id,
            description: `Appointment ${id} transferred from ${result.ended.userId} to ${result.next.userId}`,
            metadata: {
                appointmentId: id,
                fromAppointmentId: result.ended.id,
                toAppointmentId: result.next.id,
                fromUserId: result.ended.userId,
                toUserId: result.next.userId,
                positionId: result.next.positionId,
                scopeType: result.next.scopeType,
                scopeId: result.next.scopeId ?? null,
                reason: dto.reason ?? null,
                transferAuditId: result.audit.id,
                transferAuditCreatedAt: result.audit.createdAt,
                adjustedPrevEndsAt: result.adjustedPrevEndsAt ?? null,
            },
            before: result.ended,
            after: result.next,
            changedFields: ['userId', 'startsAt', 'endsAt'],
            request: req,
            required: true,
        });

        return json.ok({
            message: 'Appointment transferred successfully.',
            ended_appointment: result.ended,
            new_appointment: result.next,
            transfer_audit: result.audit,
            ...(result.adjustedPrevEndsAt ? { adjustedPrevEndsAt: result.adjustedPrevEndsAt } : {}),
        });
    } catch (err) {
        return handleApiError(err);
    }
}
export const POST = withRouteLogging('POST', POSTHandler);
