import { NextRequest } from 'next/server';
import { z } from 'zod';
import { db } from '@/app/db/client';
import { json, handleApiError, ApiError } from '@/app/lib/http';
import { requireAuth, hasAdminRole } from '@/app/lib/authz';
import { ocCadets } from '@/app/db/schema/training/oc';
import { eq } from 'drizzle-orm';

const OcParam = z.object({ ocId: z.string().uuid() });
const updateSchema = z.object({
    name: z.string().min(2).optional(),
    courseNo: z.string().min(2).optional(),
    branch: z.enum(['E', 'M']).nullable().optional(),
    platoonId: z.string().uuid().nullable().optional(),
    arrivedAt: z.coerce.date().optional(),
    withdrawnAt: z.coerce.date().nullable().optional(),
});

async function requireAdminForWrite(req: NextRequest) {
    const { roles } = await requireAuth(req);
    if (!hasAdminRole(roles)) throw new ApiError(403, 'Admin privileges required', 'forbidden');
}

export async function GET(_: NextRequest, { params }: { params: Promise<{ ocId: string }> }) {
    try {
        await requireAuth(_);
        const { ocId } = await OcParam.parseAsync(await params);
        const [row] = await db.select().from(ocCadets).where(eq(ocCadets.id, ocId)).limit(1);
        if (!row) throw new ApiError(404, 'OC not found', 'not_found');
        return json.ok({ message: 'OC retrieved successfully.', oc: row });
    } catch (err) { return handleApiError(err); }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ ocId: string }> }) {
    try {
        await requireAdminForWrite(req);
        const { ocId } = await OcParam.parseAsync(await params);
        const dto = updateSchema.parse(await req.json());
        const [row] = await db.update(ocCadets).set(dto).where(eq(ocCadets.id, ocId)).returning();
        if (!row) throw new ApiError(404, 'OC not found', 'not_found');
        return json.ok({ message: 'OC updated successfully.', oc: row });
    } catch (err) { return handleApiError(err); }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ ocId: string }> }) {
    try {
        await requireAdminForWrite(req);
        const { ocId } = await OcParam.parseAsync(await params);
        const [row] = await db.delete(ocCadets).where(eq(ocCadets.id, ocId)).returning({ id: ocCadets.id });
        if (!row) throw new ApiError(404, 'OC not found', 'not_found');
        return json.ok({ message: 'OC deleted successfully.', id: row.id });
    } catch (err) { return handleApiError(err); }
}
