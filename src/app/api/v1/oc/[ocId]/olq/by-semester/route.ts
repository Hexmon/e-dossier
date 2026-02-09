import { json, handleApiError } from '@/app/lib/http';
import { parseParam, ensureOcExists, mustBeAuthed } from '../../../_checks';
import { OcIdParam } from '@/app/lib/oc-validators';
import { olqBySemesterQuerySchema } from '@/app/lib/olq-validators';
import { listOlqBySemester } from '@/app/db/queries/olq';
import { withAuditRoute, AuditEventType, AuditResourceType } from '@/lib/audit';
import type { AuditNextRequest } from '@/lib/audit';

async function GETHandler(req: AuditNextRequest, { params }: { params: Promise<{ ocId: string }> }) {
    try {
        const authCtx = await mustBeAuthed(req);
        const { ocId } = await parseParam({params}, OcIdParam);
        await ensureOcExists(ocId);

        const sp = new URL(req.url).searchParams;
        const qp = olqBySemesterQuerySchema.parse({
            semester: sp.get('semester') ?? undefined,
            ocId,
            categoryId: sp.get('categoryId') ?? undefined,
            subtitleId: sp.get('subtitleId') ?? undefined,
        });

        const items = await listOlqBySemester({
            semester: qp.semester,
            ocId: qp.ocId,
            categoryId: qp.categoryId,
            subtitleId: qp.subtitleId,
        });

        await req.audit.log({
            action: AuditEventType.API_REQUEST,
            outcome: 'SUCCESS',
            actor: { type: 'user', id: authCtx.userId },
            target: { type: AuditResourceType.OC, id: ocId },
            metadata: {
                description: `OLQ semester list retrieved successfully for OC ${ocId}`,
                ocId,
                module: 'olq',
                semester: qp.semester,
                categoryId: qp.categoryId,
                subtitleId: qp.subtitleId,
                count: items.length,
            },
        });

        return json.ok({ message: 'OLQ records for semester retrieved successfully.', items, count: items.length });
    } catch (err) {
        return handleApiError(err);
    }
}
export const GET = withAuditRoute('GET', GETHandler);
