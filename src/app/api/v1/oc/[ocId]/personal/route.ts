import { NextRequest } from 'next/server';
import { json, handleApiError, ApiError } from '@/app/lib/http';
import { mustBeAuthed, mustBeAdmin, parseParam, ensureOcExists } from '../../_checks';
import { OcIdParam, personalUpsertSchema } from '@/app/lib/oc-validators';
import { getPersonal, upsertPersonal, deletePersonal } from '@/app/db/queries/oc';
import { authorizeOcAccess } from '@/lib/authorization';

export async function GET(req: NextRequest, ctx: any) {
    try {
        const { ocId } = await parseParam(ctx, OcIdParam);
        await ensureOcExists(ocId);

        // SECURITY FIX: Proper authorization check to prevent IDOR
        await authorizeOcAccess(req, ocId);

        return json.ok({ data: await getPersonal(ocId) });
    } catch (err) { return handleApiError(err); }
}

export async function POST(req: NextRequest, ctx: any) {
    try {
        const { ocId } = await parseParam(ctx, OcIdParam);
        await ensureOcExists(ocId);

        // SECURITY FIX: Proper authorization check to prevent IDOR
        await authorizeOcAccess(req, ocId);

        const dto = personalUpsertSchema.parse(await req.json());
        const existing = await getPersonal(ocId);
        if (existing) throw new ApiError(409, 'Personal particulars already exist. Use PATCH (admin).', 'conflict');
        const saved = await upsertPersonal(ocId, dto);
        return json.created({ data: saved });
    } catch (err) { return handleApiError(err); }
}

export async function PATCH(req: NextRequest, ctx: any) {
    try {
        await mustBeAdmin(req);
        const { ocId } = await parseParam(ctx, OcIdParam); await ensureOcExists(ocId);
        const dto = personalUpsertSchema.partial().parse(await req.json());
        const saved = await upsertPersonal(ocId, dto);
        return json.ok({ data: saved });
    } catch (err) { return handleApiError(err); }
}

export async function DELETE(req: NextRequest, ctx: any) {
    try {
        await mustBeAdmin(req);
        const { ocId } = await parseParam(ctx, OcIdParam); await ensureOcExists(ocId);
        return json.ok({ deleted: await deletePersonal(ocId) });
    } catch (err) { return handleApiError(err); }
}
