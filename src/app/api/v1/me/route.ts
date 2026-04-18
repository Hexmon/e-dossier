import { json, handleApiError } from '@/app/lib/http';
import { requireAuth } from '@/app/lib/guard';
import { db } from '@/app/db/client';
import { users } from '@/app/db/schema/auth/users';
import { eq } from 'drizzle-orm';
import { getEffectivePermissionBundleCached } from '@/app/db/queries/authz-permissions';
import {
  listMarksWorkflowAssignmentsForUser,
  getWorkflowModuleSettings,
} from '@/app/services/marksReviewWorkflow';
import { resolveModuleAccessForUser } from '@/app/lib/module-access';
import {
  withAuditRoute,
  AuditEventType,
  AuditResourceType,
} from '@/lib/audit';
import type { AuditNextRequest } from '@/lib/audit';
import { canManageCadetAppointments } from '@/lib/platoon-commander-access';

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
    const authzBundle = await getEffectivePermissionBundleCached({
      userId: principal.userId,
      roles: principal.roles ?? [],
      apt: (principal.apt ?? undefined) as {
        id?: string;
        position?: string;
        scope?: { type?: string; id?: string | null };
      },
    });

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

    const [workflowAssignments, academicsWorkflow, ptWorkflow] = await Promise.all([
      listMarksWorkflowAssignmentsForUser({
        userId: principal.userId,
        roles: principal.roles ?? [],
      }),
      getWorkflowModuleSettings('ACADEMICS_BULK'),
      getWorkflowModuleSettings('PT_BULK'),
    ]);
    const moduleAccess = await resolveModuleAccessForUser({
      userId: principal.userId,
      roles: principal.roles ?? [],
      position:
        typeof (principal.apt as any)?.position === 'string'
          ? String((principal.apt as any).position)
          : null,
      workflowAssignments,
    });
    const cadetAppointmentsScopeType =
      typeof (principal.apt as any)?.scope?.type === 'string'
        ? String((principal.apt as any).scope.type)
        : null;
    const canManageCadetAppointmentsFeature = canManageCadetAppointments({
      roles: principal.roles ?? [],
      position:
        typeof (principal.apt as any)?.position === 'string'
          ? String((principal.apt as any).position)
          : null,
      scopeType: cadetAppointmentsScopeType,
    });

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

    return json.ok({
      message: 'User retrieved successfully.',
      user: u,
      roles: principal.roles,
      apt: principal.apt ?? null,
      cadetAppointments: {
        canManage: canManageCadetAppointmentsFeature,
      },
      authority: {
        kind: (principal.apt as any)?.auth_kind ?? 'APPOINTMENT',
        delegationId: (principal.apt as any)?.delegation_id ?? null,
        grantorUserId: (principal.apt as any)?.grantor_user_id ?? null,
        grantorUsername: (principal.apt as any)?.grantor_username ?? null,
      },
      workflowAssignments,
      workflowModules: {
        ACADEMICS_BULK: { isActive: academicsWorkflow.isActive },
        PT_BULK: { isActive: ptWorkflow.isActive },
      },
      moduleAccess: {
        canAccessDossier: moduleAccess.canAccessDossier,
        canAccessBulkUpload: moduleAccess.canAccessBulkUpload,
        canAccessReports: moduleAccess.canAccessReports,
        canAccessAcademicsBulk: moduleAccess.canAccessAcademicsBulk,
        canAccessPtBulk: moduleAccess.canAccessPtBulk,
      },
      permissions: authzBundle?.permissions ?? [],
      deniedPermissions: authzBundle?.deniedPermissions ?? [],
      policyVersion: authzBundle?.policyVersion ?? null,
    });
  } catch (err) {
    return handleApiError(err);
  }
}
export const GET = withAuditRoute('GET', GETHandler);
