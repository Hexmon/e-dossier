import { getOcDataHealth } from '@/app/db/queries/oc-data-health';
import { requireAdmin } from '@/app/lib/authz';
import { handleApiError, json } from '@/app/lib/http';

export const runtime = 'nodejs';

export async function GET(req: Request) {
  try {
    await requireAdmin(req as any);
    const health = await getOcDataHealth();
    return json.ok({ health });
  } catch (error) {
    return handleApiError(error);
  }
}
