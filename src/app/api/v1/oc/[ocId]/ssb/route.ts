import { NextRequest } from 'next/server';
import { json, handleApiError, ApiError } from '@/app/lib/http';
import { mustBeAuthed, mustBeAdmin, parseParam, ensureOcExists } from '../../_checks';
import { OcIdParam, ssbReportUpsertSchema } from '@/app/lib/oc-validators';
import { getSsbReport, upsertSsbReport, deleteSsbReport, listSsbPoints } from '@/app/db/queries/oc';

export async function GET(req: NextRequest, ctx: any) {
    try {
        await mustBeAuthed(req);
        const { ocId } = await parseParam(ctx, OcIdParam); await ensureOcExists(ocId);
        const report = await getSsbReport(ocId);
        const points = report ? await listSsbPoints(report.id) : [];
        return json.ok({ report, points });
    } catch (err) { return handleApiError(err); }
}

export async function POST(req: NextRequest, ctx: any) {
    try {
        await mustBeAuthed(req);
        const { ocId } = await parseParam(ctx, OcIdParam); await ensureOcExists(ocId);
        if (await getSsbReport(ocId)) throw new ApiError(409, 'SSB report exists. Use PATCH (admin).', 'conflict');
        const dto = ssbReportUpsertSchema.parse(await req.json());
        return json.created({ report: await upsertSsbReport(ocId, dto) });
    } catch (err) { return handleApiError(err); }
}

export async function PATCH(req: NextRequest, ctx: any) {
    try {
        await mustBeAdmin(req);
        const { ocId } = await parseParam(ctx, OcIdParam); await ensureOcExists(ocId);
        const dto = ssbReportUpsertSchema.partial().parse(await req.json());
        return json.ok({ report: await upsertSsbReport(ocId, dto) });
    } catch (err) { return handleApiError(err); }
}

export async function DELETE(req: NextRequest, ctx: any) {
    try {
        await mustBeAdmin(req);
        const { ocId } = await parseParam(ctx, OcIdParam); await ensureOcExists(ocId);
        return json.ok({ deleted: await deleteSsbReport(ocId) });
    } catch (err) { return handleApiError(err); }
}
