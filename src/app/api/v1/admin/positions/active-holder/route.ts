import { NextRequest } from 'next/server';
import { json, handleApiError } from '@/app/lib/http';
import { requireAdmin } from '@/app/lib/authz';
import { db } from '@/app/db/client';
import { positions } from '@/app/db/schema/auth/positions';
import { appointments } from '@/app/db/schema/auth/appointments';
import { users } from '@/app/db/schema/auth/users';
import { eq, sql } from 'drizzle-orm';

export async function GET(req: NextRequest) {
    try {
        requireAdmin(req);
        const url = new URL(req.url);
        const positionKey = url.searchParams.get('positionKey');
        const scopeType = (url.searchParams.get('scopeType') || 'GLOBAL') as 'GLOBAL' | 'PLATOON';
        const scopeId = url.searchParams.get('scopeId');

        if (!positionKey) return json.badRequest('positionKey is required');
        if (scopeType === 'PLATOON' && !scopeId) return json.badRequest('scopeId required for PLATOON');

        const [pos] = await db.select().from(positions).where(eq(positions.key, positionKey)).limit(1);
        if (!pos) return json.badRequest('Unknown positionKey');

        const rows = await db
            .select({
                appointmentId: appointments.id,
                userId: appointments.userId,
                username: users.username,
                startsAt: appointments.startsAt,
                endsAt: appointments.endsAt,
            })
            .from(appointments)
            .innerJoin(users, eq(users.id, appointments.userId))
            .where(sql`
         ${appointments.positionId} = ${pos.id}
         AND ${appointments.assignment} = 'PRIMARY'
         AND ${appointments.scopeType} = ${scopeType}
         AND ${scopeType === 'PLATOON' && scopeId ? sql`${appointments.scopeId} = ${scopeId}` : sql`true`}
         AND ${appointments.deletedAt} IS NULL
         AND appointments.valid_during @> now()
      `)
            .limit(1);

        return json.ok({ holder: rows[0] ?? null });
    } catch (err) {
        return handleApiError(err);
    }
}
