import { NextRequest } from 'next/server';
import { json, handleApiError } from '@/app/lib/http';
import { mustBeAuthed } from '../../../../_checks';
import { parseParam, ensureOcExists } from '../../../_checks';
import { OcIdParam } from '@/app/lib/oc-validators';
import { olqBySemesterQuerySchema } from '@/app/lib/olq-validators';
import { listOlqBySemester } from '@/app/db/queries/olq';
import { withRouteLogging } from '@/lib/withRouteLogging';

// NOTE: Read-only endpoint – rely on mustBeAuthed -> logApiRequest for createAuditLog coverage.

async function GETHandler(req: NextRequest, { params }: { params: Promise<{ ocId: string }> }) {
    try {
        await mustBeAuthed(req);
        const { ocId } = await parseParam({params}, OcIdParam);
        await ensureOcExists(ocId);

        const sp = new URL(req.url).searchParams;
        const qp = olqBySemesterQuerySchema.parse({
            semester: sp.get('semester') ?? undefined,
            ocId, // override to enforce path ocId
            categoryId: sp.get('categoryId') ?? undefined,
            subtitleId: sp.get('subtitleId') ?? undefined,
        });

        const items = await listOlqBySemester({
            semester: qp.semester,
            ocId: qp.ocId,
            categoryId: qp.categoryId,
            subtitleId: qp.subtitleId,
        });
        return json.ok({ message: 'OLQ records for semester retrieved successfully.', items, count: items.length });
    } catch (err) {
        return handleApiError(err);
    }
}
export const GET = withRouteLogging('GET', GETHandler);
