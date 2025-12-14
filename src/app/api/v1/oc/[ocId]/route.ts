import { NextRequest } from 'next/server';
import { z } from 'zod';
import { db } from '@/app/db/client';
import { json, handleApiError, ApiError } from '@/app/lib/http';
import { requireAuth, hasAdminRole } from '@/app/lib/authz';
import { ocCadets } from '@/app/db/schema/training/oc';
import { eq } from 'drizzle-orm';
import { createAuditLog, AuditEventType, AuditResourceType } from '@/lib/audit-log';
import { withRouteLogging } from '@/lib/withRouteLogging';

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
    const ctx = await requireAuth(req);
    if (!hasAdminRole(ctx.roles)) throw new ApiError(403, 'Admin privileges required', 'forbidden');
    return ctx;
}

async function GETHandler(_: NextRequest, { params }: { params: Promise<{ ocId: string }> }) {
    try {
        await requireAuth(_);
        const { ocId } = await OcParam.parseAsync(await params);
        const [row] = await db.select().from(ocCadets).where(eq(ocCadets.id, ocId)).limit(1);
        if (!row) throw new ApiError(404, 'OC not found', 'not_found');
        return json.ok({ message: 'OC retrieved successfully.', oc: row });
    } catch (err) { return handleApiError(err); }
}

async function PATCHHandler(req: NextRequest, { params }: { params: Promise<{ ocId: string }> }) {
    try {
        const adminCtx = await requireAdminForWrite(req);
        const { ocId } = await OcParam.parseAsync(await params);
        const dto = updateSchema.parse(await req.json());
        const [previous] = await db.select().from(ocCadets).where(eq(ocCadets.id, ocId)).limit(1);
        if (!previous) throw new ApiError(404, 'OC not found', 'not_found');
        const [row] = await db.update(ocCadets).set(dto).where(eq(ocCadets.id, ocId)).returning();

        await createAuditLog({
            actorUserId: adminCtx.userId,
            eventType: AuditEventType.OC_UPDATED,
            resourceType: AuditResourceType.OC,
            resourceId: ocId,
            description: `Updated OC ${ocId}`,
            metadata: {
                ocId,
                changes: Object.keys(dto),
            },
            before: previous,
            after: row,
            changedFields: Object.keys(dto),
            request: req,
            required: true,
        });
        return json.ok({ message: 'OC updated successfully.', oc: row });
    } catch (err) { return handleApiError(err); }
}

async function DELETEHandler(req: NextRequest, { params }: { params: Promise<{ ocId: string }> }) {
    try {
        const adminCtx = await requireAdminForWrite(req);
        const { ocId } = await OcParam.parseAsync(await params);
        const [row] = await db.delete(ocCadets).where(eq(ocCadets.id, ocId)).returning();
        if (!row) throw new ApiError(404, 'OC not found', 'not_found');

        await createAuditLog({
            actorUserId: adminCtx.userId,
            eventType: AuditEventType.OC_DELETED,
            resourceType: AuditResourceType.OC,
            resourceId: ocId,
            description: `Deleted OC ${ocId}`,
            metadata: {
                ocId,
                hardDeleted: true,
            },
            before: row,
            after: null,
            request: req,
            required: true,
        });
        return json.ok({ message: 'OC deleted successfully.', id: row.id });
    } catch (err) { return handleApiError(err); }
}
export const GET = withRouteLogging('GET', GETHandler);

export const PATCH = withRouteLogging('PATCH', PATCHHandler);

export const DELETE = withRouteLogging('DELETE', DELETEHandler);
