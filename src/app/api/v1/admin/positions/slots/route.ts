// src/app/api/v1/positions/slots/route.ts
import { NextRequest } from 'next/server';
import { db } from '@/app/db/client';
import { json, handleApiError } from '@/app/lib/http';
import { positions } from '@/app/db/schema/auth/positions';
import { appointments } from '@/app/db/schema/auth/appointments';
import { users } from '@/app/db/schema/auth/users';
import { platoons } from '@/app/db/schema/auth/platoons';
import { and, or, eq, isNull, lte, gte, inArray, sql } from 'drizzle-orm';
import { createAuditLog, AuditEventType, AuditResourceType } from '@/lib/audit-log';
import { withRouteLogging } from '@/lib/withRouteLogging';

async function GETHandler(req: NextRequest) {
  try {
    const url = new URL(req.url);

    // default: true (show only available)
    const onlyAvailable = url.searchParams.get('onlyAvailable') !== '0';

    // filter by position keys (comma-separated)
    const keysParam = url.searchParams.get('positionKeys');
    const positionKeys =
      keysParam?.split(',').map((s) => s.trim()).filter(Boolean) ?? [];

    // NEW: filter by platoon keys (comma-separated)
    const platoonKeysParam = url.searchParams.get('platoonKeys');
    const platoonKeys =
      platoonKeysParam?.split(',').map((s) => s.trim()).filter(Boolean) ?? [];

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

    if (positionKeys.length) {
      globalWhere.push(inArray(positions.key, positionKeys));
    }

    const globalRows = await db
      .select({
        position_id: positions.id,
        position_key: positions.key,
        display_name: positions.displayName,

        scope_type: sql<'GLOBAL'>`'GLOBAL'`,
        scope_id: sql<string | null>`NULL`,
        scope_key: sql<string | null>`NULL`,
        scope_name: sql<string | null>`NULL`,
        scope_about: sql<string | null>`NULL`,

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

    if (positionKeys.length) {
      platoonWhere.push(inArray(positions.key, positionKeys));
    }

    // NOTE: We CROSS JOIN platoons to create a slot per platoon.
    // We can still filter by platoon keys without changing that pattern.
    const platoonJoinFilter =
      platoonKeys.length ? inArray(platoons.key, platoonKeys) : sql`TRUE`;

    const platoonRows = await db
      .select({
        position_id: positions.id,
        position_key: positions.key,
        display_name: positions.displayName,

        scope_type: sql<'PLATOON'>`'PLATOON'`,
        scope_id: platoons.id,
        scope_key: platoons.key,             // NEW
        scope_name: platoons.name,
        scope_about: platoons.about,         // NEW

        appt_id: appointments.id,
        user_id: appointments.userId,
        username: users.username,
        starts_at: appointments.startsAt,
        ends_at: appointments.endsAt,
      })
      .from(positions)
      // CROSS JOIN all platoons then filter by key (if provided)
      .innerJoin(platoons, platoonJoinFilter)
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
          type: r.scope_type as 'GLOBAL' | 'PLATOON',
          id: r.scope_id,                 // null for GLOBAL
          key: r.scope_key ?? null,       // NEW (platoon key)
          name: r.scope_name ?? null,     // platoon name if PLATOON
          about: r.scope_about ?? null,   // NEW (platoon about)
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

    await createAuditLog({
      actorUserId: null,
      eventType: AuditEventType.API_REQUEST,
      resourceType: AuditResourceType.POSITION,
      resourceId: null,
      description: 'Listed position slots',
      metadata: {
        count: slots.length,
        onlyAvailable,
        positionKeys: positionKeys.length ? positionKeys : undefined,
        platoonKeys: platoonKeys.length ? platoonKeys : undefined,
      },
      request: req,
    });
    return json.ok({ message: 'Position slots retrieved successfully.', count: slots.length, slots });
  } catch (err) {
    return handleApiError(err);
  }
}
export const GET = withRouteLogging('GET', GETHandler);
