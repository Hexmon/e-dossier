import { z } from 'zod';
import { json, handleApiError, ApiError } from '@/app/lib/http';
import { requireAuth } from '@/app/lib/authz';
import { instructorUpdateSchema } from '@/app/lib/validators.courses';
import { db } from '@/app/db/client';
import { instructors } from '@/app/db/schema/training/instructors';
import { eq } from 'drizzle-orm';
import { hardDeleteInstructor, softDeleteInstructor } from '@/app/db/queries/instructors';
import type { InstructorRow } from '@/app/db/queries/instructors';
import { withAuditRoute, AuditEventType, AuditResourceType } from '@/lib/audit';
import type { AuditNextRequest } from '@/lib/audit';

const Id = z.object({ id: z.string().uuid() });

async function GETHandler(req: AuditNextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const authCtx = await requireAuth(req);
        const { id } = Id.parse(await params);
        const [row] = await db.select().from(instructors).where(eq(instructors.id, id)).limit(1);
        if (!row) throw new ApiError(404, 'Instructor not found', 'not_found');

        await req.audit.log({
            action: AuditEventType.API_REQUEST,
            outcome: 'SUCCESS',
            actor: { type: 'user', id: authCtx.userId },
            target: { type: AuditResourceType.INSTRUCTOR, id: row.id },
            metadata: {
                description: `Instructor ${row.id} retrieved successfully.`,
                instructorId: row.id,
            },
        });
        return json.ok({ message: 'Instructor retrieved successfully.', instructor: row });
    } catch (err) { return handleApiError(err); }
}

async function PATCHHandler(req: AuditNextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const adminCtx = await requireAuth(req);
        const { id } = Id.parse(await params);
        const body = instructorUpdateSchema.parse(await req.json());
        const [previous] = await db.select().from(instructors).where(eq(instructors.id, id)).limit(1);
        if (!previous) throw new ApiError(404, 'Instructor not found', 'not_found');
        const [row] = await db.update(instructors).set({ ...body }).where(eq(instructors.id, id)).returning();
        if (!row) throw new ApiError(404, 'Instructor not found', 'not_found');

        await req.audit.log({
            action: AuditEventType.INSTRUCTOR_UPDATED,
            outcome: 'SUCCESS',
            actor: { type: 'user', id: adminCtx.userId },
            target: { type: AuditResourceType.INSTRUCTOR, id: row.id },
            metadata: {
                description: `Updated instructor ${row.name ?? row.id}`,
                instructorId: row.id,
                changes: Object.keys(body),
            },
            diff: { before: previous, after: row },
        });
        return json.ok({ message: 'Instructor updated successfully.', instructor: row });
    } catch (err) { return handleApiError(err); }
}

type InstructorDeleteResult =
    | { before: InstructorRow; after: InstructorRow }
    | { before: InstructorRow };

async function DELETEHandler(req: AuditNextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const adminCtx = await requireAuth(req);
        const { id } = Id.parse(await params);
        const hard = (new URL(req.url).searchParams.get('hard') || '').toLowerCase() === 'true';
        const result = (hard ? await hardDeleteInstructor(id) : await softDeleteInstructor(id)) as InstructorDeleteResult | null;
        if (!result) throw new ApiError(404, 'Instructor not found', 'not_found');
        const before: InstructorRow = result.before;
        let after: InstructorRow | null = null;
        if ('after' in result) {
            after = result.after ?? null;
        }

        await req.audit.log({
            action: AuditEventType.INSTRUCTOR_DELETED,
            outcome: 'SUCCESS',
            actor: { type: 'user', id: adminCtx.userId },
            target: { type: AuditResourceType.INSTRUCTOR, id: after?.id ?? before.id },
            metadata: {
                description: `${hard ? 'Hard' : 'Soft'} deleted instructor ${id}`,
                instructorId: before.id,
                hardDeleted: hard,
                changedFields: hard ? [] : ['deletedAt'],
            },
            diff: { before, after: after ?? undefined },
        });
        return json.ok({
            message: hard ? 'Instructor hard-deleted.' : 'Instructor soft-deleted.',
            id: before.id,
        });
    } catch (err) { return handleApiError(err); }
}
export const GET = withAuditRoute('GET', GETHandler);

export const PATCH = withAuditRoute('PATCH', PATCHHandler);

export const DELETE = withAuditRoute('DELETE', DELETEHandler);
