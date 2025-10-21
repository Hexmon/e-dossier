import { NextRequest } from 'next/server';
import { db } from '@/app/db/client';
import { users } from '@/app/db/schema/auth/users';
import { credentialsLocal } from '@/app/db/schema/auth/credentials';
import { json, handleApiError, ApiError } from '@/app/lib/http';
import { requireAdmin } from '@/app/lib/authz';
import { userUpdateSchema } from '@/app/lib/validators';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import argon2 from 'argon2';

type PgErr = { code?: string; detail?: string; cause?: { code?: string; detail?: string } };

const IdSchema = z.object({ id: z.string().uuid() });

export async function GET(req: NextRequest, ctx: { params: { id: string } } | { params: Promise<{ id: string }> }) {
  try {
    await requireAdmin(req);

    const { id: raw } = await (ctx as any).params;
    const rawId = decodeURIComponent((raw ?? '')).trim();
    const { id } = IdSchema.parse({ id: rawId });

    const [row] = await db
      .select({
        id: users.id,
        username: users.username,
        name: users.name,
        email: users.email,
        phone: users.phone,
        rank: users.rank,
        appointId: users.appointId,
        isActive: users.isActive,
        deactivatedAt: users.deactivatedAt,
        deletedAt: users.deletedAt,
        createdAt: users.createdAt,
        updatedAt: users.updatedAt,
      })
      .from(users)
      .where(eq(users.id, id))
      .limit(1);

    if (!row) throw new ApiError(404, 'User not found', 'not_found');
    return json.ok({ user: row });
  } catch (err) {
    return handleApiError(err);
  }
}


// PATCH /api/v1/admin/users/:id (ADMIN)
// body: userUpdateSchema (password optional; restore toggles soft-delete)
export async function PATCH(
  req: NextRequest,
  ctx: { params: { id: string } } | { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin(req);

    // ✅ await params ONCE
    const { id: raw } = await (ctx as any).params;
    const rawId = decodeURIComponent((raw ?? '')).trim();
    const { id } = IdSchema.parse({ id: rawId });

    const body = await req.json();
    const parsed = userUpdateSchema.safeParse(body);
    if (!parsed.success) {
      return json.badRequest('Validation failed', { issues: parsed.error.flatten() });
    }
    const d = parsed.data;

    // build updates
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

    const [updated] = await db
      .update(users)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(users.id, id))
      .returning({
        id: users.id,
        username: users.username,
        name: users.name,
        email: users.email,
        phone: users.phone,
        rank: users.rank,
        appointId: users.appointId,
        isActive: users.isActive,
        deactivatedAt: users.deactivatedAt,
        deletedAt: users.deletedAt,
        createdAt: users.createdAt,
        updatedAt: users.updatedAt,
      });

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

    return json.ok({ user: updated });
  } catch (err) {
    const e = err as PgErr;
    const code = e?.code ?? e?.cause?.code;
    if (code === '23505') {
      return json.conflict('Unique constraint violated', { detail: (e?.detail ?? e?.cause?.detail) || 'username/email/phone' });
    }
    return handleApiError(err);
  }
}

// DELETE /api/v1/admin/users/:id (ADMIN)
// Soft-delete by default; hard delete with ?hard=true
export async function DELETE(
  req: NextRequest,
  ctx: { params: { id: string } } | { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin(req);

    // Await params once (Next.js App Router dynamic API requirement)
    const { id: raw } = await (ctx as any).params;
    const rawId = decodeURIComponent((raw ?? '')).trim();
    const { id } = IdSchema.parse({ id: rawId });

    const hard = (new URL(req.url).searchParams.get('hard') || '')
      .toLowerCase() === 'true';

    if (hard) {
      // Hard delete
      const deleted = await db.delete(users).where(eq(users.id, id)).returning({ id: users.id });
      if (!deleted.length) throw new ApiError(404, 'User not found', 'not_found');
      return json.ok({ message: 'User hard-deleted', id: deleted[0].id });
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
    return json.ok({ message: 'User soft-deleted', id: u.id });
  } catch (err) {
    return handleApiError(err);
  }
}

