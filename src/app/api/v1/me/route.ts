import { NextRequest } from 'next/server';
import { json, handleApiError } from '@/app/lib/http';
import { requireAuth } from '@/app/lib/guard';
import { db } from '@/app/db/client';
import { users } from '@/app/db/schema/auth/users';
import { eq } from 'drizzle-orm';
import { createAuditLog, AuditEventType, AuditResourceType } from '@/lib/audit-log';
import { withRouteLogging } from '@/lib/withRouteLogging';

async function GETHandler(req: NextRequest) {
  try {
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

    await createAuditLog({
      actorUserId: principal.userId,
      eventType: AuditEventType.API_REQUEST,
      resourceType: AuditResourceType.USER,
      resourceId: principal.userId,
      description: 'Retrieved current user profile via /api/v1/me',
      metadata: {
        roles: principal.roles,
      },
      request: req,
    });

    return json.ok({ message: 'User retrieved successfully.', user: u, roles: principal.roles, apt: principal.apt ?? null });
  } catch (err) {
    return handleApiError(err);
  }
}
export const GET = withRouteLogging('GET', GETHandler);
