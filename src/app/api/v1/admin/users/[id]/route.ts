import { NextRequest } from 'next/server';
import { db } from '@/app/db/client';
import { users } from '@/app/db/schema/auth/users';
import { appointments } from '@/app/db/schema/auth/appointments';
import { credentialsLocal } from '@/app/db/schema/auth/credentials';
import { json, handleApiError, ApiError } from '@/app/lib/http';
import { requireAdmin } from '@/app/lib/authz';
import { userUpdateSchema } from '@/app/lib/validators';
import { and, eq, isNull, sql } from 'drizzle-orm';
import { alias } from 'drizzle-orm/pg-core';
import argon2 from 'argon2';
import { IdSchema } from '@/app/lib/apiClient';

type PgErr = { code?: string; detail?: string; cause?: { code?: string; detail?: string } };

/** Select the enriched user row (with active appointment flags/list) */
async function selectEnrichedUserById(id: string) {
  const u = alias(users, 'u');
  const rows = await db
    .select({
      id: u.id,
      username: u.username,
      name: u.name,
      email: u.email,
      phone: u.phone,
      rank: u.rank,
      appointId: u.appointId,
      isActive: u.isActive,
      deactivatedAt: u.deactivatedAt,
      deletedAt: u.deletedAt,
      createdAt: u.createdAt,
      updatedAt: u.updatedAt,

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
    .where(eq(u.id, id))
    .limit(1);

  return rows[0] ?? null;
}

export async function GET(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin(req);

    const { id: raw } = await (ctx as any).params;
    const rawId = decodeURIComponent((raw ?? '')).trim();
    const { id } = IdSchema.parse({ id: rawId });

    const row = await selectEnrichedUserById(id);
    if (!row) throw new ApiError(404, 'User not found', 'not_found');

    return json.ok({ message: 'User retrieved successfully.', user: row });
  } catch (err) {
    return handleApiError(err);
  }
}

// PATCH /api/v1/admin/users/:id (ADMIN)
// body: userUpdateSchema (password optional; restore toggles soft-delete)
export async function PATCH(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin(req);

    const { id: raw } = await (ctx as any).params;
    const rawId = decodeURIComponent((raw ?? '')).trim();
    const { id } = IdSchema.parse({ id: rawId });

    const body = await req.json();
    const parsed = userUpdateSchema.safeParse(body);
    if (!parsed.success) {
      return json.badRequest('Validation failed.', { issues: parsed.error.flatten() });
    }
    const d = parsed.data;

    const updates: Partial<typeof users.$inferInsert> = {};
    if (d.username !== undefined) updates.username = d.username.trim();
    if (d.name !== undefined) updates.name = d.name.trim();
    if (d.email !== undefined) updates.email = d.email.trim();
    if (d.phone !== undefined) updates.phone = d.phone.trim();
    if (d.rank !== undefined) updates.rank = d.rank.trim();
    if (d.isActive !== undefined) {
      updates.isActive = d.isActive;
      updates.deactivatedAt = d.isActive ? null : new Date();
    }
    if (d.appointId !== undefined) updates.appointId = d.appointId ?? null;
    if (d.restore === true) updates.deletedAt = null;
    if (d.restore === false) updates.deletedAt = new Date();
    if ('deletedAt' in d) updates.deletedAt = d.deletedAt ?? null;

    // Perform update
    const [updated] = await db
      .update(users)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(users.id, id))
      .returning({ id: users.id });

    if (!updated) throw new ApiError(404, 'User not found', 'not_found');

    // optional password reset
    if (d.password) {
      const hash = await argon2.hash(d.password);
      await db
        .insert(credentialsLocal)
        .values({
          userId: updated.id,
          passwordHash: hash,
          passwordAlgo: 'argon2id',
        })
        .onConflictDoUpdate({
          target: credentialsLocal.userId,
          set: {
            passwordHash: hash,
            passwordAlgo: 'argon2id',
            passwordUpdatedAt: new Date(),
          },
        });
    }

    // Return enriched row (with active appointment info)
    const enriched = await selectEnrichedUserById(id);
    return json.ok({ message: 'User updated successfully.', user: enriched });
  } catch (err) {
    const e = err as PgErr;
    const code = e?.code ?? e?.cause?.code;
    if (code === '23505') {
      return json.conflict('Unique constraint violated.', {
        detail: (e?.detail ?? e?.cause?.detail) || 'username/email/phone',
      });
    }
    return handleApiError(err);
  }
}

// DELETE /api/v1/admin/users/:id (ADMIN)
// Soft-delete by default; hard delete with ?hard=true
export async function DELETE(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin(req);

    // Await params once (Next.js App Router dynamic API requirement)
    const { id: raw } = await (ctx as any).params;
    const rawId = decodeURIComponent((raw ?? '')).trim();
    const { id } = IdSchema.parse({ id: rawId });

    // Block delete if the user currently holds any ACTIVE appointment
    const [{ count }] = await db
      .select({ count: sql<number>`COUNT(*)::int` })
      .from(appointments)
      .where(
        and(
          eq(appointments.userId, id),
          isNull(appointments.deletedAt),
          isNull(appointments.endsAt) // active = no end date
        )
      );

    if (count > 0) {
      return json.conflict('Cannot delete user who has active appointments.', {
        activeAppointments: count,
        hint: 'End or transfer all active appointments before deleting this user.',
      });
    }

    const hard = (new URL(req.url).searchParams.get('hard') || '').toLowerCase() === 'true';

    if (hard) {
      // Hard delete
      const deleted = await db.delete(users).where(eq(users.id, id)).returning({ id: users.id });
      if (!deleted.length) throw new ApiError(404, 'User not found', 'not_found');
      return json.ok({ message: 'User hard-deleted.', id: deleted[0].id });
    }

    // Soft delete
    const [u] = await db
      .update(users)
      .set({
        deletedAt: new Date(),
        isActive: false,
        deactivatedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(users.id, id))
      .returning({ id: users.id });

    if (!u) throw new ApiError(404, 'User not found', 'not_found');
    return json.ok({ message: 'User soft-deleted.', id: u.id });
  } catch (err) {
    return handleApiError(err);
  }
}
