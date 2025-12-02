import { NextRequest } from 'next/server';
import { z } from 'zod';
import argon2 from 'argon2';
import { db } from '@/app/db/client';
import { json, handleApiError, ApiError } from '@/app/lib/http';
import { requireAuth, hasAdminRole } from '@/app/lib/authz';
import { users } from '@/app/db/schema/auth/users';
import { credentialsLocal } from '@/app/db/schema/auth/credentials';
import { eq, isNull } from 'drizzle-orm';

// Body:
// - For self-service (non-admin): { newPassword, currentPassword }  (userId optional/ignored)
// - For admin reset: { userId, newPassword } (currentPassword optional)
const BodySchema = z.object({
  userId: z.string().uuid().optional(),
  newPassword: z.string().min(8, 'Password must be at least 8 characters').max(128),
  currentPassword: z.string().min(1).optional(),
});

export async function POST(req: NextRequest) {
  try {
    // 1) AuthN
    const { userId: callerId, roles } = await requireAuth(req);
    const callerIsAdmin = hasAdminRole(roles);

    // 2) Parse JSON safely
    let raw: unknown;
    try {
      raw = await req.json();
    } catch {
      return json.badRequest('Invalid JSON body.', { message: 'Request body must be valid JSON.' });
    }

    // 3) Shape/format validation
    const parsed = BodySchema.safeParse(raw);
    if (!parsed.success) {
      return json.badRequest('Validation failed.', { details: parsed.error.format() });
    }
    const { userId: targetIdRaw, newPassword, currentPassword } = parsed.data;

    // 4) Determine target user
    //    - Admin can pass userId to reset others.
    //    - Non-admin can only change their own password.
    const targetUserId = callerIsAdmin && targetIdRaw ? targetIdRaw : callerId;
    if (!callerIsAdmin && targetIdRaw && targetIdRaw !== callerId) {
      throw new ApiError(403, "Forbidden: cannot change another user's password.", 'forbidden');
    }

    // 5) Load target user (must not be soft-deleted)
    const [u] = await db
      .select({
        id: users.id,
        deletedAt: users.deletedAt,
      })
      .from(users)
      .where(eq(users.id, targetUserId))
      .limit(1);

    if (!u) throw new ApiError(404, 'User not found', 'not_found');
    if (u.deletedAt) throw new ApiError(409, 'User is deleted', 'conflict');

    // 6) Fetch credentials (may not exist yet)
    const [cred] = await db
      .select({
        userId: credentialsLocal.userId,
        passwordHash: credentialsLocal.passwordHash,
      })
      .from(credentialsLocal)
      .where(eq(credentialsLocal.userId, targetUserId))
      .limit(1);

    // 7) If caller is not admin (or is admin changing own password and provided current),
    //    verify current password. For regular users, it is required.
    const mustVerifyCurrent =
      !callerIsAdmin || (!!currentPassword && targetUserId === callerId);

    if (mustVerifyCurrent) {
      if (!currentPassword) {
        throw new ApiError(400, 'currentPassword is required.', 'bad_request');
      }
      if (!cred?.passwordHash) {
        throw new ApiError(401, 'Invalid credentials.', 'NO_CREDENTIALS');
      }
      const ok = await argon2.verify(cred.passwordHash, currentPassword);
      if (!ok) throw new ApiError(401, 'Invalid credentials.', 'BAD_PASSWORD');
    }

    // 8) Hash & upsert new password
    const hash = await argon2.hash(newPassword);
    await db
      .insert(credentialsLocal)
      .values({
        userId: targetUserId,
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

    return json.ok({
      message: callerIsAdmin && targetUserId !== callerId
        ? 'Password reset successfully for target user.'
        : 'Password changed successfully.',
      userId: targetUserId,
    });
  } catch (err) {
    return handleApiError(err);
  }
}
