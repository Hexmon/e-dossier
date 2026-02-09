import { z } from 'zod';
import { json, handleApiError, ApiError } from '@/app/lib/http';
import { mustBeAuthed } from '../../../_checks';
import { parseParam, ensureOcExists } from '../../../_checks';
import { OcIdParam } from '@/app/lib/oc-validators';
import { getOlqById } from '@/app/db/queries/olq';
import { withAuditRoute, AuditEventType, AuditResourceType } from '@/lib/audit';
import type { AuditNextRequest } from '@/lib/audit';

const IdParam = z.object({ id: z.string().uuid() });
const BoolString = z.enum(['true', 'false']).transform((v) => v === 'true');

async function GETHandler(req: AuditNextRequest, { params }: { params: Promise<{ ocId: string }> }) {
    try {
        const authCtx = await mustBeAuthed(req);
        const { ocId } = await parseParam({params}, OcIdParam);
        await ensureOcExists(ocId);
        const { id } = await parseParam({params}, IdParam);
        const sp = new URL(req.url).searchParams;
        const includeCategories = BoolString.optional().parse(sp.get('includeCategories') ?? undefined) ?? true;

        const row = await getOlqById(id, includeCategories);
        if (!row || row.ocId !== ocId) {
            throw new ApiError(404, 'OLQ record not found', 'not_found');
        }

        await req.audit.log({
            action: AuditEventType.API_REQUEST,
            outcome: 'SUCCESS',
            actor: { type: 'user', id: authCtx.userId },
            target: { type: AuditResourceType.OC, id: ocId },
            metadata: {
                description: `OLQ record ${id} retrieved successfully for OC ${ocId}`,
                ocId,
                module: 'olq',
                recordId: id,
                includeCategories,
            },
        });

        return json.ok({ message: 'OLQ record retrieved successfully.', data: row });
    } catch (err) {
        return handleApiError(err);
    }
}
export const GET = withAuditRoute('GET', GETHandler);
