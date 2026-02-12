import { json, handleApiError } from '@/app/lib/http';
import { parseParam, ensureOcExists } from '../../_checks';
import { OcIdParam, Semester } from '@/app/lib/oc-validators';
import { authorizeOcAccess } from '@/lib/authorization';
import { getOcAcademics } from '@/app/services/oc-academics';
import { withAuditRoute, AuditEventType, AuditResourceType } from '@/lib/audit';
import type { AuditNextRequest } from '@/lib/audit';
import { z } from 'zod';

const academicsListQuerySchema = z.object({
    semester: Semester.optional(),
});

async function GETHandler(req: AuditNextRequest, { params }: { params: Promise<{ ocId: string }> }) {
    try {
        const { ocId } = await parseParam({ params }, OcIdParam);
        await ensureOcExists(ocId);
        const authCtx = await authorizeOcAccess(req, ocId);
        const sp = new URL(req.url).searchParams;
        const { semester } = academicsListQuerySchema.parse({
            semester: sp.get('semester') ?? undefined,
        });
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
