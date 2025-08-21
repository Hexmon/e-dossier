// src/app/db/seeds/seedAdminUser.ts
import { db } from '../client';
import { users } from '../schema/auth/users';
import { credentialsLocal } from '../schema/auth/credentials';
import { roles, userRoles } from '../schema/auth/rbac';
import { eq, and, ilike } from 'drizzle-orm';
import argon2 from 'argon2';

export async function seedAdminUser() {
  const username = 'superadmin';
  const email = 'admin@example.com';

  // Case-insensitive username check (Postgres)
  let [admin] = await db
    .select()
    .from(users)
    .where(ilike(users.username, username))
    .limit(1);

  if (!admin) {
    // Insert user — include all NOT NULL fields
    const [inserted] = await db
      .insert(users)
      .values({
        // id omitted => uses defaultRandom()
        username: username.toLowerCase(),
        email: email.toLowerCase(),
        phone: 'N/A',          // <— provide something valid for your domain
        name: 'Super Admin',
        usertype: 'admin',     // <— fits your RBAC scheme
        rank: 'super',         // <— or any initial rank your app expects
        // isActive defaults to true; createdAt/updatedAt default via schema
      })
      .returning({ id: users.id });

    const hash = await argon2.hash('ChangeMe!123');
    await db.insert(credentialsLocal).values({
      userId: inserted.id,
      passwordHash: hash,
      passwordAlgo: 'argon2id',
    });

    // Refresh admin for later use
    [admin] = await db.select().from(users).where(eq(users.id, inserted.id));
  }

  // Ensure admin role link exists
  const [adminRole] = await db.select().from(roles).where(eq(roles.key, 'admin')).limit(1);

  if (adminRole) {
    const [link] = await db
      .select()
      .from(userRoles)
      .where(and(eq(userRoles.userId, admin.id), eq(userRoles.roleId, adminRole.id)))
      .limit(1);

    if (!link) {
      await db
        .insert(userRoles)
        .values({ userId: admin.id, roleId: adminRole.id })
        .onConflictDoNothing();
    }
  } else {
    // Optional: create the admin role if your seed flow expects it
    // await db.insert(roles).values({ key: 'admin', description: 'Administrator' });
  }
}
