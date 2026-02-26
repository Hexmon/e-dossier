import { db } from '@/app/db/client';
import { courses } from '@/app/db/schema/training/courses';
import { courseOfferings } from '@/app/db/schema/training/courseOfferings';
import { ocCadets } from '@/app/db/schema/training/oc';
import { json, handleApiError } from '@/app/lib/http';
import { requireAuth } from '@/app/lib/authz';
import { and, eq, isNull, sql } from 'drizzle-orm';
import { withAuditRoute } from '@/lib/audit';
import type { AuditNextRequest } from '@/lib/audit';

async function GETHandler(req: AuditNextRequest) {
    try {
        const authCtx = await requireAuth(req);
        const scopeType = String((authCtx.claims as any)?.apt?.scope?.type ?? '').toUpperCase();
        const scopeId = (authCtx.claims as any)?.apt?.scope?.id;
        const scopePlatoonId =
            scopeType === 'PLATOON' && typeof scopeId === 'string' && scopeId.trim().length > 0
                ? scopeId.trim()
                : null;

        const rows = await db
            .select({
                courseId: courses.id,
                courseCode: courses.code,
                strength: sql<number>`COALESCE(COUNT(DISTINCT ${ocCadets.id}), 0)::int`,
                currentSemester: sql<number | null>`MAX(${courseOfferings.semester})`,
            })
            .from(courses)
            .leftJoin(
                ocCadets,
                and(
                    eq(ocCadets.courseId, courses.id),
                    isNull(ocCadets.withdrawnOn),
                    ...(scopePlatoonId ? [eq(ocCadets.platoonId, scopePlatoonId)] : []),
                )
            )
            .leftJoin(
                courseOfferings,
                and(
                    eq(courseOfferings.courseId, courses.id),
                    isNull(courseOfferings.deletedAt)
                )
            )
            .where(
                and(
                    isNull(courses.deletedAt),
                    ...(scopePlatoonId ? [eq(ocCadets.platoonId, scopePlatoonId)] : []),
                )
            )
            .groupBy(courses.id, courses.code)
            .orderBy(courses.code);

        return json.ok({
            message: 'Dashboard course data retrieved successfully.',
            items: rows,
            count: rows.length,
        });
    } catch (err) {
        return handleApiError(err);
    }
}

export const GET = withAuditRoute('GET', GETHandler);
