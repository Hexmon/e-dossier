import { db } from '@/app/db/client';
import { courses } from '@/app/db/schema/training/courses';
import { ocCadets, ocCourseEnrollments } from '@/app/db/schema/training/oc';
import { json, handleApiError } from '@/app/lib/http';
import { requireAuth } from '@/app/lib/authz';
import { and, eq, isNull, sql } from 'drizzle-orm';
import { withAuditRoute } from '@/lib/audit';
import type { AuditNextRequest } from '@/lib/audit';

const DEFAULT_PAGE = 1;
const DASHBOARD_COURSES_PAGE_SIZE = 5;

function parsePositiveInteger(value: string | null, fallback: number) {
    if (!value) return fallback;

    const parsed = Number(value);
    return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

async function GETHandler(req: AuditNextRequest) {
    try {
        const authCtx = await requireAuth(req);
        const scopeType = String((authCtx.claims as any)?.apt?.scope?.type ?? '').toUpperCase();
        const scopeId = (authCtx.claims as any)?.apt?.scope?.id;
        const scopePlatoonId =
            scopeType === 'PLATOON' && typeof scopeId === 'string' && scopeId.trim().length > 0
                ? scopeId.trim()
                : null;

        const searchParams = new URL(req.url).searchParams;
        const requestedPage = parsePositiveInteger(searchParams.get('page'), DEFAULT_PAGE);
        const requestedLimit = parsePositiveInteger(searchParams.get('limit'), DASHBOARD_COURSES_PAGE_SIZE);
        const pageSize = Math.min(requestedLimit, DASHBOARD_COURSES_PAGE_SIZE);
        const activeCadetJoinConditions = [
            eq(ocCadets.courseId, courses.id),
            isNull(ocCadets.deletedAt),
            isNull(ocCadets.withdrawnOn),
            ...(scopePlatoonId ? [eq(ocCadets.platoonId, scopePlatoonId)] : []),
        ];
        const courseFilters = and(
            isNull(courses.deletedAt),
            ...(scopePlatoonId ? [eq(ocCadets.platoonId, scopePlatoonId)] : []),
        );

        const [totalRow] = await db
            .select({
                count: sql<number>`COUNT(DISTINCT ${courses.id})::int`,
            })
            .from(courses)
            .leftJoin(ocCadets, and(...activeCadetJoinConditions))
            .where(courseFilters);

        const totalItems = totalRow?.count ?? 0;
        const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
        const page = totalItems > 0 ? Math.min(requestedPage, totalPages) : DEFAULT_PAGE;
        const offset = (page - 1) * pageSize;

        const rows = await db
            .select({
                courseId: courses.id,
                courseCode: courses.code,
                strength: sql<number>`COALESCE(COUNT(DISTINCT ${ocCadets.id}), 0)::int`,
                currentSemester: sql<number>`COALESCE(MAX(${ocCourseEnrollments.currentSemester}), 1)::int`,
            })
            .from(courses)
            .leftJoin(
                ocCadets,
                and(...activeCadetJoinConditions)
            )
            .leftJoin(
                ocCourseEnrollments,
                and(
                    eq(ocCourseEnrollments.ocId, ocCadets.id),
                    eq(ocCourseEnrollments.courseId, courses.id),
                    eq(ocCourseEnrollments.status, 'ACTIVE')
                )
            )
            .where(courseFilters)
            .groupBy(courses.id, courses.code)
            .orderBy(courses.code)
            .limit(pageSize)
            .offset(offset);

        return json.ok({
            message: 'Dashboard course data retrieved successfully.',
            items: rows,
            count: totalItems,
            pagination: {
                page,
                pageSize,
                totalItems,
                totalPages,
                hasPreviousPage: page > 1,
                hasNextPage: totalItems > 0 && page < totalPages,
            },
        });
    } catch (err) {
        return handleApiError(err);
    }
}

export const GET = withAuditRoute('GET', GETHandler);
