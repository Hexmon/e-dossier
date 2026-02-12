import { db } from '@/app/db/client';
import { users } from '@/app/db/schema/auth/users';
import { positions } from '@/app/db/schema/auth/positions';
import { appointments } from '@/app/db/schema/auth/appointments';
import { json, handleApiError } from '@/app/lib/http';
import { requireAuth } from '@/app/lib/authz';
import { and, eq, isNull, desc, sql } from 'drizzle-orm';
import { withAuditRoute } from '@/lib/audit';
import type { AuditNextRequest } from '@/lib/audit';

async function GETHandler(req: AuditNextRequest) {
    try {
        await requireAuth(req);

        const rows = await db
            .select({
                appointmentId: appointments.id,
                positionName: positions.displayName,
                officerName: sql<string>`TRIM(CONCAT(${users.rank}, ' ', ${users.name}))`,
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
            items: rows,
            count: rows.length,
        });
    } catch (err) {
        return handleApiError(err);
    }
}

export const GET = withAuditRoute('GET', GETHandler);
