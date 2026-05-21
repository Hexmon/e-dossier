import { getOcDataHealth } from '@/app/db/queries/oc-data-health';
import { requireAdmin } from '@/app/lib/authz';
import { handleApiError, json } from '@/app/lib/http';
import { withAuditRoute, type AuditNextRequest } from '@/lib/audit';

export const runtime = 'nodejs';

async function GETHandler(req: AuditNextRequest) {
  try {
    await requireAdmin(req as any);
    const health = await getOcDataHealth();
    return json.ok({ health });
  } catch (error) {
    return handleApiError(error);
  }
}

export const GET = withAuditRoute('GET', GETHandler);
