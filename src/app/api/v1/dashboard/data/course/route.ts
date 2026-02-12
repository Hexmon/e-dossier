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
        await requireAuth(req);

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
                    isNull(ocCadets.withdrawnOn)
                )
            )
            .leftJoin(
                courseOfferings,
                and(
                    eq(courseOfferings.courseId, courses.id),
                    isNull(courseOfferings.deletedAt)
                )
            )
            .where(isNull(courses.deletedAt))
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
