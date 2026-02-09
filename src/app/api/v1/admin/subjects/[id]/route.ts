import { z } from 'zod';
import { json, handleApiError, ApiError } from '@/app/lib/http';
import { requireAuth } from '@/app/lib/authz';
import { subjectUpdateSchema } from '@/app/lib/validators.courses';
import { db } from '@/app/db/client';
import { subjects } from '@/app/db/schema/training/subjects';
import { hardDeleteSubject, softDeleteSubject } from '@/app/db/queries/subjects';
import { eq } from 'drizzle-orm';
import { withAuditRoute, AuditEventType, AuditResourceType } from '@/lib/audit';
import type { AuditNextRequest } from '@/lib/audit';

const Id = z.object({ id: z.string().uuid() });

async function GETHandler(req: AuditNextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const authCtx = await requireAuth(req);
        const { id } = Id.parse(await params);
        const [row] = await db.select().from(subjects).where(eq(subjects.id, id)).limit(1);
        if (!row) throw new ApiError(404, 'Subject not found', 'not_found');

        await req.audit.log({
            action: AuditEventType.API_REQUEST,
            outcome: 'SUCCESS',
            actor: { type: 'user', id: authCtx.userId },
            target: { type: AuditResourceType.SUBJECT, id: row.id },
            metadata: {
                description: `Subject retrieved successfully: ${row.code}`,
                subjectId: row.id,
            },
        });

        return json.ok({ message: 'Subject retrieved successfully.', subject: row });
    } catch (err) { return handleApiError(err); }
}

async function PATCHHandler(req: AuditNextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const adminCtx = await requireAuth(req);
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

        await req.audit.log({
            action: AuditEventType.SUBJECT_UPDATED,
            outcome: 'SUCCESS',
            actor: { type: 'user', id: adminCtx.userId },
            target: { type: AuditResourceType.SUBJECT, id: row.id },
            metadata: {
                description: `Updated subject ${row.code}`,
                subjectId: row.id,
                changes: Object.keys(patch),
            },
        });
        return json.ok({ message: 'Subject updated successfully.', subject: row });
    } catch (err: any) {
        if (err?.code === '23505') return json.conflict('Subject code already exists.');
        return handleApiError(err);
    }
}

async function DELETEHandler(req: AuditNextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const adminCtx = await requireAuth(req);
        const { id } = Id.parse(await params);
        const hard = (new URL(req.url).searchParams.get('hard') || '').toLowerCase() === 'true';

        if (hard) {
            const result = await hardDeleteSubject(id);
            if (!result) throw new ApiError(404, 'Subject not found', 'not_found');
            await req.audit.log({
                action: AuditEventType.SUBJECT_DELETED,
                outcome: 'SUCCESS',
                actor: { type: 'user', id: adminCtx.userId },
                target: { type: AuditResourceType.SUBJECT, id: result.before.id },
                metadata: {
                    description: `Hard deleted subject ${id}`,
                    subjectId: result.before.id,
                    hardDeleted: true,
                },
            });
            return json.ok({ message: 'Subject hard-deleted.', id: result.before.id });
        }

        const result = await softDeleteSubject(id);
        if (!result) throw new ApiError(404, 'Subject not found', 'not_found');
        await req.audit.log({
            action: AuditEventType.SUBJECT_DELETED,
            outcome: 'SUCCESS',
            actor: { type: 'user', id: adminCtx.userId },
            target: { type: AuditResourceType.SUBJECT, id: result.after.id },
            metadata: {
                description: `Soft deleted subject ${id}`,
                subjectId: result.after.id,
                hardDeleted: false,
            },
        });
        return json.ok({ message: 'Subject soft-deleted.', id: result.after.id });
    } catch (err) { return handleApiError(err); }
}
export const GET = withAuditRoute('GET', GETHandler);

export const PATCH = withAuditRoute('PATCH', PATCHHandler);

export const DELETE = withAuditRoute('DELETE', DELETEHandler);
