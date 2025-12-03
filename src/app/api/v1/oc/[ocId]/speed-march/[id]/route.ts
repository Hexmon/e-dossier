import { NextRequest } from 'next/server';
import { json, handleApiError, ApiError } from '@/app/lib/http';
import { mustBeAuthed, mustBeAdmin, parseParam, ensureOcExists } from '../../../_checks';
import { OcIdParam, speedMarchUpdateSchema } from '@/app/lib/oc-validators';
import { getSpeedMarch, updateSpeedMarch, deleteSpeedMarch } from '@/app/db/queries/oc';
import { IdSchema } from '@/app/lib/apiClient';

export async function GET(req: NextRequest, { params }: { params: Promise<{ ocId: string }> }) {
    try {
        await mustBeAuthed(req);
        const { ocId } = await parseParam({params}, OcIdParam);
        await ensureOcExists(ocId);
        const { id } = await parseParam({params}, IdSchema);
        const row = await getSpeedMarch(ocId, id);
        if (!row) throw new ApiError(404, 'Speed march record not found', 'not_found');
        return json.ok({ message: 'Speed march record retrieved successfully.', data: row });
    } catch (err) {
        return handleApiError(err);
    }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ ocId: string }> }) {
    try {
        await mustBeAdmin(req);
        const { ocId } = await parseParam({params}, OcIdParam);
        await ensureOcExists(ocId);
        const { id } = await parseParam({params}, IdSchema);
        const dto = speedMarchUpdateSchema.parse(await req.json());
       const row = await updateSpeedMarch(ocId, id, dto);
        if (!row) throw new ApiError(404, 'Speed march record not found', 'not_found');
        return json.ok({ message: 'Speed march record updated successfully.', data: row });
    } catch (err) {
        return handleApiError(err);
    }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ ocId: string }> }) {
    try {
        await mustBeAdmin(req);
        const { ocId } = await parseParam({params}, OcIdParam);
        await ensureOcExists(ocId);
        const { id } = await parseParam({params}, IdSchema);
        const sp = new URL(req.url).searchParams;
        const hard = sp.get('hard') === 'true';
        const row = await deleteSpeedMarch(ocId, id, { hard });
        if (!row) throw new ApiError(404, 'Speed march record not found', 'not_found');
        return json.ok({
            message: hard ? 'Speed march record hard-deleted.' : 'Speed march record soft-deleted.',
            id: row.id,
        });
    } catch (err) {
        return handleApiError(err);
    }
}
