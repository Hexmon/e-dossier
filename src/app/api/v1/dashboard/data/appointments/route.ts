import { db } from '@/app/db/client';
import { users } from '@/app/db/schema/auth/users';
import { positions } from '@/app/db/schema/auth/positions';
import { appointments } from '@/app/db/schema/auth/appointments';
import { listActiveCadetAppointmentsForDashboard } from '@/app/db/queries/cadet-appointments';
import { json, handleApiError } from '@/app/lib/http';
import { requireAuth } from '@/app/lib/authz';
import { and, eq, isNull, desc, sql } from 'drizzle-orm';
import { withAuditRoute } from '@/lib/audit';
import type { AuditNextRequest } from '@/lib/audit';

async function GETHandler(req: AuditNextRequest) {
    try {
        const authCtx = await requireAuth(req);
        const scopeType =
            typeof authCtx.claims?.apt?.scope?.type === 'string'
                ? authCtx.claims.apt.scope.type
                : null;
        const scopeId =
            typeof authCtx.claims?.apt?.scope?.id === 'string'
                ? authCtx.claims.apt.scope.id
                : null;

        if (scopeType === 'PLATOON' && scopeId) {
            const rows = await listActiveCadetAppointmentsForDashboard(scopeId);

            return json.ok({
                message: 'Dashboard cadet appointments retrieved successfully.',
                source: 'platoon-cadet',
                items: rows,
                count: rows.length,
            });
        }

        const rows = await db
            .select({
                appointmentId: appointments.id,
                positionName: positions.displayName,
                officerName: sql<string>`TRIM(CONCAT(${users.rank}, ' ', ${users.name}))`,
                ocNo: sql<string | null>`NULL`,
                courseName: sql<string | null>`NULL`,
                startsAt: appointments.startsAt,
            })
            .from(appointments)
            .innerJoin(users, eq(users.id, appointments.userId))
            .innerJoin(positions, eq(positions.id, appointments.positionId))
            .where(and(
                isNull(appointments.endsAt),
                isNull(appointments.deletedAt)
            ))
            .orderBy(desc(appointments.startsAt));

        return json.ok({
            message: 'Dashboard appointments retrieved successfully.',
            source: 'admin',
            items: rows,
            count: rows.length,
        });
    } catch (err) {
        return handleApiError(err);
    }
}

export const GET = withAuditRoute('GET', GETHandler);
