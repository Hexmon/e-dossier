import { withAuthz } from '@/app/lib/acx/withAuthz';
import { getTrainingCampSettings, updateTrainingCampSettings } from '@/app/db/queries/trainingCamps';
import { requireAdmin, requireAuth } from '@/app/lib/authz';
import { handleApiError, json } from '@/app/lib/http';
import { trainingCampSettingsSchema } from '@/app/lib/training-camp-validators';
import { AuditEventType, AuditResourceType, withAuditRoute } from '@/lib/audit';
import type { AuditNextRequest } from '@/lib/audit';

export const runtime = 'nodejs';

async function GETHandler(req: AuditNextRequest) {
  try {
    const authCtx = await requireAuth(req);
    const settings = await getTrainingCampSettings();

    await req.audit.log({
      action: AuditEventType.API_REQUEST,
      outcome: 'SUCCESS',
      actor: { type: 'user', id: authCtx.userId },
      target: { type: AuditResourceType.API, id: '/api/v1/admin/training-camps/settings' },
      metadata: {
        description: 'Fetched training camp settings',
        maxCampsPerSemester: settings.maxCampsPerSemester,
      },
    });

    return json.ok({
      message: 'Training camp settings retrieved successfully.',
      settings: {
        maxCampsPerSemester: settings.maxCampsPerSemester,
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}

async function PATCHHandler(req: AuditNextRequest) {
  try {
    const adminCtx = await requireAdmin(req);
    const dto = trainingCampSettingsSchema.parse(await req.json());
    const settings = await updateTrainingCampSettings(dto);

    await req.audit.log({
      action: AuditEventType.API_REQUEST,
      outcome: 'SUCCESS',
      actor: { type: 'user', id: adminCtx.userId },
      target: { type: AuditResourceType.API, id: '/api/v1/admin/training-camps/settings' },
      metadata: {
        description: 'Updated training camp settings',
        maxCampsPerSemester: settings.maxCampsPerSemester,
      },
    });

    return json.ok({
      message: 'Training camp settings updated successfully.',
      settings: {
        maxCampsPerSemester: settings.maxCampsPerSemester,
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}

export const GET = withAuditRoute('GET', withAuthz(GETHandler));
export const PATCH = withAuditRoute('PATCH', withAuthz(PATCHHandler));
