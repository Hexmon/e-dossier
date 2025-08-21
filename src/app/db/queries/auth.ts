import { db } from '../client';
import { users } from '../schema/auth/users';
import { credentialsLocal } from '../schema/auth/credentials';
import { eq, sql } from 'drizzle-orm';
import argon2 from 'argon2';

// Optional: centralize Argon2 params
const ARGON2_OPTS: argon2.Options & { type: number } = {
  type: argon2.argon2id,
  memoryCost: 19456,
  timeCost: 2,
  parallelism: 1,
};

type PgError = { code?: string; detail?: string };

function normalizePhone(phone: string) {
  const p = phone.trim();
  if (!p) throw new Error('Phone is required');
  // TODO: format to E.164 with libphonenumber-js
  return p;
}

export async function signupLocal(payload: {
  username: string;
  password: string;
  name: string;
  email: string;
  phone: string;
  usertype: string;
  rank: string;
}) {
  const username = payload.username.trim().toLowerCase();
  const email = payload.email.trim().toLowerCase();
  const phone = normalizePhone(payload.phone);

  try {
    const res = await db.transaction(async (tx) => {
      // Let DB generate id; fetch it back
      const [u] = await tx
        .insert(users)
        .values({
          username,
          email,
          phone,
          name: payload.name,
          usertype: payload.usertype,
          rank: payload.rank,
          isActive: true,
        })
        .returning({ id: users.id });

      const hash = await argon2.hash(payload.password, ARGON2_OPTS);
      await tx.insert(credentialsLocal).values({
        userId: u.id,
        passwordHash: hash,
        passwordAlgo: 'argon2id',
        // explicit timestamp (even though default exists)
        passwordUpdatedAt: new Date(),
      });

      return { id: u.id };
    });

    return res;
  } catch (err: unknown) {
    const e = err as PgError;
    if (e.code === '23505') {
      // Conflict with partial-unique-lower(username/email) or phone
      throw new Error('Username / email / phone already in use');
    }
    throw err;
  }
}

export async function verifyPassword(username: string, password: string) {
  const uname = username.trim().toLowerCase();

  // Works with varchar+lower() and with CITEXT
  const [u] = await db
    .select()
    .from(users)
    .where(sql`lower(${users.username}) = ${uname}`);

  if (!u) return null;
  if (u.deletedAt) return null;
  if (!u.isActive || u.deactivatedAt) return null;

  const [cred] = await db
    .select()
    .from(credentialsLocal)
    .where(eq(credentialsLocal.userId, u.id));
  if (!cred) return null;

  const ok = await argon2.verify(cred.passwordHash, password);
  return ok ? u : null;
}
