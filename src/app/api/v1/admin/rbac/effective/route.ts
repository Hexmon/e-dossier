import { NextRequest } from 'next/server';
import { requireAdmin } from '@/app/lib/authz';
import { db } from '@/app/db/client';
import { appointments } from '@/app/db/schema/auth/appointments';
import { users } from '@/app/db/schema/auth/users';
import { getEffectivePermissionBundleCached } from '@/app/db/queries/authz-permissions';
import { ApiError, handleApiError, json } from '@/app/lib/http';
import { withAuditRoute, AuditEventType, AuditResourceType, type AuditNextRequest } from '@/lib/audit';
import { withAuthz } from '@/app/lib/acx/withAuthz';
import { and, eq, isNull, sql } from 'drizzle-orm';

export const runtime = 'nodejs';

async function GETHandler(req: AuditNextRequest) {
  try {
    const authCtx = await requireAdmin(req as NextRequest);
    const sp = new URL(req.url).searchParams;
    const userId = sp.get('userId')?.trim() || authCtx.userId;
    const appointmentId = sp.get('appointmentId')?.trim() || undefined;
    const isSelf = userId === authCtx.userId;

    const [targetUser] = await db
      .select({ id: users.id })
      .from(users)
      .where(and(eq(users.id, userId), isNull(users.deletedAt)))
      .limit(1);
    if (!targetUser) {
      throw new ApiError(404, 'User not found for RBAC effective preview.', 'not_found');
    }

    if (appointmentId) {
      const [targetAppointment] = await db
        .select({ id: appointments.id })
        .from(appointments)
        .where(
          and(
            eq(appointments.id, appointmentId),
            eq(appointments.userId, userId),
            isNull(appointments.deletedAt),
            sql`${appointments.startsAt} <= now()`,
            sql`(${appointments.endsAt} IS NULL OR ${appointments.endsAt} > now())`
          )
        )
        .limit(1);
      if (!targetAppointment) {
        throw new ApiError(
          404,
          'Appointment does not belong to the target user or is not active.',
          'not_found'
        );
      }
    }

    const bundle = await getEffectivePermissionBundleCached({
      userId,
      roles: isSelf ? authCtx.roles : [],
      apt: appointmentId
        ? { id: appointmentId }
        : isSelf
          ? (authCtx.claims?.apt as any)
          : undefined,
    });

    await req.audit.log({
      action: AuditEventType.API_REQUEST,
      outcome: 'SUCCESS',
      actor: { type: 'user', id: authCtx.userId },
      target: { type: AuditResourceType.PERMISSION, id: userId },
      metadata: {
        description: 'RBAC effective permissions preview retrieved.',
        userId,
        appointmentId: appointmentId ?? null,
      },
    });

    return json.ok({
      message: 'Effective RBAC permissions retrieved successfully.',
      bundle,
    });
  } catch (error) {
    return handleApiError(error);
  }
}

export const GET = withAuditRoute('GET', withAuthz(GETHandler));
