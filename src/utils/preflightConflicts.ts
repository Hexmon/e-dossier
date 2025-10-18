import { and, or, isNull, eq } from 'drizzle-orm';
import { users } from '@/app/db/schema/auth/users';
import { db } from '@/app/db/client';

export async function preflightConflicts(username: string, email: string, phone: string) {
  const rows = await db.select({
    id: users.id,
    username: users.username,
    email: users.email,
    phone: users.phone,
  })
    .from(users)
    .where(and(
      isNull(users.deletedAt),
      or(
        eq(users.username as any, username),
        eq(users.email as any, email),
        eq(users.phone, phone)
      )
    ));

  const conflicts: Array<'username' | 'email' | 'phone'> = [];
  for (const r of rows) {
    if ((r.username ?? '').toLowerCase() === username.toLowerCase()) conflicts.push('username');
    if ((r.email ?? '').toLowerCase() === email.toLowerCase()) conflicts.push('email');
    if (r.phone === phone) conflicts.push('phone');
  }
  return Array.from(new Set(conflicts));
}
