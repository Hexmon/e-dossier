import { json, handleApiError } from '@/app/lib/http';
import { requireAuth } from '@/app/lib/guard';
import { db } from '@/app/db/client';
import { users } from '@/app/db/schema/auth/users';
import { eq } from 'drizzle-orm';
import {
  withAuditRoute,
  AuditEventType,
  AuditResourceType,
} from '@/lib/audit';
import type { AuditNextRequest } from '@/lib/audit';

async function GETHandler(req: AuditNextRequest) {
  try {
    const cookieHeader = req.headers.get('cookie') ?? '';
    const cookieNames = cookieHeader
      ? cookieHeader
          .split(';')
          .map((c) => c.split('=')[0]?.trim())
          .filter(Boolean)
      : [];

    const principal = await requireAuth(req);

    const [u] = await db
      .select({
        id: users.id,
        username: users.username,
        email: users.email,
        phone: users.phone,
        name: users.name,
        rank: users.rank,
        currentAppointmentId: users.appointId
      })
      .from(users)
      .where(eq(users.id, principal.userId));

    if (!u) return json.notFound('User not found.');

    await req.audit.log({
      action: AuditEventType.API_REQUEST,
      outcome: 'SUCCESS',
      actor: { type: 'user', id: principal.userId },
      target: { type: AuditResourceType.USER, id: principal.userId },
      metadata: {
        roles: principal.roles,
        description: 'Retrieved current user profile via /api/v1/me',
      },
    });

    return json.ok({ message: 'User retrieved successfully.', user: u, roles: principal.roles, apt: principal.apt ?? null });
  } catch (err) {
    return handleApiError(err);
  }
}
export const GET = withAuditRoute('GET', GETHandler);
