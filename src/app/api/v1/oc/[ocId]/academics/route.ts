import { json, handleApiError } from '@/app/lib/http';
import { parseParam, ensureOcExists, mustBeAuthed } from '../../_checks';
import { OcIdParam } from '@/app/lib/oc-validators';
import { getOcAcademics } from '@/app/services/oc-academics';
import { withAuditRoute, AuditEventType, AuditResourceType } from '@/lib/audit';
import type { AuditNextRequest } from '@/lib/audit';

async function GETHandler(req: AuditNextRequest, { params }: { params: Promise<{ ocId: string }> }) {
    try {
        const { ocId } = await parseParam({ params }, OcIdParam);
        await ensureOcExists(ocId);
        const authCtx = await mustBeAuthed(req);
        const sp = new URL(req.url).searchParams;
        const semester = sp.get('semester') ? Number(sp.get('semester')) : undefined;
        const semesters = await getOcAcademics(ocId, { semester });

        await req.audit.log({
            action: AuditEventType.API_REQUEST,
            outcome: 'SUCCESS',
            actor: { type: 'user', id: authCtx.userId },
            target: { type: AuditResourceType.OC, id: ocId },
            metadata: {
                description: `Academic records retrieved successfully for OC ${ocId}`,
                ocId,
                module: 'academics',
                semester: semester ?? null,
                count: semesters.length,
            },
        });

        return json.ok({
            message: 'Academic records retrieved successfully.',
            items: semesters,
            count: semesters.length,
        });
    } catch (err) {
        return handleApiError(err);
    }
}
export const GET = withAuditRoute('GET', GETHandler);
