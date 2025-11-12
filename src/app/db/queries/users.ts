import { alias } from 'drizzle-orm/pg-core';
import { db } from '@/app/db/client';
import { users } from '@/app/db/schema/auth/users';
import { and, desc, eq, isNull, sql, ilike, or } from 'drizzle-orm';

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

    // SECURITY FIX: Use Drizzle's built-in ilike function with proper parameterization
    // Also escape SQL LIKE wildcards to prevent injection
    if (qp.q) {
        const searchPattern = `%${qp.q.replace(/[%_\\]/g, '\\$&')}%`;
        where.push(or(
            ilike(u.username, searchPattern),
            ilike(u.email, searchPattern),
            ilike(u.name, searchPattern),
            ilike(u.phone, searchPattern)
        ));
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
