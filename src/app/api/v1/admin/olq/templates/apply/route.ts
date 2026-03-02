import { requireAdmin } from '@/app/lib/authz';
import { handleApiError, json } from '@/app/lib/http';
import { withAuthz } from '@/app/lib/acx/withAuthz';
import { applyOlqDefaultTemplate } from '@/app/lib/olq/template-apply';
import { olqTemplateApplySchema } from '@/app/lib/olq-validators';
import {
  AuditEventType,
  AuditResourceType,
  type AuditNextRequest,
  withAuditRoute,
} from '@/lib/audit';

export const runtime = 'nodejs';

async function POSTHandler(req: AuditNextRequest) {
  try {
    const auth = await requireAdmin(req);
    const dto = olqTemplateApplySchema.parse(await req.json());

    const result = await applyOlqDefaultTemplate({
      scope: dto.scope,
      courseId: dto.courseId,
      dryRun: dto.dryRun ?? false,
      mode: dto.mode ?? 'replace',
      actorUserId: auth.userId,
    });

    await req.audit.log({
      action: AuditEventType.OC_RECORD_UPDATED,
      outcome: 'SUCCESS',
      actor: { type: 'user', id: auth.userId },
      target: { type: AuditResourceType.API, id: '/api/v1/admin/olq/templates/apply' },
      metadata: {
        description: `Admin ran OLQ template ${result.dryRun ? 'dry-run' : 'apply'} (${result.mode})`,
        module: 'admin_olq_templates',
        scope: result.scope,
        totalCourses: result.totalCourses,
        successCount: result.successCount,
        errorCount: result.errorCount,
        createdCount: result.createdCount,
        updatedCount: result.updatedCount,
        skippedCount: result.skippedCount,
      },
    });

    return json.ok({
      message: result.dryRun
        ? 'OLQ template dry run completed.'
        : 'OLQ template applied successfully.',
      ...result,
    });
  } catch (error) {
    return handleApiError(error);
  }
}

export const POST = withAuditRoute('POST', withAuthz(POSTHandler));
