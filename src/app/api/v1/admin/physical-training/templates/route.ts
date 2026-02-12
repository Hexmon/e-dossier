import { json, handleApiError } from '@/app/lib/http';

export const runtime = 'nodejs';
import { withAuthz } from '@/app/lib/acx/withAuthz';
import { requireAuth } from '@/app/lib/authz';
import { ptTemplateQuerySchema } from '@/app/lib/physical-training-validators';
import { getPtTemplateBySemester } from '@/app/db/queries/physicalTraining';
import { withAuditRoute } from '@/lib/audit';
import type { AuditNextRequest } from '@/lib/audit';

async function GETHandler(req: AuditNextRequest) {
    try {
        await requireAuth(req);
        const sp = new URL(req.url).searchParams;
        const qp = ptTemplateQuerySchema.parse({
            semester: sp.get('semester') ?? undefined,
            includeDeleted: sp.get('includeDeleted') ?? undefined,
        });

        const data = await getPtTemplateBySemester(qp.semester, { includeDeleted: qp.includeDeleted ?? false });
        return json.ok({ message: 'PT template retrieved successfully.', data });
    } catch (err) {
        return handleApiError(err);
    }
}

export const GET = withAuditRoute('GET', withAuthz(GETHandler));
