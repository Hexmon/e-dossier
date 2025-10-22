import { alias } from 'drizzle-orm/pg-core';
import { db } from '@/app/db/client';
import { users } from '@/app/db/schema/auth/users';
import { and, desc, eq, isNull, sql } from 'drizzle-orm';

export type UserListQuery = {
    q?: string;
    isActive?: 'true' | 'false';
    includeDeleted?: 'true' | 'false';
    limit?: number;
    offset?: number;
};

export async function listUsersWithActiveAppointments(qp: UserListQuery) {
    const u = alias(users, 'u');

    const where: any[] = [];
    if (qp.includeDeleted !== 'true') where.push(isNull(u.deletedAt));
    if (qp.isActive === 'true') where.push(eq(u.isActive, true));
    if (qp.isActive === 'false') where.push(eq(u.isActive, false));
    if (qp.q) {
        const ilike = (col: any, q: string) => sql`${col} ILIKE ${'%' + q + '%'}`;
        where.push(sql`(
      ${ilike(u.username, qp.q)} OR
      ${ilike(u.email, qp.q)} OR
      ${ilike(u.name, qp.q)} OR
      ${ilike(u.phone, qp.q)}
    )`);
    }

    const rows = await db
        .select({
            id: u.id,
            username: u.username,
            name: u.name,
            email: u.email,
            phone: u.phone,
            rank: u.rank,

            appointId: u.appointId, // legacy (nullable)

            isActive: u.isActive,
            deactivatedAt: u.deactivatedAt,
            deletedAt: u.deletedAt,
            createdAt: u.createdAt,
            updatedAt: u.updatedAt,

            // 🔧 Force-qualify the outer id as "u"."id" to avoid ambiguity
            hasActiveAppointment: sql<boolean>`
        EXISTS (
          SELECT 1
          FROM appointments a
          WHERE a.user_id = "u"."id"
            AND a.deleted_at IS NULL
            AND a.ends_at IS NULL
        )
      `,

            activeAppointments: sql<any>`
        COALESCE(
          (
            SELECT json_agg(
              json_build_object(
                'id', a.id,
                'positionId', a.position_id,
                'positionKey', p.key,
                'positionName', p.display_name,
                'scopeType', a.scope_type,
                'scopeId', a.scope_id,
                'startsAt', a.starts_at
              )
              ORDER BY a.starts_at DESC
            )
            FROM appointments a
            JOIN positions p ON p.id = a.position_id
            WHERE a.user_id = "u"."id"
              AND a.deleted_at IS NULL
              AND a.ends_at IS NULL
          ),
          '[]'::json
        )
      `,
        })
        .from(u)
        .where(where.length ? and(...where) : undefined)
        .orderBy(desc(u.createdAt))
        .limit(qp.limit ?? 100)
        .offset(qp.offset ?? 0);

    return rows;
}
