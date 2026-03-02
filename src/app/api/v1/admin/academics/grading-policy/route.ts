import { withAuthz } from '@/app/lib/acx/withAuthz';
import { requireAdmin } from '@/app/lib/authz';
import { getOrCreateAcademicGradingPolicy, updateAcademicGradingPolicy } from '@/app/db/queries/academicGradingPolicy';
import { handleApiError, json } from '@/app/lib/http';
import { academicGradingPolicyUpdateSchema } from '@/app/lib/validators.academic-grading-policy';
import { AuditEventType, AuditResourceType, computeDiff, type AuditNextRequest, withAuditRoute } from '@/lib/audit';

export const runtime = 'nodejs';

async function GETHandler(req: AuditNextRequest) {
  try {
    const auth = await requireAdmin(req);
    const settings = await getOrCreateAcademicGradingPolicy();

    await req.audit.log({
      action: AuditEventType.API_REQUEST,
      outcome: 'SUCCESS',
      actor: { type: 'user', id: auth.userId },
      target: { type: AuditResourceType.API, id: '/api/v1/admin/academics/grading-policy' },
      metadata: {
        description: 'Fetched academic grading policy settings',
      },
    });

    return json.ok({
      message: 'Academic grading policy fetched successfully.',
      policy: settings,
    });
  } catch (error) {
    return handleApiError(error);
  }
}

async function PUTHandler(req: AuditNextRequest) {
  try {
    const auth = await requireAdmin(req);
    const dto = academicGradingPolicyUpdateSchema.parse(await req.json());
    const { before, after } = await updateAcademicGradingPolicy(dto, auth.userId);

    const { changedFields, diff } = computeDiff(before as Record<string, unknown>, after as Record<string, unknown>);
    await req.audit.log({
      action: AuditEventType.API_REQUEST,
      outcome: 'SUCCESS',
      actor: { type: 'user', id: auth.userId },
      target: { type: AuditResourceType.API, id: '/api/v1/admin/academics/grading-policy' },
      metadata: {
        description: 'Updated academic grading policy settings',
        changedFields,
        diff,
      },
    });

    return json.ok({
      message: 'Academic grading policy updated successfully.',
      policy: after,
    });
  } catch (error) {
    return handleApiError(error);
  }
}

export const GET = withAuditRoute('GET', withAuthz(GETHandler));
export const PUT = withAuditRoute('PUT', withAuthz(PUTHandler));
