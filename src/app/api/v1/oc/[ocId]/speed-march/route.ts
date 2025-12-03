import { NextRequest } from 'next/server';
import { json, handleApiError } from '@/app/lib/http';
import { mustBeAuthed, parseParam, ensureOcExists } from '../../_checks';
import { OcIdParam, listQuerySchema, speedMarchCreateSchema } from '@/app/lib/oc-validators';
import { listSpeedMarch, createSpeedMarch } from '@/app/db/queries/oc';

export async function GET(req: NextRequest, ctx: any) {
    try {
        await mustBeAuthed(req);
        const { ocId } = await parseParam(ctx, OcIdParam);
        await ensureOcExists(ocId);
        const sp = new URL(req.url).searchParams;
        const qp = listQuerySchema.parse({
            limit: sp.get('limit') ?? undefined,
            offset: sp.get('offset') ?? undefined,
        });
        const rows = await listSpeedMarch(ocId, qp.limit ?? 100, qp.offset ?? 0);
        return json.ok({ message: 'Speed march records retrieved successfully.', items: rows, count: rows.length });
    } catch (err) {
        return handleApiError(err);
    }
}

export async function POST(req: NextRequest, ctx: any) {
    try {
        await mustBeAuthed(req);
        const { ocId } = await parseParam(ctx, OcIdParam);
        await ensureOcExists(ocId);
        const dto = speedMarchCreateSchema.parse(await req.json());
        const row = await createSpeedMarch(ocId, dto);
        return json.created({ message: 'Speed march record created successfully.', data: row });
    } catch (err) {
        return handleApiError(err);
    }
}
