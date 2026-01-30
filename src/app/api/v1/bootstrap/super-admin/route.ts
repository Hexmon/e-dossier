import { NextRequest } from 'next/server';
import { z } from 'zod';
import argon2 from 'argon2';
import { db } from '@/app/db/client';
import { users } from '@/app/db/schema/auth/users';
import { credentialsLocal } from '@/app/db/schema/auth/credentials';
import { positions } from '@/app/db/schema/auth/positions';
import { appointments } from '@/app/db/schema/auth/appointments';
import { json, handleApiError } from '@/app/lib/http';
import { passwordSchema } from '@/app/lib/validators';
import { and, eq, ilike, isNull, or } from 'drizzle-orm';

// Public bootstrap endpoint to create a SUPER_ADMIN user without auth.
// REMOVE after initial deployment.
const bodySchema = z.object({
  username: z.string().trim().min(3).max(64),
  email: z.string().trim().toLowerCase().email().max(255),
  password: passwordSchema,
  name: z.string().trim().min(1).max(120).optional(),
  phone: z.string().trim().min(3).max(32).optional(),
  rank: z.string().trim().min(1).max(64).optional(),
});

export async function POST(req: NextRequest) {
  try {
    const parsed = bodySchema.safeParse(await req.json());
    if (!parsed.success) {
      return json.badRequest('Validation failed.', { issues: parsed.error.flatten() });
    }
    const payload = parsed.data;

    const username = payload.username.trim().toLowerCase();
    const email = payload.email.trim().toLowerCase();
    const phone = payload.phone?.trim() ?? '+0000000000';
    const name = payload.name?.trim() ?? 'Super Admin';
    const rank = payload.rank?.trim() ?? 'SUPER';

    // Upsert user (reactivate if soft-inactive)
    const existing = await db
      .select({ id: users.id, isActive: users.isActive })
      .from(users)
      .where(
        and(
          isNull(users.deletedAt),
          or(ilike(users.username, username), ilike(users.email, email))
        )
      )
      .limit(1);

    let userId: string;
    if (existing.length) {
      userId = existing[0].id;
      if (!existing[0].isActive) {
        await db.update(users).set({ isActive: true }).where(eq(users.id, userId));
      }
    } else {
      const [u] = await db
        .insert(users)
        .values({
          username,
          email,
          phone,
          name,
          rank,
          isActive: true,
        })
        .returning({ id: users.id });
      userId = u.id;
    }

    // Set/reset password
    const passwordHash = await argon2.hash(payload.password, {
      type: argon2.argon2id,
      memoryCost: 19456,
      timeCost: 2,
      parallelism: 1,
    });

    const cred = await db.select().from(credentialsLocal).where(eq(credentialsLocal.userId, userId)).limit(1);
    if (cred.length) {
      await db
        .update(credentialsLocal)
        .set({ passwordHash, passwordAlgo: 'argon2id', passwordUpdatedAt: new Date() })
        .where(eq(credentialsLocal.userId, userId));
    } else {
      await db.insert(credentialsLocal).values({
        userId,
        passwordHash,
        passwordAlgo: 'argon2id',
        passwordUpdatedAt: new Date(),
      });
    }

    // Ensure SUPER_ADMIN position exists
    let [pos] = await db
      .select({ id: positions.id })
      .from(positions)
      .where(eq(positions.key, 'SUPER_ADMIN'))
      .limit(1);

    if (!pos) {
      [pos] = await db
        .insert(positions)
        .values({
          key: 'SUPER_ADMIN',
          displayName: 'Super Admin',
          defaultScope: 'GLOBAL',
          singleton: true,
          description: 'Bootstrap super admin position',
        })
        .returning({ id: positions.id });
    }

    // Ensure an active SUPER_ADMIN appointment exists
    const activeApt = await db
      .select({ id: appointments.id })
      .from(appointments)
      .where(
        and(
          eq(appointments.userId, userId),
          eq(appointments.positionId, pos.id),
          isNull(appointments.deletedAt),
          isNull(appointments.endsAt)
        )
      )
      .limit(1);

    if (!activeApt.length) {
      await db.insert(appointments).values({
        userId,
        positionId: pos.id,
        assignment: 'PRIMARY',
        scopeType: 'GLOBAL',
        scopeId: null,
        startsAt: new Date(),
        endsAt: null,
        appointedBy: userId,
        reason: 'bootstrap super admin',
      });
    }

    return json.created({
      message: 'SUPER_ADMIN bootstrap complete.',
      user: { id: userId, username, email },
    });
  } catch (err) {
    return handleApiError(err);
  }
}
