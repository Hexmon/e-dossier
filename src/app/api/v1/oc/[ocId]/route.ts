import { z } from 'zod';
import { db } from '@/app/db/client';
import { json, handleApiError, ApiError } from '@/app/lib/http';
import { requireAuth, hasAdminRole } from '@/app/lib/authz';
import { ocCadets } from '@/app/db/schema/training/oc';
import { courses } from '@/app/db/schema/training/courses';
import { platoons } from '@/app/db/schema/auth/platoons';
import { eq } from 'drizzle-orm';
import { withAuditRoute, AuditEventType, AuditResourceType } from '@/lib/audit';
import type { AuditNextRequest } from '@/lib/audit';

const OcParam = z.object({ ocId: z.string().uuid() });
const updateSchema = z.object({
    name: z.string().min(2).optional(),
    courseNo: z.string().min(2).optional(),
    branch: z.enum(['E', 'M']).nullable().optional(),
    platoonId: z.string().uuid().nullable().optional(),
    arrivedAt: z.coerce.date().optional(),
    withdrawnAt: z.coerce.date().nullable().optional(),
});

async function requireAdminForWrite(req: AuditNextRequest) {
    const ctx = await requireAuth(req);
    if (!hasAdminRole(ctx.roles)) throw new ApiError(403, 'Admin privileges required', 'forbidden');
    return ctx;
}

async function GETHandler(req: AuditNextRequest, { params }: { params: Promise<{ ocId: string }> }) {
    try {
        const authCtx = await requireAuth(req);
        const { ocId } = await OcParam.parseAsync(await params);
        const [row] = await db
            .select({
                id: ocCadets.id,
                ocNo: ocCadets.ocNo,
                uid: ocCadets.uid,
                name: ocCadets.name,
                branch: ocCadets.branch,
                arrivalAtUniversity: ocCadets.arrivalAtUniversity,
                status: ocCadets.status,
                managerUserId: ocCadets.managerUserId,
                relegatedToCourseId: ocCadets.relegatedToCourseId,
                relegatedOn: ocCadets.relegatedOn,
                withdrawnOn: ocCadets.withdrawnOn,
                createdAt: ocCadets.createdAt,
                updatedAt: ocCadets.updatedAt,
                courseId: courses.id,
                courseCode: courses.code,
                courseTitle: courses.title,
                courseNotes: courses.notes,
                courseCreatedAt: courses.createdAt,
                courseUpdatedAt: courses.updatedAt,
                courseDeletedAt: courses.deletedAt,
                platoonId: platoons.id,
                platoonKey: platoons.key,
                platoonName: platoons.name,
                platoonAbout: platoons.about,
                platoonCreatedAt: platoons.createdAt,
                platoonUpdatedAt: platoons.updatedAt,
                platoonDeletedAt: platoons.deletedAt,
            })
            .from(ocCadets)
            .leftJoin(courses, eq(courses.id, ocCadets.courseId))
            .leftJoin(platoons, eq(platoons.id, ocCadets.platoonId))
            .where(eq(ocCadets.id, ocId))
            .limit(1);
        if (!row) throw new ApiError(404, 'OC not found', 'not_found');
        const course = row.courseId ? {
            id: row.courseId,
            code: row.courseCode,
            title: row.courseTitle,
            notes: row.courseNotes,
            createdAt: row.courseCreatedAt,
            updatedAt: row.courseUpdatedAt,
            deletedAt: row.courseDeletedAt,
        } : null;

        const platoon = row.platoonId ? {
            id: row.platoonId,
            key: row.platoonKey,
            name: row.platoonName,
            about: row.platoonAbout,
            createdAt: row.platoonCreatedAt,
            updatedAt: row.platoonUpdatedAt,
            deletedAt: row.platoonDeletedAt,
        } : null;

        const oc = {
            id: row.id,
            ocNo: row.ocNo,
            uid: row.uid,
            name: row.name,
            course,
            branch: row.branch,
            platoon,
            arrivalAtUniversity: row.arrivalAtUniversity,
            status: row.status,
            managerUserId: row.managerUserId,
            relegatedToCourseId: row.relegatedToCourseId,
            relegatedOn: row.relegatedOn,
            withdrawnOn: row.withdrawnOn,
            createdAt: row.createdAt,
            updatedAt: row.updatedAt,
        };

        await req.audit.log({
            action: AuditEventType.API_REQUEST,
            outcome: 'SUCCESS',
            actor: { type: 'user', id: authCtx.userId },
            target: { type: AuditResourceType.OC, id: ocId },
            metadata: {
                description: `OC ${ocId} retrieved successfully.`,
                ocId,
            },
        });

        return json.ok({ message: 'OC retrieved successfully.', oc });
    } catch (err) { return handleApiError(err); }
}

async function PATCHHandler(req: AuditNextRequest, { params }: { params: Promise<{ ocId: string }> }) {
    try {
        const adminCtx = await requireAdminForWrite(req);
        const { ocId } = await OcParam.parseAsync(await params);
        const dto = updateSchema.parse(await req.json());
        const [existing] = await db.select().from(ocCadets).where(eq(ocCadets.id, ocId)).limit(1);
        if (!existing) throw new ApiError(404, 'OC not found', 'not_found');
        const [row] = await db.update(ocCadets).set(dto).where(eq(ocCadets.id, ocId)).returning();

        await req.audit.log({
            action: AuditEventType.OC_UPDATED,
            outcome: 'SUCCESS',
            actor: { type: 'user', id: adminCtx.userId },
            target: { type: AuditResourceType.OC, id: ocId },
            metadata: {
                description: `Updated OC ${ocId}`,
                ocId,
                changes: Object.keys(dto),
            },
        });
        return json.ok({ message: 'OC updated successfully.', oc: row });
    } catch (err) { return handleApiError(err); }
}

async function DELETEHandler(req: AuditNextRequest, { params }: { params: Promise<{ ocId: string }> }) {
    try {
        const adminCtx = await requireAdminForWrite(req);
        const { ocId } = await OcParam.parseAsync(await params);
        const [row] = await db.delete(ocCadets).where(eq(ocCadets.id, ocId)).returning();
        if (!row) throw new ApiError(404, 'OC not found', 'not_found');

        await req.audit.log({
            action: AuditEventType.OC_DELETED,
            outcome: 'SUCCESS',
            actor: { type: 'user', id: adminCtx.userId },
            target: { type: AuditResourceType.OC, id: ocId },
            metadata: {
                description: `Deleted OC ${ocId}`,
                ocId,
                hardDeleted: true,
            },
        });
        return json.ok({ message: 'OC deleted successfully.', id: row.id });
    } catch (err) { return handleApiError(err); }
}
export const GET = withAuditRoute('GET', GETHandler);

export const PATCH = withAuditRoute('PATCH', PATCHHandler);

export const DELETE = withAuditRoute('DELETE', DELETEHandler);
