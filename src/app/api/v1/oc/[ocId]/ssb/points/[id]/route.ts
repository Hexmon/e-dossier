import { NextRequest } from 'next/server';
import { json, handleApiError, ApiError } from '@/app/lib/http';
import { mustBeAuthed, mustBeAdmin, parseParam, ensureOcExists } from '../../../../_checks';
import { OcIdParam, ssbPointUpdateSchema } from '@/app/lib/oc-validators';
import { getSsbReport, getSsbPoint, updateSsbPoint, deleteSsbPoint } from '@/app/db/queries/oc';
import { IdSchema } from '@/app/lib/apiClient';

export async function GET(req: NextRequest, { params }: { params: Promise<{ ocId: string }> }) {
    try {
        await mustBeAuthed(req);
        const { ocId } = await parseParam({params}, OcIdParam); await ensureOcExists(ocId);
        const { id } = await parseParam({params}, IdSchema);
        const report = await getSsbReport(ocId); if (!report) throw new ApiError(404, 'SSB report not found', 'not_found');
        const row = await getSsbPoint(report.id, id); if (!row) throw new ApiError(404, 'Point not found', 'not_found');
        return json.ok({ message: 'SSB point retrieved successfully.', data: row });
    } catch (err) { return handleApiError(err); }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ ocId: string }> }) {
    try {
        await mustBeAdmin(req);
        const { ocId } = await parseParam({params}, OcIdParam); await ensureOcExists(ocId);
        const { id } = await parseParam({params}, IdSchema);
        const report = await getSsbReport(ocId); if (!report) throw new ApiError(404, 'SSB report not found', 'not_found');
        const dto = ssbPointUpdateSchema.parse(await req.json());
        const row = await updateSsbPoint(report.id, id, dto); if (!row) throw new ApiError(404, 'Point not found', 'not_found');
        return json.ok({ message: 'SSB point updated successfully.', data: row });
    } catch (err) { return handleApiError(err); }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ ocId: string }> }) {
    try {
        await mustBeAdmin(req);
        const { ocId } = await parseParam({params}, OcIdParam); await ensureOcExists(ocId);
        const { id } = await parseParam({params}, IdSchema);
        const report = await getSsbReport(ocId); if (!report) throw new ApiError(404, 'SSB report not found', 'not_found');
        const row = await deleteSsbPoint(report.id, id); if (!row) throw new ApiError(404, 'Point not found', 'not_found');
        return json.ok({ message: 'SSB point deleted successfully.', id: row.id });
    } catch (err) { return handleApiError(err); }
}
