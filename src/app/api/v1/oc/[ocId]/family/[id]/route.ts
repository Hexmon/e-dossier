import { NextRequest } from 'next/server';
import { json, handleApiError, ApiError } from '@/app/lib/http';
import { mustBeAuthed, mustBeAdmin, parseParam, ensureOcExists } from '../../../_checks';
import { OcIdParam, IdSchema, familyUpdateSchema } from '@/app/lib/oc-validators';
import { getFamily, updateFamily, deleteFamily } from '@/app/db/queries/oc';

export async function GET(req: NextRequest, ctx: any) {
    try {
        await mustBeAuthed(req);
        const { ocId } = await parseParam(ctx, OcIdParam); await ensureOcExists(ocId);
        const { id } = await parseParam(ctx, IdSchema);
        const row = await getFamily(ocId, id);
        if (!row) throw new ApiError(404, 'Family member not found', 'not_found');
        return json.ok({ data: row });
    } catch (err) { return handleApiError(err); }
}

export async function PATCH(req: NextRequest, ctx: any) {
    try {
        await mustBeAdmin(req);
        const { ocId } = await parseParam(ctx, OcIdParam); await ensureOcExists(ocId);
        const { id } = await parseParam(ctx, IdSchema);
        const dto = familyUpdateSchema.parse(await req.json());
        const row = await updateFamily(ocId, id, dto);
        if (!row) throw new ApiError(404, 'Family member not found', 'not_found');
        return json.ok({ data: row });
    } catch (err) { return handleApiError(err); }
}

export async function DELETE(req: NextRequest, ctx: any) {
    try {
        await mustBeAdmin(req);
        const { ocId } = await parseParam(ctx, OcIdParam); await ensureOcExists(ocId);
        const { id } = await parseParam(ctx, IdSchema);
        const row = await deleteFamily(ocId, id);
        if (!row) throw new ApiError(404, 'Family member not found', 'not_found');
        return json.ok({ message: 'Deleted', id: row.id });
    } catch (err) { return handleApiError(err); }
}
