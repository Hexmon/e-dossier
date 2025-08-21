// src/app/db/seeds/seedAdminUser.ts
import { db } from '../client';
import { users } from '../schema/auth/users';
import { credentialsLocal } from '../schema/auth/credentials';
import { roles, userRoles } from '../schema/auth/rbac';
import { eq, and, sql } from 'drizzle-orm';
import { randomUUID } from 'crypto';
import argon2 from 'argon2';

export async function seedAdminUser() {
  const username = 'superadmin';
  const email = 'admin@example.com';

  let [admin] = await db.select().from(users)
    .where(sql`lower(${users.username}) = ${username}`);   // FIX: case-insensitive

  if (!admin) {
    const id = randomUUID();
    await db.insert(users).values({
      id,
      username: username.toLowerCase(),
      email: email.toLowerCase(),
      name: 'Super Admin',
      isActive: true,
    });
    const hash = await argon2.hash('ChangeMe!123');
    await db.insert(credentialsLocal).values({
      userId: id, passwordHash: hash, passwordAlgo: 'argon2id',
    });

    [admin] = await db.select().from(users).where(eq(users.id, id));
  }

  const [adminRole] = await db.select().from(roles).where(eq(roles.key, 'admin'));
  const [link] = await db.select().from(userRoles)
    .where(and(eq(userRoles.userId, admin.id), eq(userRoles.roleId, adminRole.id)));
  if (!link) {
    await db.insert(userRoles)
      .values({ userId: admin.id, roleId: adminRole.id })
      .onConflictDoNothing();
  }
}
