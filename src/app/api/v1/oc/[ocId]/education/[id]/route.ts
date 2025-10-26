import { NextRequest } from 'next/server';
import { json, handleApiError, ApiError } from '@/app/lib/http';
import { mustBeAuthed, mustBeAdmin, parseParam, ensureOcExists } from '../../../_checks';
import { OcIdParam, eduUpdateSchema } from '@/app/lib/oc-validators';
import { getEdu, updateEdu, deleteEdu } from '@/app/db/queries/oc';
import { IdSchema } from '@/app/lib/apiClient';

export async function GET(req: NextRequest, ctx: any) {
    try {
        await mustBeAuthed(req);
        const { ocId } = await parseParam(ctx, OcIdParam); await ensureOcExists(ocId);
        const { id } = await parseParam(ctx, IdSchema);
        const row = await getEdu(ocId, id);
        if (!row) throw new ApiError(404, 'Education record not found', 'not_found');
        return json.ok({ data: row });
    } catch (err) { return handleApiError(err); }
}

export async function PATCH(req: NextRequest, ctx: any) {
    try {
        await mustBeAdmin(req);
        const { ocId } = await parseParam(ctx, OcIdParam); await ensureOcExists(ocId);
        const { id } = await parseParam(ctx, IdSchema);
        const dto = eduUpdateSchema.parse(await req.json());
        const row = await updateEdu(ocId, id, dto);
        if (!row) throw new ApiError(404, 'Education record not found', 'not_found');
        return json.ok({ data: row });
    } catch (err) { return handleApiError(err); }
}

export async function DELETE(req: NextRequest, ctx: any) {
    try {
        await mustBeAdmin(req);
        const { ocId } = await parseParam(ctx, OcIdParam); await ensureOcExists(ocId);
        const { id } = await parseParam(ctx, IdSchema);
        const row = await deleteEdu(ocId, id);
        if (!row) throw new ApiError(404, 'Education record not found', 'not_found');
        return json.ok({ message: 'Deleted', id: row.id });
    } catch (err) { return handleApiError(err); }
}
