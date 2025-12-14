import { NextRequest } from 'next/server';
import { z } from 'zod';
import { json, handleApiError, ApiError } from '@/app/lib/http';
import { requireAuth, requireAdmin } from '@/app/lib/authz';
import { subjectUpdateSchema } from '@/app/lib/validators.courses';
import { db } from '@/app/db/client';
import { subjects } from '@/app/db/schema/training/subjects';
import { hardDeleteSubject, softDeleteSubject } from '@/app/db/queries/subjects';
import { eq } from 'drizzle-orm';
import { createAuditLog, AuditEventType, AuditResourceType } from '@/lib/audit-log';
import { withRouteLogging } from '@/lib/withRouteLogging';

const Id = z.object({ id: z.string().uuid() });

async function GETHandler(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        await requireAuth(req);
        const { id } = Id.parse(await params);
        const [row] = await db.select().from(subjects).where(eq(subjects.id, id)).limit(1);
        if (!row) throw new ApiError(404, 'Subject not found', 'not_found');
        return json.ok({ message: 'Subject retrieved successfully.', subject: row });
    } catch (err) { return handleApiError(err); }
}

async function PATCHHandler(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const adminCtx = await requireAdmin(req);
        const { id } = Id.parse(await params);
        const body = subjectUpdateSchema.parse(await req.json());

        const patch: any = {};
        for (const k of ['code', 'name', 'branch', 'hasTheory', 'hasPractical', 'defaultTheoryCredits', 'defaultPracticalCredits', 'description'] as const) {
            if (k in body) (patch as any)[k] = (body as any)[k];
        }

        const [previous] = await db.select().from(subjects).where(eq(subjects.id, id)).limit(1);
        if (!previous) throw new ApiError(404, 'Subject not found', 'not_found');

        const [row] = await db.update(subjects).set(patch).where(eq(subjects.id, id)).returning();
        if (!row) throw new ApiError(404, 'Subject not found', 'not_found');

        await createAuditLog({
            actorUserId: adminCtx.userId,
            eventType: AuditEventType.SUBJECT_UPDATED,
            resourceType: AuditResourceType.SUBJECT,
            resourceId: row.id,
            description: `Updated subject ${row.code}`,
            metadata: {
                subjectId: row.id,
                changes: Object.keys(patch),
            },
            before: previous,
            after: row,
            changedFields: Object.keys(patch),
            request: req,
            required: true,
        });
        return json.ok({ message: 'Subject updated successfully.', subject: row });
    } catch (err: any) {
        if (err?.code === '23505') return json.conflict('Subject code already exists.');
        return handleApiError(err);
    }
}

async function DELETEHandler(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const adminCtx = await requireAdmin(req);
        const { id } = Id.parse(await params);
        const hard = (new URL(req.url).searchParams.get('hard') || '').toLowerCase() === 'true';

        if (hard) {
            const result = await hardDeleteSubject(id);
            if (!result) throw new ApiError(404, 'Subject not found', 'not_found');
            await createAuditLog({
                actorUserId: adminCtx.userId,
                eventType: AuditEventType.SUBJECT_DELETED,
                resourceType: AuditResourceType.SUBJECT,
                resourceId: result.before.id,
                description: `Hard deleted subject ${id}`,
                metadata: {
                    subjectId: result.before.id,
                    hardDeleted: true,
                },
                before: result.before,
                after: null,
                request: req,
                required: true,
            });
            return json.ok({ message: 'Subject hard-deleted.', id: result.before.id });
        }

        const result = await softDeleteSubject(id);
        if (!result) throw new ApiError(404, 'Subject not found', 'not_found');
        await createAuditLog({
            actorUserId: adminCtx.userId,
            eventType: AuditEventType.SUBJECT_DELETED,
            resourceType: AuditResourceType.SUBJECT,
            resourceId: result.after.id,
            description: `Soft deleted subject ${id}`,
            metadata: {
                subjectId: result.after.id,
                hardDeleted: false,
            },
            before: result.before,
            after: result.after,
            changedFields: ['deletedAt'],
            request: req,
            required: true,
        });
        return json.ok({ message: 'Subject soft-deleted.', id: result.after.id });
    } catch (err) { return handleApiError(err); }
}
export const GET = withRouteLogging('GET', GETHandler);

export const PATCH = withRouteLogging('PATCH', PATCHHandler);

export const DELETE = withRouteLogging('DELETE', DELETEHandler);
