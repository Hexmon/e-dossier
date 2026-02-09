import { NextRequest } from 'next/server';
import { z } from 'zod';
import { json, handleApiError, ApiError } from '@/app/lib/http';
import { mustBeAuthed } from '../../../_checks';
import { parseParam, ensureOcExists } from '../../../_checks';
import { OcIdParam } from '@/app/lib/oc-validators';
import { getOlqById } from '@/app/db/queries/olq';
import { withRouteLogging } from '@/lib/withRouteLogging';

// NOTE: Read-only view; createAuditLog is already invoked globally via requireAuth/logApiRequest.

const IdParam = z.object({ id: z.string().uuid() });
const BoolString = z.enum(['true', 'false']).transform((v) => v === 'true');

async function GETHandler(req: NextRequest, { params }: { params: Promise<{ ocId: string }> }) {
    try {
        await mustBeAuthed(req);
        const { ocId } = await parseParam({params}, OcIdParam);
        await ensureOcExists(ocId);
        const { id } = IdParam.parse({params});
        const sp = new URL(req.url).searchParams;
        const includeCategories = BoolString.optional().parse(sp.get('includeCategories') ?? undefined) ?? true;

        const row = await getOlqById(id, includeCategories);
        if (!row || row.ocId !== ocId) {
            throw new ApiError(404, 'OLQ record not found', 'not_found');
        }
        return json.ok({ message: 'OLQ record retrieved successfully.', data: row });
    } catch (err) {
        return handleApiError(err);
    }
}
export const GET = withRouteLogging('GET', GETHandler);
