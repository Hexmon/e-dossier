// src/app/db/queries/auth.ts
import { db } from '../client';
import { users } from '../schema/auth/users';
import { credentialsLocal } from '../schema/auth/credentials';
import { eq, sql } from 'drizzle-orm';
import argon2 from 'argon2';

// Centralized Argon2 params (tune to your infra)
export const ARGON2_OPTS: argon2.Options & { type: number } = {
  type: argon2.argon2id,
  memoryCost: 19456,
  timeCost: 2,
  parallelism: 1,
};

type PgError = { code?: string; detail?: string };

function normalizePhone(phone: string) {
  const p = (phone ?? '').trim();
  if (!p) throw new Error('Phone is required');
  // TODO: format to E.164 with libphonenumber-js
  return p;
}

/**
 * Create a user + local credentials in a single transaction.
 * - `current_appointment_id` remains NULL by design at signup.
 * - `is_active` starts TRUE (you can flip later via admin flow).
 */
export async function signupLocal(payload: {
  username: string;
  password: string;
  name: string;
  email: string;
  phone: string;
  rank: string;
  isActive?: boolean;
}) {
  const username = payload.username.trim().toLowerCase();
  const email = payload.email.trim().toLowerCase();
  const phone = normalizePhone(payload.phone);

  try {
    const res = await db.transaction(async (tx) => {
      const [u] = await tx
        .insert(users)
        .values({
          username,
          email,
          phone,
          name: payload.name,
          rank: payload.rank,
          isActive: payload.isActive ?? false,
        })
        .returning({ id: users.id, username: users.username });

      const hash = await argon2.hash(payload.password, ARGON2_OPTS);

      await tx.insert(credentialsLocal).values({
        userId: u.id,
        passwordHash: hash,
        passwordAlgo: 'argon2id',
        passwordUpdatedAt: new Date(),
      });

      return { id: u.id, username: u.username };
    });

    return res;
  } catch (err: unknown) {
    const e = err as PgError;
    if (e.code === '23505') {
      // Partial-unique indexes (soft-delete aware) on username/email/phone
      throw new Error('Username / email / phone already in use');
    }
    throw err;
  }
}

/**
 * Verify username + password.
 * - Uses lower() to be robust across varchar/citext.
 * - Rejects soft-deleted / deactivated users.
 * @returns the user row (shape from drizzle schema) or null
 */
export async function verifyPassword(username: string, password: string) {
  const uname = username.trim().toLowerCase();

  // SECURITY FIX: Use parameterized query instead of raw SQL to prevent SQL injection
  const [u] = await db
    .select()
    .from(users)
    .where(eq(sql`lower(${users.username})`, uname))
    .limit(1);

  if (!u) return null;
  if (u.deletedAt) return null;
  if (!u.isActive || u.deactivatedAt) return null;

  const [cred] = await db
    .select()
    .from(credentialsLocal)
    .where(eq(credentialsLocal.userId, u.id))
    .limit(1);

  if (!cred) return null;

  const ok = await argon2.verify(cred.passwordHash, password);
  return ok ? u : null;
}

/**
 * Change password (self-service): checks old password, then sets new one.
 * Also bumps password_updated_at (handy to invalidate existing access tokens).
 */
export async function changePasswordLocal(params: {
  userId: string;
  oldPassword: string;
  newPassword: string;
}) {
  const { userId, oldPassword, newPassword } = params;

  // fetch creds
  const [cred] = await db
    .select()
    .from(credentialsLocal)
    .where(eq(credentialsLocal.userId, userId))
    .limit(1);

  if (!cred) throw new Error('Credentials not found');

  const ok = await argon2.verify(cred.passwordHash, oldPassword);
  if (!ok) throw new Error('Invalid old password');

  const hash = await argon2.hash(newPassword, ARGON2_OPTS);

  await db
    .update(credentialsLocal)
    .set({
      passwordHash: hash,
      passwordAlgo: 'argon2id',
      passwordUpdatedAt: new Date(),
    })
    .where(eq(credentialsLocal.userId, userId));

  return { changed: true };
}

/**
 * Admin password reset: no old password check.
 * You should call this from an admin-only route and audit it.
 */
export async function setPasswordAdmin(userId: string, newPassword: string) {
  const hash = await argon2.hash(newPassword, ARGON2_OPTS);

  const updated = await db
    .update(credentialsLocal)
    .set({
      passwordHash: hash,
      passwordAlgo: 'argon2id',
      passwordUpdatedAt: new Date(),
    })
    .where(eq(credentialsLocal.userId, userId));

  return { updated };
}

/**
 * Optional helper: look up a user by case-insensitive username.
 */
export async function getUserByUsername(username: string) {
  const uname = username.trim().toLowerCase();
  // SECURITY FIX: Use parameterized query instead of raw SQL to prevent SQL injection
  const [u] = await db
    .select()
    .from(users)
    .where(eq(sql`lower(${users.username})`, uname))
    .limit(1);
  return u ?? null;
}
