// src/app/api/v1/admin/signup-requests/[id]/approve/route.ts
import { NextRequest } from 'next/server';
import { json, handleApiError } from '@/app/lib/http';
import { requireAdmin } from '@/app/lib/authz';
import { grantSignupRequestSchema } from '@/app/lib/validators';
import { approveSignupRequest } from '@/app/db/queries/signupRequests';
import { IdSchema } from '@/app/lib/apiClient';

/**
 * POST /api/v1/admin/signup-requests/:id/approve
 * Body: grantSignupRequestSchema (positionKey, scopeType, scopeId?, startsAt?, reason?, roleKeys?)
 */
export async function POST(
    req: NextRequest,
    ctx: { params: Promise<{ id: string }> }
) {
    try {
        const { userId: adminId } = await requireAdmin(req);

        const { id: raw } = await (ctx as any).params;
        const { id } = IdSchema.parse({ id: decodeURIComponent((raw ?? '')).trim() });

        // Validate body
        const body = await req.json();
        const dto = grantSignupRequestSchema.parse(body);

        // Delegate to query layer (handles overlap checks, insert, roles, audit)
        const result = await approveSignupRequest(id, dto, adminId);

        return json.ok({
            message: 'Signup request approved successfully.',
            appointment: result.appointment,
            granted_roles: result.appointment, // [{ id, key }]
        });
    } catch (err) {
        return handleApiError(err);
    }
}
