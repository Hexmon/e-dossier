import { NextRequest } from 'next/server';
import { json, handleApiError } from '@/app/lib/http';
import { requireAdmin } from '@/app/lib/authz';
import { rejectSignupRequestSchema } from '@/app/lib/validators';
import { rejectSignupRequest } from '@/app/db/queries/signupRequests';

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
    try {
        const { userId: adminUserId } = requireAdmin(req);
        const body = await req.json();
        const parsed = rejectSignupRequestSchema.safeParse(body);
        if (!parsed.success) return json.badRequest('Validation failed', { issues: parsed.error.flatten() });

        await rejectSignupRequest({ requestId: params.id, adminUserId, reason: parsed.data.reason });
        return json.ok({ message: 'Rejected' });
    } catch (err: any) {
        if (err?.message === 'request_not_found') return json.notFound('Request not found');
        if (err?.message === 'request_not_pending') return json.badRequest('Request is not pending');
        return handleApiError(err);
    }
}
