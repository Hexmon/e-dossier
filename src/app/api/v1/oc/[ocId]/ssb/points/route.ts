import { json, handleApiError, ApiError } from '@/app/lib/http';
import { mustBeAuthed, parseParam, ensureOcExists } from '../../../_checks';
import { OcIdParam, listQuerySchema, ssbPointCreateSchema } from '@/app/lib/oc-validators';
import { getSsbReport, listSsbPoints, createSsbPoint } from '@/app/db/queries/oc';
import { withAuditRoute, AuditEventType, AuditResourceType } from '@/lib/audit';
import type { AuditNextRequest } from '@/lib/audit';

async function GETHandler(req: AuditNextRequest, { params }: { params: Promise<{ ocId: string }> }) {
    try {
        const authCtx = await mustBeAuthed(req);
        const { ocId } = await parseParam({params}, OcIdParam); await ensureOcExists(ocId);
        const report = await getSsbReport(ocId);
        if (!report) {
            await req.audit.log({
                action: AuditEventType.API_REQUEST,
                outcome: 'SUCCESS',
                actor: { type: 'user', id: authCtx.userId },
                target: { type: AuditResourceType.OC, id: ocId },
                metadata: {
                    description: `SSB points retrieved for OC ${ocId} with empty report.`,
                    ocId,
                    module: 'ssb_points',
                    count: 0,
                },
            });
            return json.ok({ items: [], count: 0 });
        }
        const sp = new URL(req.url).searchParams;
        const qp = listQuerySchema.parse({ limit: sp.get('limit') ?? undefined, offset: sp.get('offset') ?? undefined });
        const rows = await listSsbPoints(report.id, qp.limit ?? 100, qp.offset ?? 0);

        await req.audit.log({
            action: AuditEventType.API_REQUEST,
            outcome: 'SUCCESS',
            actor: { type: 'user', id: authCtx.userId },
            target: { type: AuditResourceType.OC, id: ocId },
            metadata: {
                description: `SSB points retrieved successfully for OC ${ocId}`,
                ocId,
                module: 'ssb_points',
                ssbReportId: report.id,
                count: rows.length,
                query: { limit: qp.limit ?? null, offset: qp.offset ?? null },
            },
        });

        return json.ok({ message: 'SSB points retrieved successfully.', items: rows, count: rows.length });
    } catch (err) { return handleApiError(err); }
}

async function POSTHandler(req: AuditNextRequest, { params }: { params: Promise<{ ocId: string }> }) {
    try {
        const authCtx = await mustBeAuthed(req);
        const { ocId } = await parseParam({params}, OcIdParam); await ensureOcExists(ocId);
        const report = await getSsbReport(ocId);
        if (!report) throw new ApiError(400, 'Create SSB report first', 'bad_request');
        const dto = ssbPointCreateSchema.parse(await req.json());
        const row = await createSsbPoint(report.id, dto);

        await req.audit.log({
            action: AuditEventType.OC_RECORD_CREATED,
            outcome: 'SUCCESS',
            actor: { type: 'user', id: authCtx.userId },
            target: { type: AuditResourceType.OC, id: ocId },
            metadata: {
                description: `Created SSB point ${row.id} for OC ${ocId}`,
                ocId,
                module: 'ssb_points',
                recordId: row.id,
                ssbReportId: report.id,
                kind: dto.kind,
            },
        });
        return json.created({ message: 'SSB point created successfully.', data: row });
    } catch (err) { return handleApiError(err); }
}
export const GET = withAuditRoute('GET', GETHandler);

export const POST = withAuditRoute('POST', POSTHandler);
