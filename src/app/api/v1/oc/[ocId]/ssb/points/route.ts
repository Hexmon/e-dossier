import { NextRequest } from 'next/server';
import { json, handleApiError, ApiError } from '@/app/lib/http';
import { mustBeAuthed, mustBeAdmin, parseParam, ensureOcExists } from '../../../_checks';
import { OcIdParam, listQuerySchema, ssbPointCreateSchema } from '@/app/lib/oc-validators';
import { getSsbReport, listSsbPoints, createSsbPoint } from '@/app/db/queries/oc';
import { createAuditLog, AuditEventType, AuditResourceType } from '@/lib/audit-log';
import { withRouteLogging } from '@/lib/withRouteLogging';

async function GETHandler(req: NextRequest, { params }: { params: Promise<{ ocId: string }> }) {
    try {
        await mustBeAuthed(req);
        const { ocId } = await parseParam({params}, OcIdParam); await ensureOcExists(ocId);
        const report = await getSsbReport(ocId);
        if (!report) return json.ok({ items: [], count: 0 });
        const sp = new URL(req.url).searchParams;
        const qp = listQuerySchema.parse({ limit: sp.get('limit') ?? undefined, offset: sp.get('offset') ?? undefined });
        const rows = await listSsbPoints(report.id, qp.limit ?? 100, qp.offset ?? 0);
        return json.ok({ message: 'SSB points retrieved successfully.', items: rows, count: rows.length });
    } catch (err) { return handleApiError(err); }
}

async function POSTHandler(req: NextRequest, { params }: { params: Promise<{ ocId: string }> }) {
    try {
        const authCtx = await mustBeAuthed(req);
        const { ocId } = await parseParam({params}, OcIdParam); await ensureOcExists(ocId);
        const report = await getSsbReport(ocId);
        if (!report) throw new ApiError(400, 'Create SSB report first', 'bad_request');
        const dto = ssbPointCreateSchema.parse(await req.json());
        const row = await createSsbPoint(report.id, dto);

        await createAuditLog({
            actorUserId: authCtx.userId,
            eventType: AuditEventType.OC_RECORD_CREATED,
            resourceType: AuditResourceType.OC,
            resourceId: ocId,
            description: `Created SSB point ${row.id} for OC ${ocId}`,
            metadata: {
                ocId,
                module: 'ssb_points',
                recordId: row.id,
                ssbReportId: report.id,
                kind: dto.kind,
            },
            request: req,
        });
        return json.created({ message: 'SSB point created successfully.', data: row });
    } catch (err) { return handleApiError(err); }
}
export const GET = withRouteLogging('GET', GETHandler);

export const POST = withRouteLogging('POST', POSTHandler);
