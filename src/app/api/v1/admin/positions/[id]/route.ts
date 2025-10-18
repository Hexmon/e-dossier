import { NextRequest } from 'next/server';
import { db } from '@/app/db/client';
import { positions } from '@/app/db/schema/auth/positions';
import { json, handleApiError, ApiError } from '@/app/lib/http';
import { requireAdmin } from '@/app/lib/authz';
import { positionUpdateSchema } from '@/app/lib/validators';
import { eq } from 'drizzle-orm';

export async function GET(_: NextRequest, ctx: { params: { id: string } }) {
    try {
        const { id } = ctx.params;
        const [row] = await db.select().from(positions).where(eq(positions.id, id));
        if (!row) throw new ApiError(404, 'Position not found');
        return json.ok({ data: row });
    } catch (err) {
        return handleApiError(err);
    }
}

export async function PATCH(req: NextRequest, ctx: { params: { id: string } }) {
    try {
        requireAdmin(req);
        const { id } = ctx.params;
        const body = await req.json();
        const parsed = positionUpdateSchema.safeParse(body);
        if (!parsed.success) throw new ApiError(400, 'Validation failed', 'bad_request', parsed.error.flatten());

        const [row] = await db
            .update(positions)
            .set({
                ...(parsed.data.displayName !== undefined ? { displayName: parsed.data.displayName } : {}),
                ...(parsed.data.defaultScope !== undefined ? { defaultScope: parsed.data.defaultScope } : {}),
                ...(parsed.data.singleton !== undefined ? { singleton: parsed.data.singleton } : {}),
                ...(parsed.data.description !== undefined ? { description: parsed.data.description } : {}),
            })
            .where(eq(positions.id, id))
            .returning();

        if (!row) throw new ApiError(404, 'Position not found');
        return json.ok({ data: row });
    } catch (err) {
        return handleApiError(err);
    }
}

export async function DELETE(req: NextRequest, ctx: { params: { id: string } }) {
    try {
        requireAdmin(req);
        const { id } = ctx.params;
        // optional: block delete if any appointments exist for this position
        // const apptCount = await db.$count(appointments, eq(appointments.positionId, id));
        const [row] = await db.delete(positions).where(eq(positions.id, id)).returning();
        if (!row) throw new ApiError(404, 'Position not found');
        return json.ok({ message: 'Deleted', data: row });
    } catch (err) {
        return handleApiError(err);
    }
}
