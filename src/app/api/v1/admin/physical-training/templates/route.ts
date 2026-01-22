import { NextRequest } from 'next/server';
import { json, handleApiError } from '@/app/lib/http';
import { requireAuth } from '@/app/lib/authz';
import { ptTemplateQuerySchema } from '@/app/lib/physical-training-validators';
import { getPtTemplateBySemester } from '@/app/db/queries/physicalTraining';
import { withRouteLogging } from '@/lib/withRouteLogging';

async function GETHandler(req: NextRequest) {
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

export const GET = withRouteLogging('GET', GETHandler);
