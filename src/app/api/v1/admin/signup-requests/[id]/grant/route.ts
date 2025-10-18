import { NextRequest } from 'next/server';
import { json, handleApiError } from '@/app/lib/http';
import { requireAdmin } from '@/app/lib/authz';
import { grantSignupRequestSchema } from '@/app/lib/validators';
import { approveSignupRequest } from '@/app/db/queries/signupRequests';
import { positions } from '@/app/db/schema/auth/positions';
import { db } from '@/app/db/client';
import { eq } from 'drizzle-orm';

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
    try {
        const { userId: adminUserId } = requireAdmin(req);
        const body = await req.json();
        const parsed = grantSignupRequestSchema.safeParse(body);
        if (!parsed.success) return json.badRequest('Validation failed', { issues: parsed.error.flatten() });

        const { positionKey, scopeType, scopeId, startsAt, reason } = parsed.data;

        const [pos] = await db.select().from(positions).where(eq(positions.key, positionKey)).limit(1);
        if (!pos) return json.badRequest('Unknown positionKey');

        // If PLATOON → scopeId must be present
        if (scopeType === 'PLATOON' && !scopeId) return json.badRequest('scopeId required for PLATOON');

        const res = await approveSignupRequest({
            requestId: params.id,
            adminUserId,
            positionId: pos.id,
            scopeType,
            scopeId: scopeId ?? null,
            startsAt: startsAt ? new Date(startsAt) : undefined,
            reason: reason ?? null,
        });

        return json.ok({ message: 'Approved and appointed', ...res });
    } catch (err: any) {
        if (err?.message === 'slot_occupied') {
            return json.conflict('This position/scope already has an active holder.');
        }
        if (err?.message === 'request_not_found') return json.notFound('Request not found');
        if (err?.message === 'request_not_pending') return json.badRequest('Request is not pending');
        return handleApiError(err);
    }
}
