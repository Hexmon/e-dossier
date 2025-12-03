import { NextRequest } from 'next/server';
import { json, handleApiError, ApiError } from '@/app/lib/http';
import { mustBeAuthed, mustBeAdmin, parseParam, ensureOcExists } from '../../../_checks';
import { OcIdParam, familyUpdateSchema } from '@/app/lib/oc-validators';
import { getFamily, updateFamily, deleteFamily } from '@/app/db/queries/oc';
import { IdSchema } from '@/app/lib/apiClient';

export async function GET(req: NextRequest, { params }: { params: Promise<{ ocId: string }> }) {
    try {
        await mustBeAuthed(req);
        const { ocId } = await parseParam({params}, OcIdParam); await ensureOcExists(ocId);
        const { id } = await parseParam({params}, IdSchema);
        const row = await getFamily(ocId, id);
        if (!row) throw new ApiError(404, 'Family member not found', 'not_found');
        return json.ok({ message: 'Family member retrieved successfully.', data: row });
    } catch (err) { return handleApiError(err); }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ ocId: string }> }) {
    try {
        await mustBeAdmin(req);
        const { ocId } = await parseParam({params}, OcIdParam); await ensureOcExists(ocId);
        const { id } = await parseParam({params}, IdSchema);
        const dto = familyUpdateSchema.parse(await req.json());
        const row = await updateFamily(ocId, id, dto);
        if (!row) throw new ApiError(404, 'Family member not found', 'not_found');
        return json.ok({ message: 'Family member updated successfully.', data: row });
    } catch (err) { return handleApiError(err); }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ ocId: string }> }) {
    try {
        await mustBeAdmin(req);
        const { ocId } = await parseParam({params}, OcIdParam); await ensureOcExists(ocId);
        const { id } = await parseParam({params}, IdSchema);
        const row = await deleteFamily(ocId, id);
        if (!row) throw new ApiError(404, 'Family member not found', 'not_found');
        return json.ok({ message: 'Family member deleted successfully.', id: row.id });
    } catch (err) { return handleApiError(err); }
}
