import { json, handleApiError, ApiError } from '@/app/lib/http';
import { mustBeAuthed, mustBeAdmin, parseParam, ensureOcExists } from '../../../../_checks';
import { OcIdParam, ssbPointUpdateSchema } from '@/app/lib/oc-validators';
import { getSsbReport, getSsbPoint, updateSsbPoint, deleteSsbPoint } from '@/app/db/queries/oc';
import { IdSchema } from '@/app/lib/apiClient';
import { withAuditRoute, AuditEventType, AuditResourceType } from '@/lib/audit';
import type { AuditNextRequest } from '@/lib/audit';

async function GETHandler(req: AuditNextRequest, { params }: { params: Promise<{ ocId: string }> }) {
    try {
        const authCtx = await mustBeAuthed(req);
        const { ocId } = await parseParam({params}, OcIdParam); await ensureOcExists(ocId);
        const { id } = await parseParam({params}, IdSchema);
        const report = await getSsbReport(ocId); if (!report) throw new ApiError(404, 'SSB report not found', 'not_found');
        const row = await getSsbPoint(report.id, id); if (!row) throw new ApiError(404, 'Point not found', 'not_found');

        await req.audit.log({
            action: AuditEventType.API_REQUEST,
            outcome: 'SUCCESS',
            actor: { type: 'user', id: authCtx.userId },
            target: { type: AuditResourceType.OC, id: ocId },
            metadata: {
                description: `SSB point ${id} retrieved successfully for OC ${ocId}`,
                ocId,
                module: 'ssb_points',
                recordId: id,
                ssbReportId: report.id,
            },
        });

        return json.ok({ message: 'SSB point retrieved successfully.', data: row });
    } catch (err) { return handleApiError(err); }
}

async function PATCHHandler(req: AuditNextRequest, { params }: { params: Promise<{ ocId: string }> }) {
    try {
        const authCtx = await mustBeAuthed(req);
        const { ocId } = await parseParam({params}, OcIdParam); await ensureOcExists(ocId);
        const { id } = await parseParam({params}, IdSchema);
        const report = await getSsbReport(ocId); if (!report) throw new ApiError(404, 'SSB report not found', 'not_found');
        const dto = ssbPointUpdateSchema.parse(await req.json());
        const row = await updateSsbPoint(report.id, id, dto); if (!row) throw new ApiError(404, 'Point not found', 'not_found');

        await req.audit.log({
            action: AuditEventType.OC_RECORD_UPDATED,
            outcome: 'SUCCESS',
            actor: { type: 'user', id: authCtx.userId },
            target: { type: AuditResourceType.OC, id: ocId },
            metadata: {
                description: `Updated SSB point ${id} for OC ${ocId}`,
                ocId,
                module: 'ssb_points',
                recordId: id,
                ssbReportId: report.id,
                changes: Object.keys(dto),
            },
        });
        return json.ok({ message: 'SSB point updated successfully.', data: row });
    } catch (err) { return handleApiError(err); }
}

async function DELETEHandler(req: AuditNextRequest, { params }: { params: Promise<{ ocId: string }> }) {
    try {
        const authCtx = await mustBeAuthed(req);
        const { ocId } = await parseParam({params}, OcIdParam); await ensureOcExists(ocId);
        const { id } = await parseParam({params}, IdSchema);
        const report = await getSsbReport(ocId); if (!report) throw new ApiError(404, 'SSB report not found', 'not_found');
        const row = await deleteSsbPoint(report.id, id); if (!row) throw new ApiError(404, 'Point not found', 'not_found');

        await req.audit.log({
            action: AuditEventType.OC_RECORD_DELETED,
            outcome: 'SUCCESS',
            actor: { type: 'user', id: authCtx.userId },
            target: { type: AuditResourceType.OC, id: ocId },
            metadata: {
                description: `Deleted SSB point ${id} for OC ${ocId}`,
                ocId,
                module: 'ssb_points',
                recordId: id,
                ssbReportId: report.id,
                hardDeleted: true,
            },
        });
        return json.ok({ message: 'SSB point deleted successfully.', id: row.id });
    } catch (err) { return handleApiError(err); }
}
export const GET = withAuditRoute('GET', GETHandler);

export const PATCH = withAuditRoute('PATCH', PATCHHandler);

export const DELETE = withAuditRoute('DELETE', DELETEHandler);
