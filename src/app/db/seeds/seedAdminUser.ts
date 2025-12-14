// src/app/db/seeds/seedAdminUser.ts
import 'dotenv/config';
import argon2 from 'argon2';
import { and, eq, isNull, sql } from 'drizzle-orm';

import { db } from '../client';
import { ARGON2_OPTS } from '../queries/auth';
import { appointments } from '../schema/auth/appointments';
import { credentialsLocal } from '../schema/auth/credentials';
import { positions } from '../schema/auth/positions';
import { users } from '../schema/auth/users';

type SeedUserInput = {
  username: string;
  password: string;
  email: string;
  phone: string;
  name: string;
  rank: string;
  positionKey: 'SUPER_ADMIN' | 'ADMIN';
};

type UpsertOutcome = 'created' | 'updated' | 'unchanged';
type DbExecutor = Pick<typeof db, 'select' | 'insert' | 'update'>;

function validateEnv() {
  const required = [
    'DATABASE_URL',
    'SUPERADMIN_USERNAME',
    'SUPERADMIN_PASSWORD',
    'SUPERADMIN_EMAIL',
    'SUPERADMIN_PHONE',
    'SUPERADMIN_NAME',
    'SUPERADMIN_RANK',
    'ADMIN_USERNAME',
    'ADMIN_PASSWORD',
    'ADMIN_EMAIL',
    'ADMIN_PHONE',
    'ADMIN_NAME',
    'ADMIN_RANK',
  ];

  const missing = required.filter((key) => !process.env[key] || String(process.env[key]).trim() === '');
  if (missing.length) {
    throw new Error(`Missing required env vars: ${missing.join(', ')}`);
  }
}

function envVal(key: string): string {
  return String(process.env[key]).trim();
}

function titleCaseFromKey(key: string) {
  return key
    .toLowerCase()
    .split('_')
    .map((part) => (part ? part[0].toUpperCase() + part.slice(1) : part))
    .join(' ');
}

async function upsertPosition(tx: DbExecutor, key: 'SUPER_ADMIN' | 'ADMIN') {
  const displayName = titleCaseFromKey(key);
  const desired = {
    displayName,
    defaultScope: 'GLOBAL' as const,
    singleton: true,
    description: displayName,
  };

  const [existing] = await tx.select().from(positions).where(eq(positions.key, key)).limit(1);
  if (!existing) {
    const [created] = await tx
      .insert(positions)
      .values({ key, ...desired })
      .returning();
    return { position: created, action: 'created' as UpsertOutcome };
  }

  const updates: Partial<typeof positions.$inferInsert> = {};
  if (existing.displayName !== desired.displayName) updates.displayName = desired.displayName;
  if (existing.defaultScope !== desired.defaultScope) updates.defaultScope = desired.defaultScope;
  if (existing.singleton !== desired.singleton) updates.singleton = desired.singleton;
  if (existing.description !== desired.description) updates.description = desired.description;

  if (Object.keys(updates).length === 0) {
    return { position: existing, action: 'unchanged' as UpsertOutcome };
  }

  const [updated] = await tx
    .update(positions)
    .set(updates)
    .where(eq(positions.id, existing.id))
    .returning();
  return { position: updated, action: 'updated' as UpsertOutcome };
}

async function upsertUser(tx: DbExecutor, seed: SeedUserInput) {
  const username = seed.username.trim().toLowerCase();
  const email = seed.email.trim().toLowerCase();
  const phone = seed.phone.trim();
  const name = seed.name.trim();
  const rank = seed.rank.trim();

  const [byUsername] = await tx
    .select()
    .from(users)
    .where(eq(sql`lower(${users.username})`, username))
    .limit(1);
  const [byEmail] = await tx
    .select()
    .from(users)
    .where(eq(sql`lower(${users.email})`, email))
    .limit(1);

  if (byUsername && byEmail && byUsername.id !== byEmail.id) {
    throw new Error(`Conflicting user records for username ${username} and email ${email}.`);
  }

  const existing = byUsername ?? byEmail;
  if (!existing) {
    const [created] = await tx
      .insert(users)
      .values({
        username,
        email,
        phone,
        name,
        rank,
        isActive: true,
      })
      .returning();
    return { user: created, action: 'created' as UpsertOutcome };
  }

  const updates: Partial<typeof users.$inferInsert> = {};
  if (existing.email !== email) updates.email = email;
  if (existing.phone !== phone) updates.phone = phone;
  if (existing.name !== name) updates.name = name;
  if (existing.rank !== rank) updates.rank = rank;
  if (!existing.isActive) updates.isActive = true;
  if (existing.deletedAt) updates.deletedAt = null;
  if (existing.deactivatedAt) updates.deactivatedAt = null;

  if (Object.keys(updates).length === 0) {
    return { user: existing, action: 'unchanged' as UpsertOutcome };
  }

  updates.updatedAt = new Date();

  const [updated] = await tx
    .update(users)
    .set(updates)
    .where(eq(users.id, existing.id))
    .returning();
  return { user: updated, action: 'updated' as UpsertOutcome };
}

