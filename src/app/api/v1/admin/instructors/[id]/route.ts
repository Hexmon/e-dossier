import { NextRequest } from 'next/server';
import { z } from 'zod';
import { json, handleApiError, ApiError } from '@/app/lib/http';
import { requireAuth, requireAdmin } from '@/app/lib/authz';
import { instructorUpdateSchema } from '@/app/lib/validators.courses';
import { db } from '@/app/db/client';
import { instructors } from '@/app/db/schema/training/instructors';
import { eq } from 'drizzle-orm';
import { hardDeleteInstructor, softDeleteInstructor } from '@/app/db/queries/instructors';
import type { InstructorRow } from '@/app/db/queries/instructors';
import { createAuditLog, AuditEventType, AuditResourceType } from '@/lib/audit-log';
import { withRouteLogging } from '@/lib/withRouteLogging';

const Id = z.object({ id: z.string().uuid() });

async function GETHandler(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        await requireAuth(req);
        const { id } = Id.parse(await params);
        const [row] = await db.select().from(instructors).where(eq(instructors.id, id)).limit(1);
        if (!row) throw new ApiError(404, 'Instructor not found', 'not_found');
        return json.ok({ message: 'Instructor retrieved successfully.', instructor: row });
    } catch (err) { return handleApiError(err); }
}

async function PATCHHandler(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const adminCtx = await requireAdmin(req);
        const { id } = Id.parse(await params);
        const body = instructorUpdateSchema.parse(await req.json());
        const [previous] = await db.select().from(instructors).where(eq(instructors.id, id)).limit(1);
        if (!previous) throw new ApiError(404, 'Instructor not found', 'not_found');
        const [row] = await db.update(instructors).set({ ...body }).where(eq(instructors.id, id)).returning();
        if (!row) throw new ApiError(404, 'Instructor not found', 'not_found');

        await createAuditLog({
            actorUserId: adminCtx.userId,
            eventType: AuditEventType.INSTRUCTOR_UPDATED,
            resourceType: AuditResourceType.INSTRUCTOR,
            resourceId: row.id,
            description: `Updated instructor ${row.name ?? row.id}`,
            metadata: {
                instructorId: row.id,
                changes: Object.keys(body),
            },
            before: previous,
            after: row,
            changedFields: Object.keys(body),
            request: req,
            required: true,
        });
        return json.ok({ message: 'Instructor updated successfully.', instructor: row });
    } catch (err) { return handleApiError(err); }
}

type InstructorDeleteResult =
    | { before: InstructorRow; after: InstructorRow }
    | { before: InstructorRow };

async function DELETEHandler(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const adminCtx = await requireAdmin(req);
        const { id } = Id.parse(await params);
        const hard = (new URL(req.url).searchParams.get('hard') || '').toLowerCase() === 'true';
        const result = (hard ? await hardDeleteInstructor(id) : await softDeleteInstructor(id)) as InstructorDeleteResult | null;
        if (!result) throw new ApiError(404, 'Instructor not found', 'not_found');
        const before: InstructorRow = result.before;
        let after: InstructorRow | null = null;
        if ('after' in result) {
            after = result.after ?? null;
        }

        await createAuditLog({
            actorUserId: adminCtx.userId,
            eventType: AuditEventType.INSTRUCTOR_DELETED,
            resourceType: AuditResourceType.INSTRUCTOR,
            resourceId: after?.id ?? before.id,
            description: `${hard ? 'Hard' : 'Soft'} deleted instructor ${id}`,
            metadata: {
                instructorId: before.id,
                hardDeleted: hard,
            },
            before,
            after,
            changedFields: hard ? undefined : ['deletedAt'],
            request: req,
            required: true,
        });
        return json.ok({
            message: hard ? 'Instructor hard-deleted.' : 'Instructor soft-deleted.',
            id: before.id,
        });
    } catch (err) { return handleApiError(err); }
}
export const GET = withRouteLogging('GET', GETHandler);

export const PATCH = withRouteLogging('PATCH', PATCHHandler);

export const DELETE = withRouteLogging('DELETE', DELETEHandler);
