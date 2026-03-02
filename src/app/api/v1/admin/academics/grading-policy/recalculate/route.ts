import { withAuthz } from '@/app/lib/acx/withAuthz';
import { requireAdmin } from '@/app/lib/authz';
import { handleApiError, json } from '@/app/lib/http';
import { academicGradingPolicyRecalculateSchema } from '@/app/lib/validators.academic-grading-policy';
import { recalculateAcademicGrading } from '@/app/services/academic-grading-recalculate';
import { AuditEventType, AuditResourceType, type AuditNextRequest, withAuditRoute } from '@/lib/audit';

export const runtime = 'nodejs';

async function POSTHandler(req: AuditNextRequest) {
  try {
    const auth = await requireAdmin(req);
    const dto = academicGradingPolicyRecalculateSchema.parse(await req.json());

    const result = await recalculateAcademicGrading({
      dryRun: dto.dryRun,
      scope: dto.scope,
      courseIds: dto.courseIds,
    });

    await req.audit.log({
      action: AuditEventType.OC_RECORD_UPDATED,
      outcome: 'SUCCESS',
      actor: { type: 'user', id: auth.userId },
      target: { type: AuditResourceType.API, id: '/api/v1/admin/academics/grading-policy/recalculate' },
      metadata: {
        description: dto.dryRun ? 'Academic grading recalculation preview executed' : 'Academic grading recalculation applied',
        dryRun: result.dryRun,
        scope: result.scope,
        courseIdsCount: dto.courseIds?.length ?? 0,
        scannedRows: result.scannedRows,
        changedRows: result.changedRows,
        changedGradeFields: result.changedGradeFields,
        changedSummaryRows: result.changedSummaryRows,
      },
    });

    return json.ok({
      message: dto.dryRun
        ? 'Academic grading recalculation preview completed.'
        : 'Academic grading recalculation applied successfully.',
      ...result,
    });
  } catch (error) {
    return handleApiError(error);
  }
}

export const POST = withAuditRoute('POST', withAuthz(POSTHandler));
