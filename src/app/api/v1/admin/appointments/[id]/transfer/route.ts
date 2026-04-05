// src/app/api/v1/admin/appointments/[id]/transfer/route.ts
import { json, handleApiError, ApiError } from '@/app/lib/http';
import { requireAuth } from '@/app/lib/authz';
import { appointmentTransferBody } from '@/app/lib/validators';
import { transferAppointment } from '@/app/db/queries/appointment-transfer';
import { IdSchema } from '@/app/lib/apiClient';
import { withAuditRoute, AuditEventType, AuditResourceType } from '@/lib/audit';
import type { AuditNextRequest } from '@/lib/audit';
import { withAuthz } from '@/app/lib/acx/withAuthz';
import { requireAdmin } from '@/app/lib/authz';
import { assertCanManageAppointmentRecord, assertCanManageUser } from '@/app/lib/admin-boundaries';

export const runtime = 'nodejs';

async function POSTHandler(
    req: AuditNextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const adminCtx = await requireAdmin(req);
        const adminId = adminCtx.userId;

        const { id: raw } = await params;
        const { id } = IdSchema.parse({ id: decodeURIComponent((raw ?? '')).trim() });
        await assertCanManageAppointmentRecord(adminCtx, id);

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
        await assertCanManageUser(adminCtx, dto.newUserId);

        const result = await transferAppointment({
            appointmentId: id,
            adminId,
            newUserId: dto.newUserId,
            prevEndsAt: new Date(dto.prevEndsAt),
            newStartsAt: new Date(dto.newStartsAt),
            reason: dto.reason ?? null,
        });

        await req.audit.log({
            action: AuditEventType.APPOINTMENT_TRANSFERRED,
            outcome: 'SUCCESS',
            actor: { type: 'user', id: adminId },
            target: { type: AuditResourceType.APPOINTMENT, id: id },
            metadata: {
                description: `Appointment ${id} transferred from ${result.ended.userId} to ${result.next.userId}`,
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
            diff: { before: result.ended, after: result.next },
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
export const POST = withAuditRoute('POST', withAuthz(POSTHandler));
