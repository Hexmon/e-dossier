import { NextRequest } from 'next/server';
import { json, handleApiError, ApiError } from '@/app/lib/http';
import { mustBeAuthed, mustBeAdmin, parseParam, ensureOcExists } from '../../../_checks';
import { OcIdParam, weaponTrainingUpdateSchema } from '@/app/lib/oc-validators';
import { getWeaponTraining, updateWeaponTraining, deleteWeaponTraining } from '@/app/db/queries/oc';
import { IdSchema } from '@/app/lib/apiClient';

export async function GET(req: NextRequest, ctx: any) {
    try {
        await mustBeAuthed(req);
        const { ocId } = await parseParam(ctx, OcIdParam);
        await ensureOcExists(ocId);
        const { id } = await parseParam(ctx, IdSchema);
        const row = await getWeaponTraining(ocId, id);
        if (!row) throw new ApiError(404, 'Weapon training record not found', 'not_found');
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
        const dto = weaponTrainingUpdateSchema.parse(await req.json());
        const row = await updateWeaponTraining(ocId, id, dto);
        if (!row) throw new ApiError(404, 'Weapon training record not found', 'not_found');
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
        const row = await deleteWeaponTraining(ocId, id, { hard });
        if (!row) throw new ApiError(404, 'Weapon training record not found', 'not_found');
        return json.ok({
            message: hard ? 'Weapon training record hard-deleted' : 'Weapon training record soft-deleted',
            id: row.id,
        });
    } catch (err) {
        return handleApiError(err);
    }
}

