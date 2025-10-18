// src/app/db/seeds/seedAdminUser.ts
import 'dotenv/config';
import argon2 from 'argon2';
import { and, eq, ilike, sql } from 'drizzle-orm';

import { db } from '../client';
import { users } from '../schema/auth/users';
import { credentialsLocal } from '../schema/auth/credentials';
import { roles, userRoles } from '../schema/auth/rbac';
import { positions } from '../schema/auth/positions';
import { appointments } from '../schema/auth/appointments';

const {
  // SUPER ADMIN
  SUPERADMIN_USERNAME,
  SUPERADMIN_PASSWORD,
  SUPERADMIN_EMAIL,
  SUPERADMIN_PHONE,
  SUPERADMIN_NAME,
  SUPERADMIN_RANK,

  // ADMIN
  ADMIN_USERNAME,
  ADMIN_PASSWORD,
  ADMIN_EMAIL,
  ADMIN_PHONE,
  ADMIN_NAME,
  ADMIN_RANK,
} = process.env;

function assertEnv() {
  const missing: string[] = [];
  if (!SUPERADMIN_USERNAME) missing.push('SUPERADMIN_USERNAME');
  if (!SUPERADMIN_PASSWORD) missing.push('SUPERADMIN_PASSWORD');
  if (!SUPERADMIN_EMAIL) missing.push('SUPERADMIN_EMAIL');
  if (!ADMIN_USERNAME) missing.push('ADMIN_USERNAME');
  if (!ADMIN_PASSWORD) missing.push('ADMIN_PASSWORD');
  if (!ADMIN_EMAIL) missing.push('ADMIN_EMAIL');

  if (missing.length) {
    console.error(`Missing required env vars: ${missing.join(', ')}`);
    process.exit(1);
  }
}

async function upsertUserWithPassword(params: {
  username: string;
  email: string;
  phone?: string;
  name?: string;
  rank?: string;
  password: string;
}) {
  const uname = params.username.toLowerCase();
  const email = params.email.toLowerCase();

  let [u] = await db.select().from(users).where(ilike(users.username, uname)).limit(1);

  if (!u) {
    [u] = await db
      .insert(users)
      .values({
        username: uname,
        email,
        phone: params.phone ?? '+0000000000',
        name: params.name ?? uname,
        rank: params.rank ?? 'N/A',
        isActive: true,
      })
      .returning();
  } else if (!u.isActive) {
    await db.update(users).set({ isActive: true }).where(eq(users.id, u.id));
  }

  // Set/Reset password
  const hash = await argon2.hash(params.password, {
    type: argon2.argon2id,
    memoryCost: 19456,
    timeCost: 2,
    parallelism: 1,
  });

  const cred = await db.select().from(credentialsLocal).where(eq(credentialsLocal.userId, u.id)).limit(1);
  if (cred.length) {
    await db
      .update(credentialsLocal)
      .set({ passwordHash: hash, passwordAlgo: 'argon2id', passwordUpdatedAt: new Date() })
      .where(eq(credentialsLocal.userId, u.id));
  } else {
    await db.insert(credentialsLocal).values({
      userId: u.id,
      passwordHash: hash,
      passwordAlgo: 'argon2id',
      passwordUpdatedAt: new Date(),
    });
  }

  return u;
}

async function ensureAdminRole(userId: string) {
  let [adminRole] = await db.select().from(roles).where(eq(roles.key, 'admin')).limit(1);
  if (!adminRole) {
    [adminRole] = await db.insert(roles).values({ key: 'admin', description: 'Administrator' }).returning();
  }
  await db.insert(userRoles).values({ userId, roleId: adminRole.id }).onConflictDoNothing();
}

async function ensureActiveAppointment(userId: string, positionKey: string) {
  // Get (or create) the position
  let [pos] = await db.select().from(positions).where(eq(positions.key, positionKey)).limit(1);
  if (!pos) {
    [pos] = await db
      .insert(positions)
      .values({
        key: positionKey,
        displayName: positionKey.replace(/_/g, ' '),
        // default_scope is enum scope_type in DB:
        defaultScope: positionKey === 'PLATOON_COMMANDER' ? (sql`'PLATOON'::scope_type` as any) : (sql`'GLOBAL'::scope_type` as any),
        singleton: true,
        description: 'Seeded automatically',
      })
      .returning();
  }

  // Check if an active PRIMARY appointment already exists for this user & position (GLOBAL scope)
  const existing = await db
    .select({ id: appointments.id })
    .from(appointments)
    .where(
      and(
        eq(appointments.userId, userId),
        eq(appointments.positionId, pos.id),
        eq(appointments.assignment, 'PRIMARY' as any),
        eq(appointments.scopeType, 'GLOBAL' as any),
        sql`${appointments.deletedAt} IS NULL`,
        sql`appointments.valid_during @> now()`
      )
    )
    .limit(1);

  if (!existing.length) {
    await db
      .insert(appointments)
      .values({
        userId,
        positionId: pos.id,
        assignment: 'PRIMARY' as any,
        scopeType: 'GLOBAL' as any,
        scopeId: null,
        startsAt: new Date(),
        endsAt: null,
        appointedBy: userId, // bootstrap
        reason: 'bootstrap seed',
      })
      .returning();
  }
}

export async function seedAdminUser() {
  assertEnv();

  // 1) SUPER_ADMIN post + user
  const superUser = await upsertUserWithPassword({
    username: SUPERADMIN_USERNAME!,
    email: SUPERADMIN_EMAIL!,
    phone: SUPERADMIN_PHONE ?? '+0000000000',
    name: SUPERADMIN_NAME ?? 'Super Admin',
    rank: SUPERADMIN_RANK ?? 'SUPER',
    password: SUPERADMIN_PASSWORD!,
  });
  await ensureAdminRole(superUser.id);                // give admin role for UI/admin APIs
  await ensureActiveAppointment(superUser.id, 'SUPER_ADMIN');

  // 2) ADMIN post + user
  const adminUser = await upsertUserWithPassword({
    username: ADMIN_USERNAME!,
    email: ADMIN_EMAIL!,
    phone: ADMIN_PHONE ?? '+0000000001',
    name: ADMIN_NAME ?? 'Admin',
    rank: ADMIN_RANK ?? 'ADMIN',
    password: ADMIN_PASSWORD!,
  });
  await ensureAdminRole(adminUser.id);
  await ensureActiveAppointment(adminUser.id, 'ADMIN');

  console.log('✅ Seeded SUPER_ADMIN and ADMIN users with active appointments.');
  console.log(`   SUPER_ADMIN login: ${SUPERADMIN_USERNAME}`);
  console.log(`   ADMIN login:       ${ADMIN_USERNAME}`);
}
