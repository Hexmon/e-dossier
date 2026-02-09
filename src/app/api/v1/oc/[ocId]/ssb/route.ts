import { NextRequest } from 'next/server';
import { json, handleApiError } from '@/app/lib/http';
import { mustBeAuthed, mustBeAdmin, parseParam, ensureOcExists } from '../../_checks';
import { OcIdParam, ssbReportFullSchema } from '@/app/lib/oc-validators';
import { getSsbReport, deleteSsbReport, listSsbPoints, upsertSsbReportWithPoints } from '@/app/db/queries/oc';
import { createAuditLog, AuditEventType, AuditResourceType } from '@/lib/audit-log';
import { withRouteLogging } from '@/lib/withRouteLogging';

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

type SsbReportResponse = {
    positives: { note: string; by: string }[];
    negatives: { note: string; by: string }[];
    predictiveRating: number;
    scopeForImprovement: string;
};

function mapSsbDbToResponse(report: SsbReportRow, points: SsbPointRow[]): SsbReportResponse {
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

async function GETHandler(req: NextRequest, { params }: { params: Promise<{ ocId: string }> }) {
    try {
        await mustBeAuthed(req);
        const { ocId } = await parseParam({params}, OcIdParam);
        await ensureOcExists(ocId);

        const report = (await getSsbReport(ocId)) as SsbReportRow;
        const points = report ? ((await listSsbPoints(report.id)) as SsbPointRow[]) : [];

        const body = mapSsbDbToResponse(report, points);
        return json.ok({ message: 'SSB report retrieved successfully.', ...body });
    } catch (err) {
        return handleApiError(err);
    }
}

async function POSTHandler(req: NextRequest, { params }: { params: Promise<{ ocId: string }> }) {
    try {
        const authCtx = await mustBeAuthed(req);
        const { ocId } = await parseParam({params}, OcIdParam);
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

        await createAuditLog({
            actorUserId: authCtx.userId,
            eventType: AuditEventType.OC_RECORD_CREATED,
            resourceType: AuditResourceType.OC,
            resourceId: ocId,
            description: `Created SSB report for OC ${ocId}`,
            metadata: {
                ocId,
                module: 'ssb',
                positives: dto.positives.length,
                negatives: dto.negatives.length,
                predictiveRating: dto.predictiveRating,
            },
            request: req,
        });
        return json.created({ message: 'SSB report created successfully.', ...body });
    } catch (err) {
        return handleApiError(err);
    }
}

async function PATCHHandler(req: NextRequest, { params }: { params: Promise<{ ocId: string }> }) {
    try {
        const authCtx = await mustBeAuthed(req);
        const { ocId } = await parseParam({params}, OcIdParam);
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

        await createAuditLog({
            actorUserId: authCtx.userId,
            eventType: AuditEventType.OC_RECORD_UPDATED,
            resourceType: AuditResourceType.OC,
            resourceId: ocId,
            description: `Updated SSB report for OC ${ocId}`,
            metadata: {
                ocId,
                module: 'ssb',
                changes: Object.keys(dto),
                positives: merged.positives.length,
                negatives: merged.negatives.length,
            },
            request: req,
        });
        return json.ok({ message: 'SSB report updated successfully.', ...body });
    } catch (err) {
        return handleApiError(err);
    }
}

async function DELETEHandler(req: NextRequest, { params }: { params: Promise<{ ocId: string }> }) {
    try {
        const authCtx = await mustBeAuthed(req);
        const { ocId } = await parseParam({params}, OcIdParam); await ensureOcExists(ocId);
        const deleted = await deleteSsbReport(ocId);

        await createAuditLog({
            actorUserId: authCtx.userId,
            eventType: AuditEventType.OC_RECORD_DELETED,
            resourceType: AuditResourceType.OC,
            resourceId: ocId,
            description: `Deleted SSB report for OC ${ocId}`,
            metadata: {
                ocId,
                module: 'ssb',
                recordId: deleted?.id ?? null,
                hardDeleted: true,
            },
            request: req,
        });
        return json.ok({ message: 'SSB report deleted successfully.', deleted });
    } catch (err) { return handleApiError(err); }
}
export const GET = withRouteLogging('GET', GETHandler);

export const POST = withRouteLogging('POST', POSTHandler);

export const PATCH = withRouteLogging('PATCH', PATCHHandler);

export const DELETE = withRouteLogging('DELETE', DELETEHandler);
