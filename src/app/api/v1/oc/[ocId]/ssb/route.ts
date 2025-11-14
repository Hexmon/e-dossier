import { NextRequest } from 'next/server';
import { json, handleApiError } from '@/app/lib/http';
import { mustBeAuthed, mustBeAdmin, parseParam, ensureOcExists } from '../../_checks';
import { OcIdParam, ssbReportFullSchema } from '@/app/lib/oc-validators';
import { getSsbReport, deleteSsbReport, listSsbPoints, upsertSsbReportWithPoints } from '@/app/db/queries/oc';

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
        const { ocId } = await parseParam(ctx, OcIdParam);
        await ensureOcExists(ocId);

        const dto = ssbReportFullSchema.parse(await req.json());

        await upsertSsbReportWithPoints(ocId, {
            overallPredictiveRating: dto.predictiveRating,
            scopeOfImprovement: dto.scopeForImprovement,
            positives: dto.positives,
            negatives: dto.negatives,
        });

        const report = (await getSsbReport(ocId)) as SsbReportRow;
        const points = report ? ((await listSsbPoints(report.id)) as SsbPointRow[]) : [];
        const body = mapSsbDbToResponse(report, points);

        return json.created(body);
    } catch (err) {
        return handleApiError(err);
    }
}

export async function PATCH(req: NextRequest, ctx: any) {
    try {
        await mustBeAdmin(req);
        const { ocId } = await parseParam(ctx, OcIdParam);
        await ensureOcExists(ocId);

        const existing = (await getSsbReport(ocId)) as SsbReportRow;
        const existingPoints = existing ? ((await listSsbPoints(existing.id)) as SsbPointRow[]) : [];
        const current = mapSsbDbToResponse(existing, existingPoints);

        const dto = ssbReportFullSchema.partial().parse(await req.json());

        const merged = {
            positives: dto.positives ?? current.positives,
            negatives: dto.negatives ?? current.negatives,
            predictiveRating: dto.predictiveRating ?? current.predictiveRating,
            scopeForImprovement: dto.scopeForImprovement ?? current.scopeForImprovement,
        };

        await upsertSsbReportWithPoints(ocId, {
            overallPredictiveRating: merged.predictiveRating,
            scopeOfImprovement: merged.scopeForImprovement,
            positives: merged.positives,
            negatives: merged.negatives,
        });

        const report = (await getSsbReport(ocId)) as SsbReportRow;
        const points = report ? ((await listSsbPoints(report.id)) as SsbPointRow[]) : [];
        const body = mapSsbDbToResponse(report, points);

        return json.ok(body);
    } catch (err) {
        return handleApiError(err);
    }
}

export async function DELETE(req: NextRequest, ctx: any) {
    try {
        await mustBeAdmin(req);
        const { ocId } = await parseParam(ctx, OcIdParam); await ensureOcExists(ocId);
        return json.ok({ deleted: await deleteSsbReport(ocId) });
    } catch (err) { return handleApiError(err); }
}
