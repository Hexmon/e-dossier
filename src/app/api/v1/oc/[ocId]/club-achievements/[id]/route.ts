import { NextRequest } from 'next/server';
import { json, handleApiError, ApiError } from '@/app/lib/http';
import { mustBeAuthed, mustBeAdmin, parseParam, ensureOcExists } from '../../../_checks';
import { OcIdParam, clubAchievementUpdateSchema } from '@/app/lib/oc-validators';
import { getClubAchievement, updateClubAchievement, deleteClubAchievement } from '@/app/db/queries/oc';
import { IdSchema } from '@/app/lib/apiClient';

export async function GET(req: NextRequest, ctx: any) {
    try {
        await mustBeAuthed(req);
        const { ocId } = await parseParam(ctx, OcIdParam);
        await ensureOcExists(ocId);
        const { id } = await parseParam(ctx, IdSchema);
        const row = await getClubAchievement(ocId, id);
        if (!row) throw new ApiError(404, 'Club achievement not found', 'not_found');
        return json.ok({ data: row });
    } catch (err) {
        return handleApiError(err);
    }
}

export async function PATCH(req: NextRequest, ctx: any) {
    try {
        await mustBeAdmin(req);
        const { ocId } = await parseParam(ctx, OcIdParam);
        await ensureOcExists(ocId);
        const { id } = await parseParam(ctx, IdSchema);
        const dto = clubAchievementUpdateSchema.parse(await req.json());
        const row = await updateClubAchievement(ocId, id, dto);
        if (!row) throw new ApiError(404, 'Club achievement not found', 'not_found');
        return json.ok({ data: row });
    } catch (err) {
        return handleApiError(err);
    }
}

export async function DELETE(req: NextRequest, ctx: any) {
    try {
        await mustBeAdmin(req);
        const { ocId } = await parseParam(ctx, OcIdParam);
        await ensureOcExists(ocId);
        const { id } = await parseParam(ctx, IdSchema);
        const sp = new URL(req.url).searchParams;
        const hard = sp.get('hard') === 'true';
        const row = await deleteClubAchievement(ocId, id, { hard });
        if (!row) throw new ApiError(404, 'Club achievement not found', 'not_found');
        return json.ok({
            message: hard ? 'Club achievement hard-deleted' : 'Club achievement soft-deleted',
            id: row.id,
        });
    } catch (err) {
        return handleApiError(err);
    }
}
