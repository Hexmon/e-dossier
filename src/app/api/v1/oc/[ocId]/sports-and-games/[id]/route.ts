import { NextRequest } from 'next/server';
import { json, handleApiError, ApiError } from '@/app/lib/http';
import { mustBeAuthed, mustBeAdmin, parseParam, ensureOcExists } from '../../../_checks';
import { OcIdParam, sportsAndGamesUpdateSchema } from '@/app/lib/oc-validators';
import { getSportsAndGames, updateSportsAndGames, deleteSportsAndGames } from '@/app/db/queries/oc';
import { IdSchema } from '@/app/lib/apiClient';

export async function GET(req: NextRequest, { params }: { params: Promise<{ ocId: string }> }) {
    try {
        await mustBeAuthed(req);
        const { ocId } = await parseParam({params}, OcIdParam);
        await ensureOcExists(ocId);
        const { id } = await parseParam({params}, IdSchema);
        const row = await getSportsAndGames(ocId, id);
        if (!row) throw new ApiError(404, 'Sports/games record not found', 'not_found');
        return json.ok({ message: 'Sports and games record retrieved successfully.', data: row });
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
        const dto = sportsAndGamesUpdateSchema.parse(await req.json());
        const row = await updateSportsAndGames(ocId, id, dto);
        if (!row) throw new ApiError(404, 'Sports/games record not found', 'not_found');
        return json.ok({ message: 'Sports and games record updated successfully.', data: row });
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
        const row = await deleteSportsAndGames(ocId, id, { hard });
        if (!row) throw new ApiError(404, 'Sports/games record not found', 'not_found');
        return json.ok({
            message: hard ? 'Sports and games record hard-deleted.' : 'Sports and games record soft-deleted.',
            id: row.id,
        });
    } catch (err) {
        return handleApiError(err);
    }
}
