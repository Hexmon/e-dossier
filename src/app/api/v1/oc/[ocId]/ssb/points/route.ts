import { NextRequest } from 'next/server';
import { json, handleApiError, ApiError } from '@/app/lib/http';
import { mustBeAuthed, mustBeAdmin, parseParam, ensureOcExists } from '../../../_checks';
import { OcIdParam, listQuerySchema, ssbPointCreateSchema } from '@/app/lib/oc-validators';
import { getSsbReport, listSsbPoints, createSsbPoint } from '@/app/db/queries/oc';

export async function GET(req: NextRequest, ctx: any) {
    try {
        await mustBeAuthed(req);
        const { ocId } = await parseParam(ctx, OcIdParam); await ensureOcExists(ocId);
        const report = await getSsbReport(ocId);
        if (!report) return json.ok({ items: [], count: 0 });
        const sp = new URL(req.url).searchParams;
        const qp = listQuerySchema.parse({ limit: sp.get('limit') ?? undefined, offset: sp.get('offset') ?? undefined });
        const rows = await listSsbPoints(report.id, qp.limit ?? 100, qp.offset ?? 0);
        return json.ok({ items: rows, count: rows.length });
    } catch (err) { return handleApiError(err); }
}

export async function POST(req: NextRequest, ctx: any) {
    try {
        await mustBeAuthed(req);
        const { ocId } = await parseParam(ctx, OcIdParam); await ensureOcExists(ocId);
        const report = await getSsbReport(ocId);
        if (!report) throw new ApiError(400, 'Create SSB report first', 'bad_request');
        const dto = ssbPointCreateSchema.parse(await req.json());
        const row = await createSsbPoint(report.id, dto);
        return json.created({ data: row });
    } catch (err) { return handleApiError(err); }
}
