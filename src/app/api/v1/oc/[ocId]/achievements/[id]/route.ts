import { NextRequest } from 'next/server';
import { json, handleApiError, ApiError } from '@/app/lib/http';
import { mustBeAuthed, mustBeAdmin, parseParam, ensureOcExists } from '../../../_checks';
import { OcIdParam, achieveUpdateSchema } from '@/app/lib/oc-validators';
import { getAchievement, updateAchievement, deleteAchievement } from '@/app/db/queries/oc';
import { IdSchema } from '@/app/lib/apiClient';

export async function GET(req: NextRequest, ctx: any) {
    try {
        await mustBeAuthed(req);
        const { ocId } = await parseParam(ctx, OcIdParam); await ensureOcExists(ocId);
        const { id } = await parseParam(ctx, IdSchema);
        const row = await getAchievement(ocId, id);
        if (!row) throw new ApiError(404, 'Achievement not found', 'not_found');
        return json.ok({ message: 'Achievement retrieved successfully.', data: row });
    } catch (err) { return handleApiError(err); }
}

export async function PATCH(req: NextRequest, ctx: any) {
    try {
        await mustBeAdmin(req);
        const { ocId } = await parseParam(ctx, OcIdParam); await ensureOcExists(ocId);
        const { id } = await parseParam(ctx, IdSchema);
        const dto = achieveUpdateSchema.parse(await req.json());
        const row = await updateAchievement(ocId, id, dto);
        if (!row) throw new ApiError(404, 'Achievement not found', 'not_found');
        return json.ok({ message: 'Achievement updated successfully.', data: row });
    } catch (err) { return handleApiError(err); }
}

export async function DELETE(req: NextRequest, ctx: any) {
    try {
        await mustBeAdmin(req);
        const { ocId } = await parseParam(ctx, OcIdParam); await ensureOcExists(ocId);
        const { id } = await parseParam(ctx, IdSchema);
        const row = await deleteAchievement(ocId, id);
        if (!row) throw new ApiError(404, 'Achievement not found', 'not_found');
        return json.ok({ message: 'Achievement deleted successfully.', id: row.id });
    } catch (err) { return handleApiError(err); }
}
