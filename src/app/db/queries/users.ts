import { alias } from 'drizzle-orm/pg-core';
import { db } from '@/app/db/client';
import { users } from '@/app/db/schema/auth/users';
import { and, desc, eq, isNull, sql, ilike, or } from 'drizzle-orm';

export type UserListQuery = {
  q?: string;
  isActive?: 'true' | 'false';
  includeDeleted?: 'true' | 'false';
  scopeType?: string;
  limit?: number;
  offset?: number;
};

export async function listUsersWithActiveAppointments(qp: UserListQuery) {
  const u = alias(users, 'u');

  const where: any[] = [];
  if (qp.includeDeleted !== 'true') where.push(isNull(u.deletedAt));
  if (qp.isActive === 'true') where.push(eq(u.isActive, true));
  if (qp.isActive === 'false') where.push(eq(u.isActive, false));

  // Search in user fields and active appointment metadata.
  // Escape SQL LIKE wildcards to avoid pattern injection.
  if (qp.q) {
    const searchPattern = `%${qp.q.replace(/[%_\\]/g, '\\$&')}%`;
    where.push(or(
      sql<boolean>`${u.id}::text ILIKE ${searchPattern}`,
      ilike(u.username, searchPattern),
      ilike(u.email, searchPattern),
      ilike(u.name, searchPattern),
      ilike(u.phone, searchPattern),
      ilike(u.rank, searchPattern),
      sql<boolean>`coalesce(${u.appointId}::text, '') ILIKE ${searchPattern}`,
      sql<boolean>`${u.isActive}::text ILIKE ${searchPattern}`,
      sql<boolean>`${u.createdAt}::text ILIKE ${searchPattern}`,
      sql<boolean>`coalesce(${u.updatedAt}::text, '') ILIKE ${searchPattern}`,
      sql<boolean>`coalesce(${u.deactivatedAt}::text, '') ILIKE ${searchPattern}`,
      sql<boolean>`coalesce(${u.deletedAt}::text, '') ILIKE ${searchPattern}`,
      sql<boolean>`concat_ws(' ', coalesce(${u.rank}, ''), coalesce(${u.name}, '')) ILIKE ${searchPattern}`,
      sql<boolean>`EXISTS (
        SELECT 1
        FROM appointments a
        LEFT JOIN positions p ON p.id = a.position_id
        WHERE a.user_id = "u"."id"
          AND a.deleted_at IS NULL
          AND a.ends_at IS NULL
          AND (
            p.display_name ILIKE ${searchPattern}
            OR p.key ILIKE ${searchPattern}
            OR a.scope_type::text ILIKE ${searchPattern}
            OR coalesce(a.scope_id::text, '') ILIKE ${searchPattern}
            OR a.id::text ILIKE ${searchPattern}
            OR a.starts_at::text ILIKE ${searchPattern}
          )
      )`
    ));
  }

  // Filter by appointment scope type (e.g. 'PLATOON')
  if (qp.scopeType) {
    where.push(sql`EXISTS (
            SELECT 1 FROM appointments a
            WHERE a.user_id = "u"."id"
              AND a.scope_type = ${qp.scopeType}
              AND a.deleted_at IS NULL
              AND a.ends_at IS NULL
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
