// src/app/api/v1/admin/appointments/[id]/transfer/route.ts
import { NextRequest } from 'next/server';
import { json, handleApiError, ApiError } from '@/app/lib/http';
import { requireAdmin } from '@/app/lib/authz';
import { appointmentTransferBody } from '@/app/lib/validators';
import { transferAppointment } from '@/app/db/queries/appointment-transfer';
import { IdSchema } from '@/app/lib/apiClient';

export async function POST(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { userId: adminId } = await requireAdmin(req);

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
