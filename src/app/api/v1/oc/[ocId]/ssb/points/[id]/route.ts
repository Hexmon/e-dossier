import { NextRequest } from 'next/server';
import { json, handleApiError, ApiError } from '@/app/lib/http';
import { mustBeAuthed, mustBeAdmin, parseParam, ensureOcExists } from '../../../../_checks';
import { OcIdParam, ssbPointUpdateSchema } from '@/app/lib/oc-validators';
import { getSsbReport, getSsbPoint, updateSsbPoint, deleteSsbPoint } from '@/app/db/queries/oc';
import { IdSchema } from '@/app/lib/apiClient';

export async function GET(req: NextRequest, ctx: any) {
    try {
        await mustBeAuthed(req);
        const { ocId } = await parseParam(ctx, OcIdParam); await ensureOcExists(ocId);
        const { id } = await parseParam(ctx, IdSchema);
        const report = await getSsbReport(ocId); if (!report) throw new ApiError(404, 'SSB report not found', 'not_found');
        const row = await getSsbPoint(report.id, id); if (!row) throw new ApiError(404, 'Point not found', 'not_found');
        return json.ok({ data: row });
    } catch (err) { return handleApiError(err); }
}

export async function PATCH(req: NextRequest, ctx: any) {
    try {
        await mustBeAdmin(req);
        const { ocId } = await parseParam(ctx, OcIdParam); await ensureOcExists(ocId);
        const { id } = await parseParam(ctx, IdSchema);
        const report = await getSsbReport(ocId); if (!report) throw new ApiError(404, 'SSB report not found', 'not_found');
        const dto = ssbPointUpdateSchema.parse(await req.json());
        const row = await updateSsbPoint(report.id, id, dto); if (!row) throw new ApiError(404, 'Point not found', 'not_found');
        return json.ok({ data: row });
    } catch (err) { return handleApiError(err); }
}

export async function DELETE(req: NextRequest, ctx: any) {
    try {
        await mustBeAdmin(req);
        const { ocId } = await parseParam(ctx, OcIdParam); await ensureOcExists(ocId);
        const { id } = await parseParam(ctx, IdSchema);
        const report = await getSsbReport(ocId); if (!report) throw new ApiError(404, 'SSB report not found', 'not_found');
        const row = await deleteSsbPoint(report.id, id); if (!row) throw new ApiError(404, 'Point not found', 'not_found');
        return json.ok({ message: 'Deleted', id: row.id });
    } catch (err) { return handleApiError(err); }
}
