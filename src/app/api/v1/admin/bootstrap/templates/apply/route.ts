import { handleApiError, json } from '@/app/lib/http';
import { withAuthz } from '@/app/lib/acx/withAuthz';
import { requireAdmin } from '@/app/lib/authz';
import { applyPtTemplateProfile } from '@/app/lib/bootstrap/pt-template';
import { applyCampTemplateProfile } from '@/app/lib/bootstrap/camp-template';
import { applyPlatoonTemplateProfile } from '@/app/lib/bootstrap/platoon-template';
import { applyAppointmentTemplateProfile } from '@/app/lib/bootstrap/appointment-template';
import { applyOrgTemplateSchema } from '@/app/lib/validators.bootstrap';
import { withAuditRoute } from '@/lib/audit';
import type { AuditNextRequest } from '@/lib/audit';

export const runtime = 'nodejs';

async function POSTHandler(req: AuditNextRequest) {
  try {
    const authCtx = await requireAdmin(req);
    const body = applyOrgTemplateSchema.parse(await req.json());

    if (body.module === 'pt') {
      const result = await applyPtTemplateProfile({
        profile: body.profile ?? 'default',
        dryRun: body.dryRun ?? false,
        actorUserId: authCtx.userId,
      });

      return json.ok({
        message: result.dryRun
          ? 'PT template dry run completed.'
          : 'PT template applied successfully.',
        ...result,
      });
    }

    if (body.module === 'camp') {
      const result = await applyCampTemplateProfile({
        profile: body.profile ?? 'default',
        dryRun: body.dryRun ?? false,
        actorUserId: authCtx.userId,
      });

      return json.ok({
        message: result.dryRun
          ? 'Camp template dry run completed.'
          : 'Camp template applied successfully.',
        ...result,
      });
    }

    if (body.module === 'platoon') {
      const result = await applyPlatoonTemplateProfile({
        profile: body.profile ?? 'default',
        dryRun: body.dryRun ?? false,
        actorUserId: authCtx.userId,
      });

      return json.ok({
        message: result.dryRun
          ? 'Platoon template dry run completed.'
          : 'Platoon template applied successfully.',
        ...result,
      });
    }

    if (body.module === 'appointment') {
      const result = await applyAppointmentTemplateProfile({
        profile: body.profile ?? 'default',
        dryRun: body.dryRun ?? false,
        actorUserId: authCtx.userId,
      });

      return json.ok({
        message: result.dryRun
          ? 'Appointment template dry run completed.'
          : 'Appointment template applied successfully.',
        ...result,
      });
    }

    return json.badRequest('Unsupported template module');
  } catch (error) {
    return handleApiError(error);
  }
}

export const POST = withAuditRoute('POST', withAuthz(POSTHandler));
