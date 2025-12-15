import { NextRequest } from 'next/server';
import { json, handleApiError, ApiError } from '@/app/lib/http';
import { mustBeAuthed, mustBeAdmin, parseParam, ensureOcExists } from '../../../../_checks';
import { OcIdParam, ssbPointUpdateSchema } from '@/app/lib/oc-validators';
import { getSsbReport, getSsbPoint, updateSsbPoint, deleteSsbPoint } from '@/app/db/queries/oc';
import { IdSchema } from '@/app/lib/apiClient';
import { createAuditLog, AuditEventType, AuditResourceType } from '@/lib/audit-log';
import { withRouteLogging } from '@/lib/withRouteLogging';

async function GETHandler(req: NextRequest, { params }: { params: Promise<{ ocId: string }> }) {
    try {
        await mustBeAuthed(req);
        const { ocId } = await parseParam({params}, OcIdParam); await ensureOcExists(ocId);
        const { id } = await parseParam({params}, IdSchema);
        const report = await getSsbReport(ocId); if (!report) throw new ApiError(404, 'SSB report not found', 'not_found');
        const row = await getSsbPoint(report.id, id); if (!row) throw new ApiError(404, 'Point not found', 'not_found');
        return json.ok({ message: 'SSB point retrieved successfully.', data: row });
    } catch (err) { return handleApiError(err); }
}

async function PATCHHandler(req: NextRequest, { params }: { params: Promise<{ ocId: string }> }) {
    try {
        const adminCtx = await mustBeAdmin(req);
        const { ocId } = await parseParam({params}, OcIdParam); await ensureOcExists(ocId);
        const { id } = await parseParam({params}, IdSchema);
        const report = await getSsbReport(ocId); if (!report) throw new ApiError(404, 'SSB report not found', 'not_found');
        const dto = ssbPointUpdateSchema.parse(await req.json());
        const row = await updateSsbPoint(report.id, id, dto); if (!row) throw new ApiError(404, 'Point not found', 'not_found');

        await createAuditLog({
            actorUserId: adminCtx.userId,
            eventType: AuditEventType.OC_RECORD_UPDATED,
            resourceType: AuditResourceType.OC,
            resourceId: ocId,
            description: `Updated SSB point ${id} for OC ${ocId}`,
            metadata: {
                ocId,
                module: 'ssb_points',
                recordId: id,
                ssbReportId: report.id,
                changes: Object.keys(dto),
            },
            request: req,
        });
        return json.ok({ message: 'SSB point updated successfully.', data: row });
    } catch (err) { return handleApiError(err); }
}

async function DELETEHandler(req: NextRequest, { params }: { params: Promise<{ ocId: string }> }) {
    try {
        const adminCtx = await mustBeAdmin(req);
        const { ocId } = await parseParam({params}, OcIdParam); await ensureOcExists(ocId);
        const { id } = await parseParam({params}, IdSchema);
        const report = await getSsbReport(ocId); if (!report) throw new ApiError(404, 'SSB report not found', 'not_found');
        const row = await deleteSsbPoint(report.id, id); if (!row) throw new ApiError(404, 'Point not found', 'not_found');

        await createAuditLog({
            actorUserId: adminCtx.userId,
            eventType: AuditEventType.OC_RECORD_DELETED,
            resourceType: AuditResourceType.OC,
            resourceId: ocId,
            description: `Deleted SSB point ${id} for OC ${ocId}`,
            metadata: {
                ocId,
                module: 'ssb_points',
                recordId: id,
                ssbReportId: report.id,
                hardDeleted: true,
            },
            request: req,
        });
        return json.ok({ message: 'SSB point deleted successfully.', id: row.id });
    } catch (err) { return handleApiError(err); }
}
export const GET = withRouteLogging('GET', GETHandler);

export const PATCH = withRouteLogging('PATCH', PATCHHandler);

export const DELETE = withRouteLogging('DELETE', DELETEHandler);
