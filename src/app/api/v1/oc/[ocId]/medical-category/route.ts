import { NextRequest } from 'next/server';
import { json, handleApiError } from '@/app/lib/http';
import { mustBeAuthed, mustBeAdmin, parseParam, ensureOcExists } from '../../_checks';
import { OcIdParam, listQuerySchema, medCatCreateSchema } from '@/app/lib/oc-validators';
import { listMedCats, createMedCat } from '@/app/db/queries/oc';

export async function GET(req: NextRequest, ctx: any) {
    try {
        await mustBeAuthed(req);
        const { ocId } = await parseParam(ctx, OcIdParam); await ensureOcExists(ocId);
        const sp = new URL(req.url).searchParams;
        const qp = listQuerySchema.parse({ limit: sp.get('limit') ?? undefined, offset: sp.get('offset') ?? undefined });
        const rows = await listMedCats(ocId, qp.limit ?? 100, qp.offset ?? 0);
        return json.ok({ message: 'Medical category records retrieved successfully.', items: rows, count: rows.length });
    } catch (err) { return handleApiError(err); }
}

export async function POST(req: NextRequest, ctx: any) {
    try {
        await mustBeAuthed(req);
        const { ocId } = await parseParam(ctx, OcIdParam); await ensureOcExists(ocId);
        const dto = medCatCreateSchema.parse(await req.json());
        return json.created({ message: 'Medical category record created successfully.', data: await createMedCat(ocId, dto) });
    } catch (err) { return handleApiError(err); }
}
