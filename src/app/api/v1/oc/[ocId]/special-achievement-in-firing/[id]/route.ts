import { NextRequest } from 'next/server';
import { json, handleApiError, ApiError } from '@/app/lib/http';
import { mustBeAuthed, mustBeAdmin, parseParam, ensureOcExists } from '../../../_checks';
import { OcIdParam, specialAchievementInFiringUpdateSchema } from '@/app/lib/oc-validators';
import { getSpecialAchievementInFiring, updateSpecialAchievementInFiring, deleteSpecialAchievementInFiring } from '@/app/db/queries/oc';
import { IdSchema } from '@/app/lib/apiClient';

export async function GET(req: NextRequest, ctx: any) {
    try {
        await mustBeAuthed(req);
        const { ocId } = await parseParam(ctx, OcIdParam);
        await ensureOcExists(ocId);
        const { id } = await parseParam(ctx, IdSchema);
        const row = await getSpecialAchievementInFiring(ocId, id);
        if (!row) throw new ApiError(404, 'Special achievement record not found', 'not_found');
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
        const dto = specialAchievementInFiringUpdateSchema.parse(await req.json());
        const row = await updateSpecialAchievementInFiring(ocId, id, dto);
        if (!row) throw new ApiError(404, 'Special achievement record not found', 'not_found');
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
        const row = await deleteSpecialAchievementInFiring(ocId, id, { hard });
        if (!row) throw new ApiError(404, 'Special achievement record not found', 'not_found');
        return json.ok({
            message: hard ? 'Special achievement record hard-deleted' : 'Special achievement record soft-deleted',
            id: row.id,
        });
    } catch (err) {
        return handleApiError(err);
    }
}