async function upsertCredentials(tx: DbExecutor, userId: string, password: string): Promise<UpsertOutcome> {
  const hash = await argon2.hash(password, ARGON2_OPTS);
  const [cred] = await tx.select().from(credentialsLocal).where(eq(credentialsLocal.userId, userId)).limit(1);

  if (!cred) {
    await tx.insert(credentialsLocal).values({
      userId,
      passwordHash: hash,
      passwordAlgo: 'argon2id',
      passwordUpdatedAt: new Date(),
    });
    return 'created';
  }

  await tx
    .update(credentialsLocal)
    .set({
      passwordHash: hash,
      passwordAlgo: 'argon2id',
      passwordUpdatedAt: new Date(),
    })
    .where(eq(credentialsLocal.userId, userId));
  return 'updated';
}

async function ensureActiveAppointment(tx: DbExecutor, userId: string, positionId: string) {
  const scopeType = 'GLOBAL' as const;
  const scopeId: string | null = null;

  const [existing] = await tx
    .select()
    .from(appointments)
    .where(
      and(
        eq(appointments.userId, userId),
        eq(appointments.positionId, positionId),
        eq(appointments.assignment, 'PRIMARY'),
        eq(appointments.scopeType, scopeType),
        isNull(appointments.deletedAt),
        isNull(appointments.endsAt)
      )
    )
    .limit(1);

  if (existing) {
    const updates: Partial<typeof appointments.$inferInsert> = {};
    if (existing.scopeId !== scopeId) updates.scopeId = scopeId;
    if (Object.keys(updates).length === 0) {
      return { id: existing.id, action: 'unchanged' as UpsertOutcome };
    }

    const [updated] = await tx
      .update(appointments)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(appointments.id, existing.id))
      .returning({ id: appointments.id });

    return { id: updated.id, action: 'updated' as UpsertOutcome };
  }

  const [created] = await tx
    .insert(appointments)
    .values({
      userId,
      positionId,
      assignment: 'PRIMARY',
      scopeType,
      scopeId,
      startsAt: new Date(),
      endsAt: null,
      appointedBy: userId,
      reason: 'bootstrap seed',
    })
    .returning({ id: appointments.id });

  return { id: created.id, action: 'created' as UpsertOutcome };
}

async function seedSingle(tx: DbExecutor, seed: SeedUserInput) {
  const positionRes = await upsertPosition(tx, seed.positionKey);
  const userRes = await upsertUser(tx, seed);
  const credentialAction = await upsertCredentials(tx, userRes.user.id, seed.password);
  const appointmentRes = await ensureActiveAppointment(tx, userRes.user.id, positionRes.position.id);

  return {
    label: seed.positionKey,
    user: userRes.user,
    userAction: userRes.action,
    positionAction: positionRes.action,
    credentialAction,
    appointmentAction: appointmentRes.action,
    appointmentId: appointmentRes.id,
  };
}

export async function seedAdminUser() {
  validateEnv();

  const seeds = {
    superAdmin: {
      username: envVal('SUPERADMIN_USERNAME'),
      password: envVal('SUPERADMIN_PASSWORD'),
      email: envVal('SUPERADMIN_EMAIL'),
      phone: envVal('SUPERADMIN_PHONE'),
      name: envVal('SUPERADMIN_NAME'),
      rank: envVal('SUPERADMIN_RANK'),
      positionKey: 'SUPER_ADMIN' as const,
    },
    admin: {
      username: envVal('ADMIN_USERNAME'),
      password: envVal('ADMIN_PASSWORD'),
      email: envVal('ADMIN_EMAIL'),
      phone: envVal('ADMIN_PHONE'),
      name: envVal('ADMIN_NAME'),
      rank: envVal('ADMIN_RANK'),
      positionKey: 'ADMIN' as const,
    },
  };

  const result = await db.transaction(async (tx) => {
    const superAdmin = await seedSingle(tx, seeds.superAdmin);
    const admin = await seedSingle(tx, seeds.admin);
    return { superAdmin, admin };
  });

  console.log('Seeded admin accounts and appointments:');
  console.log(
    `  SUPER_ADMIN (${result.superAdmin.user.username}): user ${result.superAdmin.userAction}, credentials ${result.superAdmin.credentialAction}, position ${result.superAdmin.positionAction}, appointment ${result.superAdmin.appointmentAction} (${result.superAdmin.appointmentId})`
  );
  console.log(
    `  ADMIN (${result.admin.user.username}): user ${result.admin.userAction}, credentials ${result.admin.credentialAction}, position ${result.admin.positionAction}, appointment ${result.admin.appointmentAction} (${result.admin.appointmentId})`
  );
}

if (require.main === module) {
  seedAdminUser()
    .then(() => {
      console.log('Done.');
      process.exit(0);
    })
    .catch((err) => {
      console.error('Failed to seed admin users:', err);
      process.exit(1);
    });
}
