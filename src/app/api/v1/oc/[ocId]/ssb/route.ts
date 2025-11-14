import { NextRequest } from 'next/server';
import { json, handleApiError, ApiError } from '@/app/lib/http';
import { mustBeAuthed, mustBeAdmin, parseParam, ensureOcExists } from '../../_checks';
import { OcIdParam, ssbReportUpsertSchema } from '@/app/lib/oc-validators';
import { getSsbReport, upsertSsbReport, deleteSsbReport, listSsbPoints } from '@/app/db/queries/oc';

type SsbReportRow = {
    id: string;
    overallPredictiveRating: number | null;
    scopeOfImprovement: string | null;
} | null;

type SsbPointRow = {
    kind: 'POSITIVE' | 'NEGATIVE';
    remark: string;
    authorName: string | null;
};

export type SsbReportResponse = {
    positives: { note: string; by: string }[];
    negatives: { note: string; by: string }[];
    predictiveRating: number;
    scopeForImprovement: string;
};

export function mapSsbDbToResponse(report: SsbReportRow, points: SsbPointRow[]): SsbReportResponse {
    const positives: SsbReportResponse['positives'] = [];
    const negatives: SsbReportResponse['negatives'] = [];

    for (const p of points) {
        const mapped = {
            note: p.remark,
            by: p.authorName ?? '',
        };

        if (p.kind === 'POSITIVE') {
            positives.push(mapped);
        } else if (p.kind === 'NEGATIVE') {
            negatives.push(mapped);
        }
    }

    return {
        positives,
        negatives,
        predictiveRating: report?.overallPredictiveRating ?? 0,
        scopeForImprovement: report?.scopeOfImprovement ?? '',
    };
}

export async function GET(req: NextRequest, ctx: any) {
    try {
        await mustBeAuthed(req);
        const { ocId } = await parseParam(ctx, OcIdParam);
        await ensureOcExists(ocId);

        const report = (await getSsbReport(ocId)) as SsbReportRow;
        const points = report ? ((await listSsbPoints(report.id)) as SsbPointRow[]) : [];

        const body = mapSsbDbToResponse(report, points);
        return json.ok(body);
    } catch (err) {
        return handleApiError(err);
    }
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
