import { NextRequest } from 'next/server';
import { json, handleApiError, ApiError } from '@/app/lib/http';
import { mustBeAuthed, mustBeAdmin, parseParam, ensureOcExists } from '../../_checks';
import { OcIdParam, autobiographyUpsertSchema } from '@/app/lib/oc-validators';
import { getAutobio, upsertAutobio, deleteAutobio } from '@/app/db/queries/oc';
import { authorizeOcAccess } from '@/lib/authorization';

export async function GET(req: NextRequest, ctx: any) {
    try {
        const { ocId } = await parseParam(ctx, OcIdParam);
        await ensureOcExists(ocId);

        // SECURITY FIX: Proper authorization check to prevent IDOR
        await authorizeOcAccess(req, ocId);

        return json.ok({ data: await getAutobio(ocId) });
    } catch (err) { return handleApiError(err); }
}

export async function POST(req: NextRequest, ctx: any) {
    try {
        await mustBeAuthed(req);
        const { ocId } = await parseParam(ctx, OcIdParam); await ensureOcExists(ocId);
        if (await getAutobio(ocId)) throw new ApiError(409, 'Autobiography exists. Use PATCH (admin).', 'conflict');
        const dto = autobiographyUpsertSchema.parse(await req.json());
        return json.created({ data: await upsertAutobio(ocId, dto) });
    } catch (err) { return handleApiError(err); }
}

export async function PATCH(req: NextRequest, ctx: any) {
    try {
        await mustBeAdmin(req);
        const { ocId } = await parseParam(ctx, OcIdParam); await ensureOcExists(ocId);
        const dto = autobiographyUpsertSchema.partial().parse(await req.json());
        return json.ok({ data: await upsertAutobio(ocId, dto) });
    } catch (err) { return handleApiError(err); }
}

export async function DELETE(req: NextRequest, ctx: any) {
    try {
        await mustBeAdmin(req);
        const { ocId } = await parseParam(ctx, OcIdParam); await ensureOcExists(ocId);
        return json.ok({ deleted: await deleteAutobio(ocId) });
    } catch (err) { return handleApiError(err); }
}
