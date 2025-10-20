// src/app/api/v1/positions/slots/route.ts
import { NextRequest } from 'next/server';
import { db } from '@/app/db/client';
import { json, handleApiError } from '@/app/lib/http';
import { positions } from '@/app/db/schema/auth/positions';
import { appointments } from '@/app/db/schema/auth/appointments';
import { users } from '@/app/db/schema/auth/users';
import { platoons } from '@/app/db/schema/auth/platoons';
import { and, or, eq, isNull, lte, gte, inArray, sql } from 'drizzle-orm';

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    // default: true (show only available)
    const onlyAvailable = url.searchParams.get('onlyAvailable') !== '0';
    const keysParam = url.searchParams.get('positionKeys');
    const keys =
      keysParam?.split(',').map((s) => s.trim()).filter(Boolean) ?? [];

    const now = new Date();

    // Active window: starts_at <= now AND (ends_at IS NULL OR ends_at >= now)
    const activeWindow = and(
      lte(appointments.startsAt, now),
      or(isNull(appointments.endsAt), gte(appointments.endsAt, now)),
    );

    // ------------ GLOBAL scope (one slot each) ------------
    const globalWhere = [
      eq(positions.defaultScope, 'GLOBAL' as const),
    ] as any[];

    if (keys.length) {
      globalWhere.push(inArray(positions.key, keys));
    }

    const globalRows = await db
      .select({
        position_id: positions.id,
        position_key: positions.key,
        display_name: positions.displayName,
        scope_type: sql<'GLOBAL'>`'GLOBAL'`,
        scope_id: sql<string | null>`NULL`,
        scope_name: sql<string | null>`NULL`,
        appt_id: appointments.id,
        user_id: appointments.userId,
        username: users.username,
        starts_at: appointments.startsAt,
        ends_at: appointments.endsAt,
      })
      .from(positions)
      .leftJoin(
        appointments,
        and(
          eq(appointments.positionId, positions.id),
          eq(appointments.assignment, 'PRIMARY'),
          eq(appointments.scopeType, 'GLOBAL'),
          isNull(appointments.deletedAt),
          activeWindow,
        ),
      )
      .leftJoin(users, eq(users.id, appointments.userId))
      .where(globalWhere.length ? and(...globalWhere) : undefined);

    // ------------ PLATOON scope (a slot per platoon) ------------
    const platoonWhere = [
      eq(positions.defaultScope, 'PLATOON' as const),
    ] as any[];

    if (keys.length) {
      platoonWhere.push(inArray(positions.key, keys));
    }

    const platoonRows = await db
      .select({
        position_id: positions.id,
        position_key: positions.key,
        display_name: positions.displayName,
        scope_type: sql<'PLATOON'>`'PLATOON'`,
        scope_id: platoons.id,
        scope_name: platoons.name,
        appt_id: appointments.id,
        user_id: appointments.userId,
        username: users.username,
        starts_at: appointments.startsAt,
        ends_at: appointments.endsAt,
      })
      .from(positions)
      // CROSS JOIN platoons (one slot per platoon)
      .innerJoin(platoons, sql`TRUE`)
      .leftJoin(
        appointments,
        and(
          eq(appointments.positionId, positions.id),
          eq(appointments.assignment, 'PRIMARY'),
          eq(appointments.scopeType, 'PLATOON'),
          eq(appointments.scopeId, platoons.id),
          isNull(appointments.deletedAt),
          activeWindow,
        ),
      )
      .leftJoin(users, eq(users.id, appointments.userId))
      .where(platoonWhere.length ? and(...platoonWhere) : undefined);

    // Merge & post-filter
    let rows = [...globalRows, ...platoonRows];

    if (onlyAvailable) {
      rows = rows.filter((r) => r.appt_id == null);
    }

    // Shape to desired response
    const slots = rows
      .sort(
        (a, b) =>
          String(a.position_key).localeCompare(String(b.position_key)) ||
          String(a.scope_name ?? '').localeCompare(String(b.scope_name ?? '')),
      )
      .map((r) => ({
        position: {
          id: r.position_id,
          key: r.position_key,
          displayName: r.display_name,
        },
        scope: {
          type: r.scope_type, // 'GLOBAL' | 'PLATOON'
          id: r.scope_id, // null for GLOBAL
          name: r.scope_name ?? null, // platoon name if PLATOON
        },
        occupied: r.appt_id != null,
        occupant: r.appt_id
          ? {
            appointmentId: r.appt_id,
            userId: r.user_id,
            username: r.username,
            startsAt: r.starts_at,
            endsAt: r.ends_at,
          }
          : null,
      }));

    return json.ok({ count: slots.length, slots });
  } catch (err) {
    return handleApiError(err);
  }
}
